// app/api/debit-notes/[id]/route.ts - FINAL: Using snapshots, removed all legacy fields

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DebitNote from "@/models/DebitNote";
import ReturnNote from "@/models/ReturnNote";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { handleDebitNoteStatusChange } from '@/utils/journalAutoCreate';
import { voidJournalsForReference } from '@/utils/journalManager';
import { getUserInfo } from "@/lib/auth-helpers";
import { createPartySnapshot } from "@/utils/partySnapshot";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

/**
 * GET - Fetch a single debit note by ID
 */
export async function GET(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const { error } = await requireAuthAndPermission({
      debitNote: ["read"],
    });
    if (error) return error;

    const debitNoteQuery = DebitNote.findById(id);
    const includeDeleted = request.headers.get('X-Include-Deleted') === 'true';
    if (includeDeleted) {
      debitNoteQuery.setOptions({ includeDeleted: true });
    }

    const debitNote = await debitNoteQuery
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
      });

    if (!debitNote) {
      return NextResponse.json({ error: "Debit note not found" }, { status: 404 });
    }

    if (debitNote.isDeleted && !includeDeleted) {
      return NextResponse.json({
        error: "This debit note has been deleted"
      }, { status: 410 });
    }

    return NextResponse.json(debitNote);
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to fetch debit note ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * Helper function to detect changes between old and new values
 */
function detectChanges(oldDebitNote: any, newData: any) {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
  const fieldsToTrack = ['status', 'reason', 'notes', 'discount'];

  for (const field of fieldsToTrack) {
    if (newData[field] !== undefined && oldDebitNote[field] !== newData[field]) {
      changes.push({
        field,
        oldValue: oldDebitNote[field],
        newValue: newData[field],
      });
    }
  }

  return changes;
}

/**
 * PUT - Update a debit note with enhanced journal handling
 */
export async function PUT(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();

    const { error, session } = await requireAuthAndPermission({
      debitNote: ["update"],
    });
    if (error) return error;

    const user = await getUserInfo();

    const currentDebitNote = await DebitNote.findById(id);
    if (!currentDebitNote) {
      return NextResponse.json({ error: "Debit note not found" }, { status: 404 });
    }

    if (currentDebitNote.isDeleted) {
      return NextResponse.json({
        error: "Cannot update a deleted debit note. Please restore it first."
      }, { status: 400 });
    }

    // ✅ Handle party/contact changes - update snapshots
    if (body.partyId && body.partyId !== currentDebitNote.partyId.toString()) {
      console.log(`🔄 Party changed for debit note ${id}, updating snapshots`);

      const { partySnapshot, contactSnapshot } = await createPartySnapshot(
        body.partyId,
        body.contactId
      );

      body.partySnapshot = partySnapshot;
      body.contactSnapshot = contactSnapshot;

      console.log(`   Old Party: ${currentDebitNote.partySnapshot.displayName}`);
      console.log(`   New Party: ${partySnapshot.displayName}`);
    }
    // ✅ If only contact changed (same party)
    else if (body.contactId && body.contactId !== currentDebitNote.contactId?.toString()) {
      console.log(`🔄 Contact changed for debit note ${id}, updating contact snapshot`);

      const { contactSnapshot } = await createPartySnapshot(
        currentDebitNote.partyId.toString(),
        body.contactId
      );

      body.contactSnapshot = contactSnapshot;
    }

    const oldStatus = currentDebitNote.status;
    const newStatus = body.status || oldStatus;

    const changes = detectChanges(currentDebitNote.toObject(), body);

    // Recalculate amounts if items or discount changed
    if (body.items || body.discount !== undefined) {
      const itemsToUse = body.items || currentDebitNote.items;
      const grossTotal = itemsToUse.reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0);
      const discount = body.discount !== undefined ? Number(body.discount) || 0 : (currentDebitNote.discount || 0);
      const subtotal = grossTotal - discount;
      const isTaxPayable = body.isTaxPayable !== undefined ? body.isTaxPayable : currentDebitNote.isTaxPayable;
      const vatAmount = isTaxPayable ? (subtotal * 0.05) : 0;
      const grandTotal = subtotal + vatAmount;

      body.totalAmount = grossTotal;
      body.discount = discount;
      body.vatAmount = vatAmount;
      body.grandTotal = grandTotal;
      body.remainingAmount = grandTotal - (currentDebitNote.receivedAmount || 0);
    }

    currentDebitNote.addAuditEntry(
      'Updated',
      user.id,
      user.username || user.name,
      changes.length > 0 ? changes : undefined
    );

    currentDebitNote.set({
      ...body,
      updatedBy: user.id,
    });

    await currentDebitNote.save();

    console.log(`✅ Debit note ${id} updated successfully`);

    // Handle status change
    const statusChanged = oldStatus !== newStatus;

    if (statusChanged) {
      console.log(`📊 Status change detected: ${oldStatus} → ${newStatus}`);

      await handleDebitNoteStatusChange(
        currentDebitNote.toObject(),
        oldStatus,
        newStatus,
        user.id,
        user.username || user.name
      );
    } else {
      console.log(`ℹ️ No status change - skipping handleDebitNoteStatusChange`);
    }

    return NextResponse.json(currentDebitNote);
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to update debit note ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update debit note" }, { status: 400 });
  }
}

/**
 * DELETE - Soft delete with journal voiding and return note unlinking
 */
export async function DELETE(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const { error, session } = await requireAuthAndPermission({
      debitNote: ["soft_delete"],
    });
    if (error) return error;

    const user = await getUserInfo();

    const debitNote = await DebitNote.findById(id);

    if (!debitNote) {
      return NextResponse.json({ error: "Debit note not found" }, { status: 404 });
    }

    if (debitNote.isDeleted) {
      return NextResponse.json({
        error: "Debit note is already deleted"
      }, { status: 400 });
    }

    console.log(`🔴 DELETE /api/debit-notes/${id}`);

    // Void journals if approved
    if (debitNote.status === 'approved') {
      await voidJournalsForReference(
        debitNote._id,
        user.id,
        user.username || user.name,
        'Debit note soft deleted'
      );
    }

    // Unlink from return note if connected
    if (debitNote.connectedDocuments?.returnNoteId && debitNote.debitType === 'return') {
      await ReturnNote.findByIdAndUpdate(debitNote.connectedDocuments.returnNoteId, {
        $unset: { 'connectedDocuments.debitNoteId': 1 }
      });
    }

    debitNote.addAuditEntry(
      'Soft Deleted',
      user.id,
      user.username || user.name
    );

    await debitNote.save();

    console.log(`Deleting debit note ${debitNote.debitNoteNumber}`);

    const deletedDebitNote = await softDelete(DebitNote, id, user.id, user.username || user.name);

    console.log(`✅ Successfully soft deleted debit note ${debitNote.debitNoteNumber}`);

    return NextResponse.json({
      message: "Debit note soft deleted successfully",
      debitNote: deletedDebitNote
    });
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to delete debit note ${params.id}:`, error);
    return NextResponse.json({
      error: "Server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}