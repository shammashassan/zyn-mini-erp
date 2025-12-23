// app/api/purchases/trash/route.ts - UPDATED with permissions

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Purchase from "@/models/Purchase";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all soft-deleted purchases
 */
export async function GET() {
  try {
    // Check authentication and permission
    const { error, session } = await requireAuthAndPermission({
      purchase: ["view_trash"],
    });

    if (error) return error;

    await dbConnect();
    
    // Using the utility function to get only soft-deleted records
    const trashedPurchases = await getTrash(Purchase);
    
    return NextResponse.json(trashedPurchases);
  } catch (error) {
    console.error("Failed to fetch trashed purchases:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}