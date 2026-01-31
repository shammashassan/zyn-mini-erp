// app/api/credit-notes/[id]/route.ts - FINAL: Using Party/Contact snapshots

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import CreditNote from "@/models/CreditNote";
import ReturnNote from "@/models/ReturnNote";
import Voucher from "@/models/Voucher";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { handleCreditNoteStatusChange } from '@/utils/journalAutoCreate';
import { voidJournalsForReference } from '@/utils/journalManager';
import { getUserInfo } from "@/lib/auth-helpers";
import { createPartySnapshot } from "@/utils/partySnapshot";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

export async function GET(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const { error } = await requireAuthAndPermission({
      creditNote: ["read"],
    });
    if (error) return error;

    // Ensure models are registered
    const _ensureModels = [Voucher, ReturnNote];

    const creditNote = await CreditNote.findById(id)
      .populate({
        path: 'connectedDocuments.returnNoteId',
        select: 'returnNumber invoiceReference',
        match: { isDeleted: false }
      })
      .populate({
        path: 'connectedDocuments.paymentIds',
        model: 'Voucher',
        select: 'invoiceNumber grandTotal voucherType',
        match: { isDeleted: false }
      })
      .populate({
        path: 'partyId',
        select: 'name company type roles'
      });

    if (!creditNote) {
      return NextResponse.json({ error: "Credit note not found" }, { status: 404 });
    }

    if (creditNote.isDeleted) {
      return NextResponse.json({
        error: "This credit note has been deleted"
      }, { status: 410 });
    }

    return NextResponse.json(creditNote);
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to fetch credit note ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function detectChanges(oldCreditNote: any, newData: any) {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
  const fieldsToTrack = ['status', 'reason', 'notes', 'discount'];

  for (const field of fieldsToTrack) {
    if (newData[field] !== undefined && oldCreditNote[field] !== newData[field]) {
      changes.push({
        field,
        oldValue: oldCreditNote[field],
        newValue: newData[field],
      });
    }
  }

  return changes;
}

export async function PUT(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();

    const { error, session } = await requireAuthAndPermission({
      creditNote: ["update"],
    });
    if (error) return error;

    const user = await getUserInfo();

    const currentCreditNote = await CreditNote.findById(id);
    if (!currentCreditNote) {
      return NextResponse.json({ error: "Credit note not found" }, { status: 404 });
    }

    if (currentCreditNote.isDeleted) {
      return NextResponse.json({
        error: "Cannot update a deleted credit note. Please restore it first."
      }, { status: 400 });
    }

    // ✅ Handle party/contact changes - update snapshots
    if (body.partyId && body.partyId !== currentCreditNote.partyId.toString()) {
      console.log(`🔄 Party changed for credit note ${id}, updating snapshots`);

      const { partySnapshot, contactSnapshot } = await createPartySnapshot(
        body.partyId,
        body.contactId
      );

      body.partySnapshot = partySnapshot;
      body.contactSnapshot = contactSnapshot;

      console.log(`   Old Party: ${currentCreditNote.partySnapshot.displayName}`);
      console.log(`   New Party: ${partySnapshot.displayName}`);
    }
    // ✅ If only contact changed (same party)
    else if (body.contactId && body.contactId !== currentCreditNote.contactId?.toString()) {
      console.log(`🔄 Contact changed for credit note ${id}, updating contact snapshot`);

      const { contactSnapshot } = await createPartySnapshot(
        currentCreditNote.partyId.toString(),
        body.contactId
      );

      body.contactSnapshot = contactSnapshot;
    }

    const oldStatus = currentCreditNote.status;
    const newStatus = body.status || oldStatus;

    const changes = detectChanges(currentCreditNote.toObject(), body);

    if (oldStatus !== newStatus) {
      await handleCreditNoteStatusChange(
        { ...currentCreditNote.toObject(), ...body },
        oldStatus,
        newStatus,
        user.id,
        user.username || user.name
      );
    }

    if (body.items || body.discount !== undefined) {
      const itemsToUse = body.items || currentCreditNote.items;
      const grossTotal = itemsToUse.reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0);
      const discount = body.discount !== undefined ? Number(body.discount) || 0 : (currentCreditNote.discount || 0);
      const subtotal = grossTotal - discount;
      const isTaxPayable = body.isTaxPayable !== undefined ? body.isTaxPayable : currentCreditNote.isTaxPayable;
      const vatAmount = isTaxPayable ? (subtotal * 0.05) : 0;
      const grandTotal = subtotal + vatAmount;

      body.totalAmount = grossTotal;
      body.discount = discount;
      body.vatAmount = vatAmount;
      body.grandTotal = grandTotal;
      body.remainingAmount = grandTotal - (currentCreditNote.paidAmount || 0);
    }

    currentCreditNote.addAuditEntry(
      'Updated',
      user.id,
      user.username || user.name,
      changes.length > 0 ? changes : undefined
    );

    currentCreditNote.set({
      ...body,
      updatedBy: user.id,
    });

    await currentCreditNote.save();

    console.log(`✅ Credit note ${id} updated successfully`);

    return NextResponse.json(currentCreditNote);
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to update credit note ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update credit note" }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const { error, session } = await requireAuthAndPermission({
      creditNote: ["soft_delete"],
    });
    if (error) return error;

    const user = await getUserInfo();

    const creditNote = await CreditNote.findById(id);

    if (!creditNote) {
      return NextResponse.json({ error: "Credit note not found" }, { status: 404 });
    }

    if (creditNote.isDeleted) {
      return NextResponse.json({
        error: "Credit note is already deleted"
      }, { status: 400 });
    }

    if (creditNote.status === 'approved') {
      await voidJournalsForReference(
        creditNote._id,
        user.id,
        user.username || user.name,
        'Credit note soft deleted'
      );
    }

    if (creditNote.connectedDocuments?.returnNoteId && creditNote.creditType === 'return') {
      await ReturnNote.findByIdAndUpdate(creditNote.connectedDocuments.returnNoteId, {
        $unset: { 'connectedDocuments.creditNoteId': 1 }
      });
    }

    creditNote.addAuditEntry(
      'Soft Deleted',
      user.id,
      user.username || user.name
    );

    await creditNote.save();

    const deletedCreditNote = await softDelete(CreditNote, id, user.id, user.username || user.name);

    console.log(`✅ Successfully soft deleted credit note ${creditNote.creditNoteNumber}`);

    return NextResponse.json({
      message: "Credit note soft deleted successfully",
      creditNote: deletedCreditNote
    });
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to delete credit note ${params.id}:`, error);
    return NextResponse.json({
      error: "Server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}