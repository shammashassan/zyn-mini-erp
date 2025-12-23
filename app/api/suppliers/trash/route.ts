// app/api/suppliers/trash/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Supplier from "@/models/Supplier";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all soft-deleted suppliers
 */
export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      supplier: ["view_trash"],
    });
    if (error) return error;

    await dbConnect();
    
    // Using the utility function to get only soft-deleted records
    const trashedSuppliers = await getTrash(Supplier);
    
    return NextResponse.json(trashedSuppliers);
  } catch (error) {
    console.error("Failed to fetch trashed suppliers:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}