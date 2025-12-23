// app/api/materials/trash/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Material from "@/models/Material";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all soft-deleted materials
 */
export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      material: ["view_trash"],
    });
    if (error) return error;

    await dbConnect();
    
    // Using the utility function to get only soft-deleted records
    const trashedMaterials = await getTrash(Material);
    
    return NextResponse.json(trashedMaterials);
  } catch (error) {
    console.error("Failed to fetch trashed materials:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}