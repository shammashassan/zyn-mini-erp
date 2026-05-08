// app/api/return-notes/trash/route.ts - UPDATED: Added returnType filtering

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReturnNote from "@/models/ReturnNote";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      returnNote: ["view_trash"],
    });
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const returnTypeParam = searchParams.get('returnType'); // ✅ GET returnType parameter

    const filter: any = {};

    // ✅ ADD returnType filter
    if (returnTypeParam) {
      filter.returnType = returnTypeParam;
    }

    const trashedReturnNotes = await getTrash(ReturnNote, filter, "partyId connectedDocuments.invoiceId connectedDocuments.posSaleId connectedDocuments.purchaseId");

    return NextResponse.json(trashedReturnNotes);
  } catch (error) {
    console.error("Failed to fetch trashed return notes:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}