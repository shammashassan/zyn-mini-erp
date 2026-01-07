// app/api/return-notes/trash/delete/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReturnNote from "@/models/ReturnNote";
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
      returnNote: ["permanent_delete"],
    });
    if (error) return error;

    const returnNote = await ReturnNote.findById(id).setOptions({ includeDeleted: true });

    if (!returnNote) {
      return NextResponse.json({ error: "Return note not found" }, { status: 404 });
    }

    if (!returnNote.isDeleted) {
      return NextResponse.json({
        error: "Return note must be soft-deleted before permanent deletion"
      }, { status: 400 });
    }

    const deletedReturnNote = await permanentDelete(ReturnNote, id);

    return NextResponse.json({
      message: "Return note permanently deleted",
      returnNote: deletedReturnNote
    });
  } catch (error) {
    console.error("Failed to permanently delete return note:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}