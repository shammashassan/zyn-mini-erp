// app/api/products/[id]/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

/**
 * PUT - Update a product
 */
export async function PUT(request: Request, context: RequestContext) {
  try {
    const { error, session } = await requireAuthAndPermission({
      product: ["update"],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();
    
    // Get the current product to check if it's deleted
    const currentProduct = await Product.findById(id);
    if (!currentProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if the product is soft-deleted
    if (currentProduct.isDeleted) {
      return NextResponse.json({ 
        error: "Cannot update a deleted product. Please restore it first." 
      }, { status: 400 });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id, 
      { ...body, updatedBy: session.user.id },
      { new: true }
    );
    
    return NextResponse.json(updatedProduct);
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to update product ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update product" }, { status: 400 });
  }
}

/**
 * DELETE - Soft delete a product
 */
export async function DELETE(request: Request, context: RequestContext) {
  try {
    const { error, session } = await requireAuthAndPermission({
      product: ["soft_delete"],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    
    // softDelete utility automatically gets Better Auth user ID
    const deletedProduct = await softDelete(Product, id, session.user.id);
    
    if (!deletedProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: "Product soft deleted successfully",
      product: deletedProduct 
    });
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to delete product ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}