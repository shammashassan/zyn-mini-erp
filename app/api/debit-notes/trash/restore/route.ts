// app/api/debit-notes/trash/restore/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DebitNote from "@/models/DebitNote";
import ReturnNote from "@/models/ReturnNote";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";
import { createJournalForDebitNote } from '@/utils/journalAutoCreate';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = body;

    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { error, session } = await requireAuthAndPermission({
      debitNote: ["restore"],
    });
    if (error) return error;

    const user = session.user;

    const debitNoteToRestore = await DebitNote.findById(id).setOptions({ includeDeleted: true });

    if (!debitNoteToRestore) {
      return NextResponse.json({ error: "Debit note not found" }, { status: 404 });
    }

    if (!debitNoteToRestore.isDeleted) {
      return NextResponse.json({
        error: "Debit note is not deleted"
      }, { status: 400 });
    }

    console.log(`♻️ Restoring debit note ${debitNoteToRestore.debitNoteNumber}...`);

    // Restore link to return note if applicable
    if (debitNoteToRestore.connectedDocuments?.returnNoteId && debitNoteToRestore.debitType === 'return') {
      await ReturnNote.findByIdAndUpdate(debitNoteToRestore.connectedDocuments.returnNoteId, {
        'connectedDocuments.debitNoteId': debitNoteToRestore._id
      });
    }

    // Restore journal if approved
    if (debitNoteToRestore.status === 'approved') {
      await createJournalForDebitNote(
        debitNoteToRestore.toObject(),
        user.id,
        user.username || user.name
      );
    }

    const restoredDebitNote = await restore(
      DebitNote,
      id,
      user.id,
      user.username || user.name
    );

    if (!restoredDebitNote) {
      return NextResponse.json({ error: "Debit note not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Debit note restored successfully",
      debitNote: restoredDebitNote
    });
  } catch (error) {
    console.error("Failed to restore debit note:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}