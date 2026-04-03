// app/api/debit-notes/route.ts - COMPLETE MIGRATION: Using party snapshots, removed legacy fields

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DebitNote from "@/models/DebitNote";
import ReturnNote from "@/models/ReturnNote";
import Voucher from "@/models/Voucher";
import Party from "@/models/Party";
import generateInvoiceNumber from "@/utils/invoiceNumber";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";
import { createPartySnapshot } from "@/utils/partySnapshot";

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      debitNote: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const ensureModels = [DebitNote, ReturnNote, Voucher, Party];

    const { searchParams } = new URL(request.url);
    const isServerSide = searchParams.has('page') || searchParams.has('pageSize');

    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

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

      const partyId = searchParams.get('partyId');
      if (partyId) {
        baseFilter.partyId = partyId;
      }

      const populate = searchParams.get('populate') === 'true';

      const populateOptions = populate ? [
        {
          path: 'connectedDocuments.returnNoteId',
          select: 'returnNumber returnType status isDeleted',
          match: { isDeleted: false }
        },
        {
          path: 'connectedDocuments.receiptIds',
          model: 'Voucher',
          select: 'invoiceNumber grandTotal voucherType isDeleted',
          match: { isDeleted: false }
        },
        {
          path: 'partyId',
          select: 'name company type roles',
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
            path: 'connectedDocuments.returnNoteId',
            select: 'returnNumber returnType status isDeleted',
            match: { isDeleted: false }
          })
          .populate({
            path: 'connectedDocuments.receiptIds',
            model: 'Voucher',
            select: 'invoiceNumber grandTotal voucherType isDeleted',
            match: { isDeleted: false }
          })
          .populate({
            path: 'partyId',
            select: 'name company type roles'
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
      items,
      discount = 0,
      debitDate,
      reason,
      notes,
      status = 'pending',
      debitType = 'standalone',
      partyId,
      contactId
    } = body;

    // ✅ Validation: Party is required
    if (!partyId) {
      return NextResponse.json({
        error: "Party is required"
      }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: "Reason is required" }, { status: 400 });
    }

    // If linked to return note, validate
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
    }

    // ✅ Create immutable snapshots of party and contact
    const { partySnapshot, contactSnapshot } = await createPartySnapshot(partyId, contactId);

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
    
    // Calculate VAT from item snapshots (manual subtotal mode won't apply tax default)
    const vatAmount = items.reduce((sum: number, item: any) => sum + (Number(item.taxAmount) || 0), 0);
    const grandTotal = subtotal + vatAmount;

    // Generate debit note number
    const debitNoteNumber = await generateInvoiceNumber('debitNote');

    // Check uniqueness
    const existingDebitNote = await DebitNote.findOne({
      debitNoteNumber,
      isDeleted: false
    });

    if (existingDebitNote) {
      console.error(`❌ CRITICAL: Generated duplicate debit note number ${debitNoteNumber}`);
      return NextResponse.json({
        error: 'Failed to generate unique debit note number. Please try again.',
        details: 'Debit note number collision detected'
      }, { status: 500 });
    }

    // Build debit note data
    const debitNoteData: any = {
      debitNoteNumber,

      // ✅ Party & Contact References
      partyId,
      contactId,

      // ✅ Immutable Snapshots (legal/historical truth)
      partySnapshot,
      contactSnapshot,

      items,
      totalAmount: grossTotal,
      discount: discountAmount,
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
      connectedDocuments: {
        returnNoteId: returnNoteId || undefined,
        receiptIds: []
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
    };

    // Create and save debit note
    const newDebitNote = new DebitNote(debitNoteData);

    try {
      await newDebitNote.save();

      console.log(`✅ Successfully created debit note: ${newDebitNote.debitNoteNumber}`);
      console.log(`   Party: ${partySnapshot.displayName}`);

      // If linked to return note, update it
      if (newDebitNote.connectedDocuments?.returnNoteId) {
        await ReturnNote.findByIdAndUpdate(newDebitNote.connectedDocuments.returnNoteId, {
          'connectedDocuments.debitNoteId': newDebitNote._id
        });
      }

      // If status is 'approved', create journal entry
      if (newDebitNote.status === 'approved') {
        console.log('📝 Creating journal for APPROVED debit note');
        try {
          const { createJournalForDebitNote } = await import('@/utils/journalAutoCreate');
          await createJournalForDebitNote(
            newDebitNote.toObject(),
            user.id,
            user.username || user.name
          );
        } catch (journalError) {
          console.error('Failed to create journal entry:', journalError);
        }
      }

      return NextResponse.json({
        message: 'Debit note saved',
        debitNote: newDebitNote
      }, { status: 201 });

    } catch (saveError: any) {
      console.error('❌ Error saving debit note:', saveError);

      if (saveError.code === 11000 && saveError.keyPattern?.debitNoteNumber) {
        return NextResponse.json({
          error: 'Duplicate debit note number detected. Please try again.',
          details: saveError.message
        }, { status: 500 });
      }

      throw saveError;
    }

  } catch (error: any) {
    console.error('❌ Error in POST /api/debit-notes:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}