// app/api/delivery-notes/trash/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DeliveryNote from "@/models/DeliveryNote";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all soft-deleted delivery notes
 */
export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Permission Check
    const { error } = await requireAuthAndPermission({
      deliveryNote: ["view_trash"],
    });
    if (error) return error;
    
    const trashedDeliveryNotes = await getTrash(DeliveryNote);
    
    return NextResponse.json(trashedDeliveryNotes);
  } catch (error) {
    console.error("Failed to fetch trashed delivery notes:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}