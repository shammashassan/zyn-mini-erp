// app/api/suppliers/[id]/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Supplier from "@/models/Supplier";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

/**
 * PUT - Update a supplier
 */
export async function PUT(request: Request, context: RequestContext) {
  try {
    const { error, session } = await requireAuthAndPermission({
      supplier: ["update"],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();
    
    // Validate only name is required if provided
    if (body.name !== undefined && (!body.name || !body.name.trim())) {
      return NextResponse.json(
        { error: "Supplier name cannot be empty" },
        { status: 400 }
      );
    }
    
    // Get the current supplier to check if it's deleted
    const currentSupplier = await Supplier.findById(id);
    if (!currentSupplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    // Check if the supplier is soft-deleted
    if (currentSupplier.isDeleted) {
      return NextResponse.json({ 
        error: "Cannot update a deleted supplier. Please restore it first." 
      }, { status: 400 });
    }

    const updatedSupplier = await Supplier.findByIdAndUpdate(
      id, 
      { ...body, updatedBy: session.user.id },
      { new: true }
    );
    
    return NextResponse.json(updatedSupplier);
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to update supplier ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update supplier" }, { status: 400 });
  }
}

/**
 * DELETE - Soft delete a supplier
 */
export async function DELETE(request: Request, context: RequestContext) {
  try {
    const { error, session } = await requireAuthAndPermission({
      supplier: ["soft_delete"],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    
    // softDelete utility automatically gets Better Auth user ID
    const deletedSupplier = await softDelete(Supplier, id, session.user.id);
    
    if (!deletedSupplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: "Supplier soft deleted successfully",
      supplier: deletedSupplier 
    });
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to delete supplier ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}