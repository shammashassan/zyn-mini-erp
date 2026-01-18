// app/api/credit-notes/trash/restore/route.ts - UPDATED: Support Return Note Linking

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import CreditNote from "@/models/CreditNote";
import ReturnNote from "@/models/ReturnNote";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";
import { createJournalForCreditNote } from '@/utils/journalAutoCreate';

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = body;

    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { error, session } = await requireAuthAndPermission({
      creditNote: ["restore"],
    });
    if (error) return error;

    const user = session.user;

    const creditNoteToRestore = await CreditNote.findById(id).setOptions({ includeDeleted: true });

    if (!creditNoteToRestore) {
      return NextResponse.json({ error: "Credit note not found" }, { status: 404 });
    }

    if (!creditNoteToRestore.isDeleted) {
      return NextResponse.json({
        error: "Credit note is not deleted"
      }, { status: 400 });
    }

    console.log(`♻️ Restoring credit note ${creditNoteToRestore.creditNoteNumber}...`);

    if (creditNoteToRestore.connectedDocuments?.returnNoteId && creditNoteToRestore.creditType === 'return') {
      await ReturnNote.findByIdAndUpdate(creditNoteToRestore.connectedDocuments.returnNoteId, {
        'connectedDocuments.creditNoteId': creditNoteToRestore._id
      });
    }

    if (creditNoteToRestore.status === 'approved') {
      await createJournalForCreditNote(
        creditNoteToRestore.toObject(),
        user.id,
        user.username || user.name
      );
    }

    const restoredCreditNote = await restore(
      CreditNote,
      id,
      user.id,
      user.username || user.name
    );

    if (!restoredCreditNote) {
      return NextResponse.json({ error: "Credit note not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Credit note restored successfully",
      creditNote: restoredCreditNote
    });
  } catch (error) {
    console.error("Failed to restore credit note:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}