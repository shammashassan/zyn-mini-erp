// app/api/debit-notes/trash/delete/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DebitNote from "@/models/DebitNote";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = body;

    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { error } = await requireAuthAndPermission({
      debitNote: ["permanent_delete"],
    });
    if (error) return error;

    const debitNote = await DebitNote.findById(id).setOptions({ includeDeleted: true });

    if (!debitNote) {
      return NextResponse.json({ error: "Debit note not found" }, { status: 404 });
    }

    if (!debitNote.isDeleted) {
      return NextResponse.json({
        error: "Debit note must be soft-deleted before permanent deletion"
      }, { status: 400 });
    }

    const deletedDebitNote = await permanentDelete(DebitNote, id);

    return NextResponse.json({
      message: "Debit note permanently deleted",
      debitNote: deletedDebitNote
    });
  } catch (error) {
    console.error("Failed to permanently delete debit note:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}