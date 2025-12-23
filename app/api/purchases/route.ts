// app/api/purchases/route.ts - FIXED: Proper Discount Handling

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Purchase from "@/models/Purchase";
import Supplier from "@/models/Supplier";
import Material from "@/models/Material";
import StockAdjustment from "@/models/StockAdjustment";
import { getActive } from "@/utils/softDelete";
import { getUserInfo } from "@/lib/auth-helpers";
import { createJournalForPurchase } from '@/utils/journalAutoCreate';
import generateInvoiceNumber from '@/utils/invoiceNumber';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";

/**
 * GET all active purchases with optional populate
 */
export async function GET(request: Request) {
  try {
    const { error, session } = await requireAuthAndPermission({
      purchase: ["read"],
    });

    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    
    const isServerSide = searchParams.has('page') || searchParams.has('pageSize');

    const startDateParam = searchParams.get('startDate') || searchParams.get('from');
    const endDateParam = searchParams.get('endDate') || searchParams.get('to');

    if (isServerSide) {
      const { page, pageSize, sorting, filters } = extractTableParams(searchParams);
      
      const baseFilter: any = { isDeleted: false };

      if (startDateParam || endDateParam) {
        baseFilter.createdAt = {};
        if (startDateParam) {
          baseFilter.createdAt.$gte = new Date(startDateParam);
        }
        if (endDateParam) {
          const end = new Date(endDateParam);
          end.setHours(23, 59, 59, 999);
          baseFilter.createdAt.$lte = end;
        }
      }

      const populate = searchParams.get('populate') === 'true';

      const populateOptions = populate ? {
        path: 'connectedDocuments.paymentIds',
        select: 'invoiceNumber grandTotal documentType isDeleted',
        match: { isDeleted: false }
      } : undefined;

      const result = await executePaginatedQuery(Purchase, {
        baseFilter,
        columnFilters: filters,
        sorting,
        page,
        pageSize,
        defaultSort: { createdAt: -1 },
        populate: populateOptions,
      });

      return NextResponse.json({
        data: result.data,
        pageCount: result.pageCount,
        totalCount: result.totalCount,
        currentPage: result.currentPage,
        pageSize: result.pageSize,
      });
    } else {
      const populate = searchParams.get('populate') === 'true';
      const filter: any = { isDeleted: false };

      if (startDateParam || endDateParam) {
        filter.createdAt = {};
        if (startDateParam) filter.createdAt.$gte = new Date(startDateParam);
        if (endDateParam) {
          const toDate = new Date(endDateParam);
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }

      let query = Purchase.find(filter).sort({ createdAt: -1 });

      if (populate) {
        query = query.populate({
          path: 'connectedDocuments.paymentIds',
          select: 'invoiceNumber grandTotal documentType isDeleted',
          match: { isDeleted: false }
        });
      }

      const purchases = await query.exec();
      return NextResponse.json(purchases);
    }
  } catch (error) {
    console.error("Failed to fetch purchases:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST - Create a new purchase with auto-supplier creation and tax handling
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuthAndPermission({
      purchase: ["create"],
    });

    if (error) return error;

    await dbConnect();
    const body = await request.json();
    const user = await getUserInfo();

    console.log("Incoming purchase data:", body);

    // Validate required fields
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    if (!body.supplierName || !body.supplierName.trim()) {
      return NextResponse.json({ error: "Supplier name is required" }, { status: 400 });
    }

    if (body.totalAmount === undefined || body.date === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ✅ FIX 1: Explicitly extract and validate discount
    const discount = Number(body.discount) || 0;
    
    if (discount < 0) {
      return NextResponse.json({ error: "Discount cannot be negative" }, { status: 400 });
    }

    if (discount > body.totalAmount) {
      return NextResponse.json({ 
        error: "Discount cannot exceed gross total",
        details: `Discount: ${discount}, Gross Total: ${body.totalAmount}`
      }, { status: 400 });
    }

    // Auto-create supplier if doesn't exist
    await Supplier.findOneAndUpdate(
      { name: body.supplierName.trim() },
      {
        $setOnInsert: {
          name: body.supplierName.trim(),
          email: '',
          vatNumber: '',
          district: '',
          city: '',
          street: '',
          buildingNo: '',
          postalCode: '',
          contactNumbers: [],
        }
      },
      { upsert: true, new: true }
    );

    // Generate reference number
    const referenceNumber = await generateInvoiceNumber('purchase');

    // Double-check uniqueness
    const existingPurchase = await Purchase.findOne({
      referenceNumber,
      isDeleted: false
    });

    if (existingPurchase) {
      console.error(`❌ CRITICAL: Generated duplicate reference number ${referenceNumber}`);
      return NextResponse.json({
        error: 'Failed to generate unique reference number. Please try again.',
        details: 'Reference number collision detected'
      }, { status: 500 });
    }

    // ✅ FIX 2: Recalculate amounts server-side to ensure consistency
    const grossTotal = Number(body.totalAmount) || 0;
    const subtotal = grossTotal - discount;
    const vatAmount = body.isTaxPayable ? (subtotal * 0.05) : 0;
    const grandTotal = subtotal + vatAmount;

    // ✅ FIX 4: Create purchase with explicitly calculated values
    const newPurchase = new Purchase({
      ...body,
      referenceNumber,
      discount,          // ✅ Explicit discount
      totalAmount: grossTotal,  // ✅ Gross total
      vatAmount,         // ✅ Recalculated VAT
      grandTotal,        // ✅ Recalculated grand total
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: user.id,
      updatedBy: user.id,
      actionHistory: [{
        action: 'Created',
        userId: user.id,
        username: user.username,
        timestamp: new Date(),
      }],
    });

    const savedPurchase = await newPurchase.save();
    
    // Update material stock ONLY if status is "Received" or "Partially Received"
    if (body.status === 'Received' || body.status === 'Partially Received') {
      for (const item of body.items) {
        const material = await Material.findById(item.materialId);
        if (material) {
          const qtyToAdd = body.status === 'Received'
            ? item.quantity
            : (item.receivedQuantity || 0);

          if (qtyToAdd > 0) {
            const oldStock = material.stock;
            const newStock = oldStock + qtyToAdd;

            await Material.findByIdAndUpdate(item.materialId, { stock: newStock });

            const adjustmentReason = body.status === 'Received'
              ? `Purchase ${referenceNumber} fully received`
              : `Purchase ${referenceNumber} partially received (${qtyToAdd} of ${item.quantity} total)`;

            const newAdjustment = new StockAdjustment({
              materialId: item.materialId,
              materialName: item.materialName,
              adjustmentType: 'increment',
              value: qtyToAdd,
              oldStock,
              newStock,
              oldUnitCost: material.unitCost,
              newUnitCost: material.unitCost,
              adjustmentReason,
              createdAt: new Date(),
            });

            await newAdjustment.save();
          }
        }
      }
    }

    // AUTO-CREATE JOURNAL ENTRY - ONLY FOR "RECEIVED" STATUS
    if (body.status === 'Received') {
      try {
        await createJournalForPurchase(
          savedPurchase.toObject(),
          user.id,
          user.username || user.name
        );
        console.log('✅ Journal entry created for received purchase');
      } catch (journalError) {
        console.error('Failed to create journal entry:', journalError);
      }
    }

    return NextResponse.json(savedPurchase, { status: 201 });
  } catch (error) {
    console.error("Failed to create purchase:", error);
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to create purchase" }, { status: 400 });
  }
}