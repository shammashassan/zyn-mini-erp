// app/api/credit-notes/route.ts - UPDATED: Support Return Note Linking

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import CreditNote from "@/models/CreditNote";
import ReturnNote from "@/models/ReturnNote";
import Voucher from "@/models/Voucher";
import generateInvoiceNumber from "@/utils/invoiceNumber";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      creditNote: ["read"],
    });
    if (error) return error;

    await dbConnect();

    // Ensure models are registered
    const _ensureModels = [Voucher, ReturnNote];

    const { searchParams } = new URL(request.url);
    const isServerSide = searchParams.has('page') || searchParams.has('pageSize');

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (isServerSide) {
      const { page, pageSize, sorting, filters } = extractTableParams(searchParams);

      const baseFilter: any = { isDeleted: false };

      if (startDateParam || endDateParam) {
        baseFilter.creditDate = {};
        if (startDateParam) {
          baseFilter.creditDate.$gte = new Date(startDateParam);
        }
        if (endDateParam) {
          const end = new Date(endDateParam);
          end.setHours(23, 59, 59, 999);
          baseFilter.creditDate.$lte = end;
        }
      }

      const populate = searchParams.get('populate') === 'true';

      const populateOptions = populate ? [
        {
          path: 'connectedDocuments.returnNoteId',
          select: 'returnNumber invoiceReference customerName',
          match: { isDeleted: false }
        },
        {
          path: 'connectedDocuments.paymentIds',
          model: 'Voucher',
          select: 'invoiceNumber grandTotal voucherType',
          match: { isDeleted: false }
        }
      ] : undefined;

      const result = await executePaginatedQuery(CreditNote, {
        baseFilter,
        columnFilters: filters,
        sorting,
        page,
        pageSize,
        defaultSort: { creditDate: -1 },
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
        filter.creditDate = {};
        if (startDateParam) filter.creditDate.$gte = new Date(startDateParam);
        if (endDateParam) {
          const toDate = new Date(endDateParam);
          toDate.setHours(23, 59, 59, 999);
          filter.creditDate.$lte = toDate;
        }
      }

      let query = CreditNote.find(filter).sort({ creditDate: -1 });

      if (populate) {
        query = query
          .populate({
            path: 'connectedDocuments.returnNoteId',
            select: 'returnNumber invoiceReference customerName',
            match: { isDeleted: false }
          })
          .populate({
            path: 'connectedDocuments.paymentIds',
            model: 'Voucher',
            select: 'invoiceNumber grandTotal voucherType',
            match: { isDeleted: false }
          });
      }

      const creditNotes = await query.exec();
      return NextResponse.json(creditNotes);
    }
  } catch (error) {
    console.error("Failed to fetch credit notes:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { error, session } = await requireAuthAndPermission({
      creditNote: ["create"],
    });
    if (error) return error;

    await dbConnect();
    const user = session.user;

    const {
      returnNoteId,
      customerName,
      customerId,
      supplierName,
      supplierId,
      payeeName,
      payeeId,
      vendorName,
      items,
      discount = 0,
      isTaxPayable = true,
      creditDate,
      reason,
      notes,
      status = 'pending',
      creditType = 'standalone'
    } = body;

    // Validate party
    if (!customerName && !supplierName && !payeeName && !vendorName) {
      return NextResponse.json({ 
        error: "Party information is required (customer, supplier, payee, or vendor)" 
      }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    // If linked to return note, validate
    if (returnNoteId && creditType === 'return') {
      const returnNote = await ReturnNote.findById(returnNoteId);
      if (!returnNote || returnNote.isDeleted) {
        return NextResponse.json({ error: "Return note not found" }, { status: 404 });
      }

      if (returnNote.returnType !== 'salesReturn') {
        return NextResponse.json({
          error: "Can only link to sales return notes"
        }, { status: 400 });
      }

      if (returnNote.connectedDocuments?.creditNoteId) {
        return NextResponse.json({
          error: "This return note already has a linked credit note"
        }, { status: 400 });
      }
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

    // Generate credit note number
    const creditNoteNumber = await generateInvoiceNumber('creditNote');

    // Check uniqueness
    const existingCreditNote = await CreditNote.findOne({
      creditNoteNumber,
      isDeleted: false
    });

    if (existingCreditNote) {
      return NextResponse.json({
        error: 'Failed to generate unique credit note number. Please try again.'
      }, { status: 500 });
    }

    // Create credit note
    const newCreditNote = new CreditNote({
      creditNoteNumber,
      customerName: customerName || undefined,
      customerId: customerId || undefined,
      supplierName: supplierName || undefined,
      supplierId: supplierId || undefined,
      payeeName: payeeName || undefined,
      payeeId: payeeId || undefined,
      vendorName: vendorName || undefined,
      items,
      totalAmount: grossTotal,
      discount: discountAmount,
      isTaxPayable,
      vatAmount,
      grandTotal,
      creditDate: creditDate || new Date(),
      reason,
      notes,
      status,
      creditType,
      paymentAllocations: [],
      paidAmount: 0,
      remainingAmount: grandTotal,
      paymentStatus: 'pending',
      connectedDocuments: { 
        returnNoteId: returnNoteId || undefined,
        paymentIds: [] 
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

    const savedCreditNote = await newCreditNote.save();

    // If linked to return note, update it
    if (savedCreditNote.connectedDocuments?.returnNoteId) {
      await ReturnNote.findByIdAndUpdate(savedCreditNote.connectedDocuments.returnNoteId, {
        'connectedDocuments.creditNoteId': savedCreditNote._id
      });
    }

    // If status is 'approved', create journal entry
    if (status === 'approved') {
      const { createJournalForCreditNote } = await import('@/utils/journalAutoCreate');
      await createJournalForCreditNote(
        savedCreditNote.toObject(),
        user.id,
        user.username || user.name
      );
    }

    return NextResponse.json({
      message: 'Credit note created successfully',
      creditNote: savedCreditNote
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error in POST /api/credit-notes:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}