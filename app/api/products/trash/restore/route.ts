// app/api/products/trash/restore/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * POST - Restore a soft-deleted product
 * Body: { id: string }
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuthAndPermission({
      product: ["restore"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();

    // Validate required fields
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { id } = body;
    
    const restoredProduct = await restore(Product, id, session.user.id);
    
    if (!restoredProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: "Product restored successfully",
      product: restoredProduct 
    });
  } catch (error) {
    console.error("Failed to restore product:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}