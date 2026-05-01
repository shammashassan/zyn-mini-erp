// app/api/purchases/route.ts - FIXED: Proper partyId population

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Purchase from "@/models/Purchase";
import Voucher from "@/models/Voucher";
import ReturnNote from "@/models/ReturnNote";
import Item from "@/models/Item";
import StockAdjustment from "@/models/StockAdjustment";
import Party from "@/models/Party";
import { getUserInfo } from "@/lib/auth-utils";
import { createJournalForPurchase } from '@/utils/journalAutoCreate';
import generateInvoiceNumber from '@/utils/invoiceNumber';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";
import { createPartySnapshot } from "@/utils/partySnapshot";

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

    const ensureModels = [Purchase, Voucher, ReturnNote, Item, StockAdjustment, Party];

    const { searchParams } = new URL(request.url);

    const isServerSide = searchParams.has('page') || searchParams.has('pageSize');

    const startDateParam = searchParams.get('startDate') || searchParams.get('from');
    const endDateParam = searchParams.get('endDate') || searchParams.get('to');

    if (isServerSide) {
      const { page, pageSize, sorting, filters } = extractTableParams(searchParams);

      const baseFilter: any = { isDeleted: false };

      // ✅ Handle 'partyName' filter for partySnapshot
      const partyFilterIndex = filters.findIndex((f: any) => f.id === 'partyName');
      if (partyFilterIndex !== -1) {
        const partyFilter = filters[partyFilterIndex];
        baseFilter['partySnapshot.displayName'] = { $regex: partyFilter.value, $options: 'i' };
        filters.splice(partyFilterIndex, 1);
      }

      // Apply Date Range Filter using purchaseDate
      if (startDateParam || endDateParam) {
        baseFilter.purchaseDate = {};
        if (startDateParam) {
          baseFilter.purchaseDate.$gte = new Date(startDateParam);
        }
        if (endDateParam) {
          const end = new Date(endDateParam);
          end.setHours(23, 59, 59, 999);
          baseFilter.purchaseDate.$lte = end;
        }
      }

      const populate = searchParams.get('populate') === 'true';

      // ✅ FIXED: Added partyId and contactId population
      const populateOptions = populate ? [
        {
          path: 'connectedDocuments.paymentIds',
          select: 'invoiceNumber grandTotal voucherType',
          match: { isDeleted: false }
        },
        {
          path: 'connectedDocuments.returnNoteIds',
          select: 'returnNumber status',
          match: { isDeleted: false }
        },
        {
          path: 'partyId',
          select: 'name company type roles email phone',
        },
        {
          path: 'contactId',
          select: 'name phone email designation',
        }
      ] : undefined;

      const result = await executePaginatedQuery(Purchase, {
        baseFilter,
        columnFilters: filters,
        sorting,
        page,
        pageSize,
        defaultSort: { purchaseDate: -1 },
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
      const partyId = searchParams.get('partyId');

      if (partyId) filter.partyId = partyId;

      if (startDateParam || endDateParam) {
        filter.purchaseDate = {};
        if (startDateParam) filter.purchaseDate.$gte = new Date(startDateParam);
        if (endDateParam) {
          const toDate = new Date(endDateParam);
          toDate.setHours(23, 59, 59, 999);
          filter.purchaseDate.$lte = toDate;
        }
      }

      let query = Purchase.find(filter).sort({ purchaseDate: -1 });

      // ✅ FIXED: Added partyId and contactId population
      if (populate) {
        query = query
          .populate({
            path: 'connectedDocuments.paymentIds',
            select: 'invoiceNumber grandTotal documentType isDeleted',
            match: { isDeleted: false }
          })
          .populate({
            path: 'connectedDocuments.returnNoteIds',
            select: 'returnNumber status',
            match: { isDeleted: false }
          })
          .populate({
            path: 'partyId',
            select: 'name company type roles email phone'
          })
          .populate({
            path: 'contactId',
            select: 'name phone email designation'
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
 * POST - Create a new purchase with snapshots
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

    if (!body.partyId) {
      return NextResponse.json({ error: "Supplier (Party) is required" }, { status: 400 });
    }

    if (body.totalAmount === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!body.purchaseDate && !body.date) {
      return NextResponse.json({
        error: 'Purchase date is required'
      }, { status: 400 });
    }

    // Validate discount
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

    // ✅ Create immutable snapshots of party and contact
    const { partySnapshot, contactSnapshot } = await createPartySnapshot(body.partyId, body.contactId);

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

    const grossTotal = Number(body.totalAmount) || 0;
    const subtotal = grossTotal - discount;
    const vatAmount = Number(body.vatAmount) || 0;
    const grandTotal = subtotal + vatAmount;

    const purchaseStatus = 'pending';
    const inventoryStatus = 'pending';

    const purchaseDate = body.purchaseDate ? new Date(body.purchaseDate) : new Date(body.date);

    // Create purchase
    const newPurchase = new Purchase({
      ...body,
      referenceNumber,

      // ✅ Party & Contact References
      partyId: body.partyId,
      contactId: body.contactId,

      // ✅ Immutable Snapshots
      partySnapshot,
      contactSnapshot,

      discount,
      totalAmount: grossTotal,
      vatAmount,
      grandTotal,
      purchaseDate,
      date: purchaseDate,
      purchaseStatus,
      inventoryStatus,
      paymentStatus: 'pending',
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

    console.log(`✅ Successfully created purchase: ${savedPurchase.referenceNumber}`);
    console.log(`   Party: ${partySnapshot.displayName}`);

    // Handle direct creation with received/partially received status
    if (savedPurchase.inventoryStatus === 'received' || savedPurchase.inventoryStatus === 'partially received') {
      console.log(`📦 Processing stock for directly created ${savedPurchase.inventoryStatus} purchase`);

      for (const item of savedPurchase.items) {
        const dbItem = await Item.findById(item.itemId);
        if (dbItem) {
          const qtyToAdd = savedPurchase.inventoryStatus === 'received'
            ? item.quantity
            : (item.receivedQuantity || 0);

          if (qtyToAdd > 0) {
            const oldStock = dbItem.stock || 0;
            const newStock = oldStock + qtyToAdd;

            await Item.findByIdAndUpdate(item.itemId, { stock: newStock });

            const adjustmentReason = savedPurchase.inventoryStatus === 'received'
              ? `Purchase ${referenceNumber} created as fully received`
              : `Purchase ${referenceNumber} created as partially received (${qtyToAdd} of ${item.quantity} total)`;

            const newAdjustment = new StockAdjustment({
              itemId: item.itemId,
              itemName: item.description,
              adjustmentType: 'increment',
              value: qtyToAdd,
              oldStock,
              newStock,
              oldCostPrice: dbItem.rate,
              newCostPrice: dbItem.rate,
              adjustmentReason,
              referenceModel: 'Purchase',
              referenceId: savedPurchase._id,
              createdAt: new Date(),
            });

            await newAdjustment.save();
            console.log(`  ✅ Added ${qtyToAdd} units of ${item.description} to stock`);
          }
        }
      }
    }

    // AUTO-CREATE JOURNAL ENTRY - ONLY if purchaseStatus is "approved" on creation
    if (savedPurchase.purchaseStatus === 'approved') {
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