// app/api/stock-adjustments/trash/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import StockAdjustment from "@/models/StockAdjustment";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all soft-deleted stock adjustments
 */
export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      stockAdjustment: ["view_trash"],
    });
    if (error) return error;

    await dbConnect();
    
    const trashedAdjustments = await getTrash(StockAdjustment);
    
    return NextResponse.json(trashedAdjustments);
  } catch (error) {
    console.error("Failed to fetch trashed stock adjustments:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}