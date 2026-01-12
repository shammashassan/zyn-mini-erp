// app/api/debit-notes/trash/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DebitNote from "@/models/DebitNote";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      debitNote: ["view_trash"],
    });
    if (error) return error;

    await dbConnect();

    const trashedDebitNotes = await getTrash(DebitNote);

    return NextResponse.json(trashedDebitNotes);
  } catch (error) {
    console.error("Failed to fetch trashed debit notes:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}