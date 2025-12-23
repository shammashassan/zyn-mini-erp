// app/api/suppliers/trash/restore/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Supplier from "@/models/Supplier";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * POST - Restore a soft-deleted supplier
 * Body: { id: string }
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuthAndPermission({
      supplier: ["restore"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();

    // Validate required fields
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { id } = body;
    
    const restoredSupplier = await restore(Supplier, id, session.user.id);
    
    if (!restoredSupplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: "Supplier restored successfully",
      supplier: restoredSupplier 
    });
  } catch (error) {
    console.error("Failed to restore supplier:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}