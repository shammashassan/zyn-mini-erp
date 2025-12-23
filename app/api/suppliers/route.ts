// app/api/suppliers/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Supplier from "@/models/Supplier";
import { getActive } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all active (non-deleted) suppliers
 */
export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      supplier: ["read"],
    });
    if (error) return error;

    await dbConnect();
    
    // Using the utility function to get only active records
    const suppliers = await getActive(Supplier);
    
    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Failed to fetch suppliers:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST - Create a new supplier
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuthAndPermission({
      supplier: ["create"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();
    
    // Validate only name is required
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 }
      );
    }
    
    const newSupplier = new Supplier({
      ...body,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: session.user.id,
    });
    
    await newSupplier.save();
    return NextResponse.json(newSupplier, { status: 201 });
  } catch (error) {
    console.error("Failed to create supplier:", error);
    return NextResponse.json({ error: "Failed to create supplier" }, { status: 400 });
  }
}