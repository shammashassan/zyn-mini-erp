// app/api/return-notes/route.ts - UPDATED: Bidirectional Connected Documents

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReturnNote from "@/models/ReturnNote";
import Purchase from "@/models/Purchase";
import Material from "@/models/Material";
import DebitNote from "@/models/DebitNote";
import StockAdjustment from "@/models/StockAdjustment";
import generateInvoiceNumber from "@/utils/invoiceNumber";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      returnNote: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const _ensureModels = [DebitNote, Purchase, Material];

    const { searchParams } = new URL(request.url);
    const isServerSide = searchParams.has('page') || searchParams.has('pageSize');

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (isServerSide) {
      const { page, pageSize, sorting, filters } = extractTableParams(searchParams);

      const baseFilter: any = { isDeleted: false };

      if (startDateParam || endDateParam) {
        baseFilter.returnDate = {};
        if (startDateParam) {
          baseFilter.returnDate.$gte = new Date(startDateParam);
        }
        if (endDateParam) {
          const end = new Date(endDateParam);
          end.setHours(23, 59, 59, 999);
          baseFilter.returnDate.$lte = end;
        }
      }

      const populate = searchParams.get('populate') === 'true';

      const populateOptions = populate ? [
        {
          path: 'connectedDocuments.purchaseId',
          select: 'referenceNumber supplierName items inventoryStatus',
          match: { isDeleted: false }
        },
        {
          path: 'connectedDocuments.debitNoteId',
          select: 'debitNoteNumber status',
          match: { isDeleted: false }
        }
      ] : undefined;

      const result = await executePaginatedQuery(ReturnNote, {
        baseFilter,
        columnFilters: filters,
        sorting,
        page,
        pageSize,
        defaultSort: { returnDate: -1 },
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
        filter.returnDate = {};
        if (startDateParam) filter.returnDate.$gte = new Date(startDateParam);
        if (endDateParam) {
          const toDate = new Date(endDateParam);
          toDate.setHours(23, 59, 59, 999);
          filter.returnDate.$lte = toDate;
        }
      }

      let query = ReturnNote.find(filter).sort({ returnDate: -1 });

      if (populate) {
        query = query
          .populate({
            path: 'connectedDocuments.purchaseId',
            select: 'referenceNumber supplierName items inventoryStatus',
            match: { isDeleted: false }
          })
          .populate({
            path: 'connectedDocuments.debitNoteId',
            select: 'debitNoteNumber status',
            match: { isDeleted: false }
          });
      }

      const returnNotes = await query.exec();
      return NextResponse.json(returnNotes);
    }
  } catch (error) {
    console.error("Failed to fetch return notes:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { error, session } = await requireAuthAndPermission({
      returnNote: ["create"],
    });
    if (error) return error;

    await dbConnect();
    const user = session.user;

    const {
      purchaseId,
      items,
      reason,
      notes,
      returnDate,
      status = 'pending'
    } = body;

    // Validate required fields
    if (!purchaseId) {
      return NextResponse.json({ error: "Purchase ID is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Return reason is required" }, { status: 400 });
    }

    // Get purchase
    const purchase = await Purchase.findById(purchaseId);
    if (!purchase || purchase.isDeleted) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    // Validate inventory status
    if (purchase.inventoryStatus !== 'received' && purchase.inventoryStatus !== 'partially received') {
      return NextResponse.json({
        error: "Can only create returns for purchases with 'received' or 'partially received' status"
      }, { status: 400 });
    }

    // Validate return quantities
    for (const returnItem of items) {
      const purchaseItem = purchase.items.find((pi: any) => pi.materialId === returnItem.materialId);

      if (!purchaseItem) {
        return NextResponse.json({
          error: `Item ${returnItem.materialName} not found in purchase`
        }, { status: 400 });
      }

      const receivedQty = purchaseItem.receivedQuantity || 0;
      const alreadyReturned = purchaseItem.returnedQuantity || 0;
      const availableToReturn = receivedQty - alreadyReturned;

      if (returnItem.returnQuantity > availableToReturn) {
        return NextResponse.json({
          error: `Cannot return ${returnItem.returnQuantity} units of ${returnItem.materialName}. ` +
            `Available to return: ${availableToReturn} (Received: ${receivedQty}, Already returned: ${alreadyReturned})`
        }, { status: 400 });
      }
    }

    // Generate return number
    const returnNumber = await generateInvoiceNumber('return');

    // Check uniqueness
    const existingReturn = await ReturnNote.findOne({
      returnNumber,
      isDeleted: false
    });

    if (existingReturn) {
      return NextResponse.json({
        error: 'Failed to generate unique return number. Please try again.'
      }, { status: 500 });
    }

    // ✅ UPDATED: Create return note with connectedDocuments structure
    const newReturnNote = new ReturnNote({
      returnNumber,
      purchaseReference: purchase.referenceNumber,
      supplierName: purchase.supplierName,
      items,
      returnDate: returnDate || new Date(),
      reason,
      notes,
      status,
      connectedDocuments: {
        purchaseId: purchase._id
      },
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: user.id,
      updatedBy: user.id,
      actionHistory: [{
        action: 'Created',
        userId: user.id,
        username: user.username || user.name,
        timestamp: new Date(),
      }],
    });

    const savedReturnNote = await newReturnNote.save();

    // ✅ NEW: Add return note ID to purchase connectedDocuments
    const currentReturnNoteIds = purchase.connectedDocuments?.returnNoteIds || [];
    if (!currentReturnNoteIds.some((rid: any) => rid.toString() === savedReturnNote._id.toString())) {
      currentReturnNoteIds.push(savedReturnNote._id);
      purchase.connectedDocuments = {
        ...purchase.connectedDocuments,
        returnNoteIds: currentReturnNoteIds
      };
    }

    // If status is 'approved', process the return immediately
    if (status === 'approved') {
      // Update purchase item returned quantities
      for (const returnItem of items) {
        const purchaseItemIndex = purchase.items.findIndex(
          (pi: any) => pi.materialId === returnItem.materialId
        );

        if (purchaseItemIndex !== -1) {
          const currentReturned = purchase.items[purchaseItemIndex].returnedQuantity || 0;
          purchase.items[purchaseItemIndex].returnedQuantity = currentReturned + returnItem.returnQuantity;
        }
      }

      purchase.addAuditEntry(
        `Return Note ${returnNumber} approved - ${items.length} item(s) returned`,
        user.id,
        user.username || user.name
      );

      await purchase.save();

      // Reduce stock
      for (const returnItem of items) {
        const material = await Material.findById(returnItem.materialId);
        if (material) {
          const oldStock = material.stock;
          const newStock = oldStock - returnItem.returnQuantity;

          await Material.findByIdAndUpdate(returnItem.materialId, { stock: newStock });

          const newAdjustment = new StockAdjustment({
            materialId: returnItem.materialId,
            materialName: returnItem.materialName,
            adjustmentType: 'decrement',
            value: returnItem.returnQuantity,
            oldStock,
            newStock,
            oldUnitCost: material.unitCost,
            newUnitCost: material.unitCost,
            adjustmentReason: `Return Note ${returnNumber} approved`,
            createdAt: new Date(),
          });

          await newAdjustment.save();
        }
      }

      console.log(`✅ Return Note ${returnNumber} approved - stock reduced`);
    } else {
      // Just save purchase with new return note reference
      await purchase.save();
    }

    return NextResponse.json({
      message: 'Return note created successfully',
      returnNote: savedReturnNote
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error in POST /api/return-notes:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}