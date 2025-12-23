// app/api/products/trash/delete/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * DELETE - Permanently delete a product
 * Body: { id: string }
 */
export async function DELETE(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      product: ["permanent_delete"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();

    // Validate required fields
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { id } = body;
    
    // Check if the product is soft-deleted first
    const product = await Product.findById(id).setOptions({ includeDeleted: true });
    
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    
    if (!product.isDeleted) {
      return NextResponse.json({ 
        error: "Product must be soft-deleted before permanent deletion" 
      }, { status: 400 });
    }
    
    const deletedProduct = await permanentDelete(Product, id);
    
    return NextResponse.json({ 
      message: "Product permanently deleted",
      product: deletedProduct 
    });
  } catch (error) {
    console.error("Failed to permanently delete product:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}