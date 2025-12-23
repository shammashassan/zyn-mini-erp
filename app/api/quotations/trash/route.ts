// app/api/quotations/trash/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Quotation from "@/models/Quotation";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all soft-deleted quotations
 */
export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Permission Check
    const { error } = await requireAuthAndPermission({
      quotation: ["view_trash"],
    });
    if (error) return error;
    
    const trashedQuotations = await getTrash(Quotation);
    
    return NextResponse.json(trashedQuotations);
  } catch (error) {
    console.error("Failed to fetch trashed quotations:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}