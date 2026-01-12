// app/api/debit-notes/route.ts - FIXED: Support All Party Types

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DebitNote from "@/models/DebitNote";
import ReturnNote from "@/models/ReturnNote";
import generateInvoiceNumber from "@/utils/invoiceNumber";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      debitNote: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const isServerSide = searchParams.has('page') || searchParams.has('pageSize');

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (isServerSide) {
      const { page, pageSize, sorting, filters } = extractTableParams(searchParams);

      const baseFilter: any = { isDeleted: false };

      if (startDateParam || endDateParam) {
        baseFilter.debitDate = {};
        if (startDateParam) {
          baseFilter.debitDate.$gte = new Date(startDateParam);
        }
        if (endDateParam) {
          const end = new Date(endDateParam);
          end.setHours(23, 59, 59, 999);
          baseFilter.debitDate.$lte = end;
        }
      }

      const populate = searchParams.get('populate') === 'true';

      const populateOptions = populate ? [
        {
          path: 'returnNoteId',
          select: 'returnNumber purchaseReference supplierName',
          match: { isDeleted: false }
        },
        {
          path: 'connectedDocuments.receiptIds',
          model: 'Voucher',
          select: 'invoiceNumber grandTotal voucherType',
          match: { isDeleted: false }
        }
      ] : undefined;

      const result = await executePaginatedQuery(DebitNote, {
        baseFilter,
        columnFilters: filters,
        sorting,
        page,
        pageSize,
        defaultSort: { debitDate: -1 },
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
        filter.debitDate = {};
        if (startDateParam) filter.debitDate.$gte = new Date(startDateParam);
        if (endDateParam) {
          const toDate = new Date(endDateParam);
          toDate.setHours(23, 59, 59, 999);
          filter.debitDate.$lte = toDate;
        }
      }

      let query = DebitNote.find(filter).sort({ debitDate: -1 });

      if (populate) {
        query = query
          .populate({
            path: 'returnNoteId',
            select: 'returnNumber purchaseReference supplierName',
            match: { isDeleted: false }
          })
          .populate({
            path: 'connectedDocuments.receiptIds',
            model: 'Voucher',
            select: 'invoiceNumber grandTotal voucherType',
            match: { isDeleted: false }
          });
      }

      const debitNotes = await query.exec();
      return NextResponse.json(debitNotes);
    }
  } catch (error) {
    console.error("Failed to fetch debit notes:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { error, session } = await requireAuthAndPermission({
      debitNote: ["create"],
    });
    if (error) return error;

    await dbConnect();
    const user = session.user;

    const {
      returnNoteId,
      supplierName,
      supplierId,
      customerName,
      customerId,
      payeeName,
      payeeId,
      vendorName,
      items,
      discount = 0,
      isTaxPayable = true,
      debitDate,
      reason,
      notes,
      status = 'pending',
      debitType = 'standalone'
    } = body;

    // Validate party - at least one must be provided
    if (!supplierName && !customerName && !payeeName && !vendorName) {
      return NextResponse.json({ 
        error: "Party information is required (supplier, customer, payee, or vendor)" 
      }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    // If linked to return note, validate
    let returnNumber = undefined;
    if (returnNoteId && debitType === 'return') {
      const returnNote = await ReturnNote.findById(returnNoteId);
      if (!returnNote || returnNote.isDeleted) {
        return NextResponse.json({ error: "Return note not found" }, { status: 404 });
      }

      if (returnNote.connectedDocuments?.debitNoteId) {
        return NextResponse.json({
          error: "This return note already has a linked debit note"
        }, { status: 400 });
      }

      returnNumber = returnNote.returnNumber;
    }

    // Calculate amounts
    const grossTotal = items.reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0);
    const discountAmount = Number(discount) || 0;

    if (discountAmount < 0) {
      return NextResponse.json({ error: "Discount cannot be negative" }, { status: 400 });
    }

    if (discountAmount > grossTotal) {
      return NextResponse.json({ error: "Discount cannot exceed gross total" }, { status: 400 });
    }

    const subtotal = grossTotal - discountAmount;
    const vatAmount = isTaxPayable ? (subtotal * 0.05) : 0;
    const grandTotal = subtotal + vatAmount;

    // Generate debit note number
    const debitNoteNumber = await generateInvoiceNumber('debitNote');

    // Check uniqueness
    const existingDebitNote = await DebitNote.findOne({
      debitNoteNumber,
      isDeleted: false
    });

    if (existingDebitNote) {
      return NextResponse.json({
        error: 'Failed to generate unique debit note number. Please try again.'
      }, { status: 500 });
    }

    // Create debit note
    const newDebitNote = new DebitNote({
      debitNoteNumber,
      returnNoteId: returnNoteId || undefined,
      returnNumber,
      supplierName: supplierName || undefined,
      supplierId: supplierId || undefined,
      customerName: customerName || undefined,
      customerId: customerId || undefined,
      payeeName: payeeName || undefined,
      payeeId: payeeId || undefined,
      vendorName: vendorName || undefined,
      items,
      totalAmount: grossTotal,
      discount: discountAmount,
      isTaxPayable,
      vatAmount,
      grandTotal,
      debitDate: debitDate || new Date(),
      reason,
      notes,
      status,
      debitType,
      receiptAllocations: [],
      receivedAmount: 0,
      remainingAmount: grandTotal,
      paymentStatus: 'pending',
      connectedDocuments: { receiptIds: [] },
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

    const savedDebitNote = await newDebitNote.save();

    // If linked to return note, update it
    if (returnNoteId && debitType === 'return') {
      await ReturnNote.findByIdAndUpdate(returnNoteId, {
        'connectedDocuments.debitNoteId': savedDebitNote._id
      });
    }

    // If status is 'approved', create journal entry
    if (status === 'approved') {
      const { createJournalForDebitNote } = await import('@/utils/journalAutoCreate');
      await createJournalForDebitNote(
        savedDebitNote.toObject(),
        user.id,
        user.username || user.name
      );
    }

    return NextResponse.json({
      message: 'Debit note created successfully',
      debitNote: savedDebitNote
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error in POST /api/debit-notes:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}