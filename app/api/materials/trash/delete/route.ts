// app/api/materials/trash/delete/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Material from "@/models/Material";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * DELETE - Permanently delete a material
 * Body: { id: string }
 */
export async function DELETE(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      material: ["permanent_delete"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();

    // Validate required fields
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { id } = body;
    
    // Check if the material is soft-deleted first
    const material = await Material.findById(id).setOptions({ includeDeleted: true });
    
    if (!material) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }
    
    if (!material.isDeleted) {
      return NextResponse.json({ 
        error: "Material must be soft-deleted before permanent deletion" 
      }, { status: 400 });
    }
    
    const deletedMaterial = await permanentDelete(Material, id);
    
    return NextResponse.json({ 
      message: "Material permanently deleted",
      material: deletedMaterial 
    });
  } catch (error) {
    console.error("Failed to permanently delete material:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}