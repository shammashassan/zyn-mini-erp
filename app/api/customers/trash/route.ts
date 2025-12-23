// app/api/customers/trash/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Customer from "@/models/Customer";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all soft-deleted customers
 */
export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      customer: ["view_trash"],
    });
    if (error) return error;

    await dbConnect();
    
    // Using the utility function to get only soft-deleted records
    const trashedCustomers = await getTrash(Customer);
    
    return NextResponse.json(trashedCustomers);
  } catch (error) {
    console.error("Failed to fetch trashed customers:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}