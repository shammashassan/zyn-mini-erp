// app/api/credit-notes/trash/delete/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import CreditNote from "@/models/CreditNote";
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
      creditNote: ["permanent_delete"],
    });
    if (error) return error;

    const creditNote = await CreditNote.findById(id).setOptions({ includeDeleted: true });

    if (!creditNote) {
      return NextResponse.json({ error: "Credit note not found" }, { status: 404 });
    }

    if (!creditNote.isDeleted) {
      return NextResponse.json({
        error: "Credit note must be soft-deleted before permanent deletion"
      }, { status: 400 });
    }

    const deletedCreditNote = await permanentDelete(CreditNote, id);

    return NextResponse.json({
      message: "Credit note permanently deleted",
      creditNote: deletedCreditNote
    });
  } catch (error) {
    console.error("Failed to permanently delete credit note:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}