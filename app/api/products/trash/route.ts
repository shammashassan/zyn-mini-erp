// app/api/products/trash/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all soft-deleted products
 */
export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      product: ["view_trash"],
    });
    if (error) return error;

    await dbConnect();
    
    // Using the utility function to get only soft-deleted records
    const trashedProducts = await getTrash(Product);
    
    return NextResponse.json(trashedProducts);
  } catch (error) {
    console.error("Failed to fetch trashed products:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}