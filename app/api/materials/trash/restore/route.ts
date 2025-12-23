// app/api/materials/trash/restore/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Material from "@/models/Material";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * POST - Restore a soft-deleted material
 * Body: { id: string }
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuthAndPermission({
      material: ["restore"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();

    // Validate required fields
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { id } = body;
    
    const restoredMaterial = await restore(Material, id, session.user.id);
    
    if (!restoredMaterial) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: "Material restored successfully",
      material: restoredMaterial 
    });
  } catch (error) {
    console.error("Failed to restore material:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}