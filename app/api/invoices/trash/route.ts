// app/api/invoices/trash/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all soft-deleted invoices
 */
export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Permission Check
    const { error } = await requireAuthAndPermission({
      invoice: ["view_trash"],
    });
    if (error) return error;
    
    const trashedInvoices = await getTrash(Invoice, {}, "partyId");
    
    return NextResponse.json(trashedInvoices);
  } catch (error) {
    console.error("Failed to fetch trashed invoices:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}