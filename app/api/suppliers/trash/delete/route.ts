// app/api/suppliers/trash/delete/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Supplier from "@/models/Supplier";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * DELETE - Permanently delete a supplier
 * Body: { id: string }
 */
export async function DELETE(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      supplier: ["permanent_delete"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();

    // Validate required fields
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { id } = body;
    
    // Check if the supplier is soft-deleted first
    const supplier = await Supplier.findById(id).setOptions({ includeDeleted: true });
    
    if (!supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }
    
    if (!supplier.isDeleted) {
      return NextResponse.json({ 
        error: "Supplier must be soft-deleted before permanent deletion" 
      }, { status: 400 });
    }
    
    const deletedSupplier = await permanentDelete(Supplier, id);
    
    return NextResponse.json({ 
      message: "Supplier permanently deleted",
      supplier: deletedSupplier 
    });
  } catch (error) {
    console.error("Failed to permanently delete supplier:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}