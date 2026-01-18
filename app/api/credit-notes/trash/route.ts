// app/api/credit-notes/trash/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import CreditNote from "@/models/CreditNote";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      creditNote: ["view_trash"],
    });
    if (error) return error;

    await dbConnect();

    const trashedCreditNotes = await getTrash(CreditNote);

    return NextResponse.json(trashedCreditNotes);
  } catch (error) {
    console.error("Failed to fetch trashed credit notes:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}