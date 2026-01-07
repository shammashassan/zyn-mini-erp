// app/api/return-notes/trash/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReturnNote from "@/models/ReturnNote";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      returnNote: ["view_trash"],
    });
    if (error) return error;

    await dbConnect();

    const trashedReturnNotes = await getTrash(ReturnNote);

    return NextResponse.json(trashedReturnNotes);
  } catch (error) {
    console.error("Failed to fetch trashed return notes:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}