// app/api/materials/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Material from "@/models/Material";
import { getActive } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all active (non-deleted) materials
 */
export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      material: ["read"],
    });
    if (error) return error;

    await dbConnect();
    
    // Using the utility function to get only active records
    const materials = await getActive(Material);
    
    return NextResponse.json(materials);
  } catch (error) {
    console.error("Failed to fetch materials:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST - Create a new material
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuthAndPermission({
      material: ["create"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();
    
    const newMaterial = new Material({
      ...body,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: session.user.id,
    });
    
    await newMaterial.save();
    return NextResponse.json(newMaterial, { status: 201 });
  } catch (error) {
    console.error("Failed to create material:", error);
    return NextResponse.json({ error: "Failed to create material" }, { status: 400 });
  }
}