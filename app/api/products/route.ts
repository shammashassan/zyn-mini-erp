// app/api/products/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Product from "@/models/Product";
import { getActive } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all active (non-deleted) products
 */
export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      product: ["read"],
    });
    if (error) return error;

    await dbConnect();
    
    // Using the utility function to get only active records
    const products = await getActive(Product);
    
    return NextResponse.json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST - Create a new product
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuthAndPermission({
      product: ["create"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();
    
    const newProduct = new Product({
      ...body,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: session.user.id,
    });
    
    await newProduct.save();
    return NextResponse.json(newProduct, { status: 201 });
  } catch (error) {
    console.error("Failed to create product:", error);
    return NextResponse.json({ error: "Failed to create product" }, { status: 400 });
  }
}