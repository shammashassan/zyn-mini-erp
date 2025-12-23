// app/api/purchases/trash/delete/route.ts - UPDATED with permissions

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Purchase from "@/models/Purchase";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * DELETE - Permanently delete a purchase
 */
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = body;

    // Validate required fields
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    // Check authentication and permission
    const { error, session } = await requireAuthAndPermission({
      purchase: ["permanent_delete"],
    });

    if (error) return error;
    
    // Check if the purchase is soft-deleted first
    const purchase = await Purchase.findById(id).setOptions({ includeDeleted: true });
    
    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }
    
    if (!purchase.isDeleted) {
      return NextResponse.json({ 
        error: "Purchase must be soft-deleted before permanent deletion" 
      }, { status: 400 });
    }
    
    const deletedPurchase = await permanentDelete(Purchase, id);
    
    return NextResponse.json({ 
      message: "Purchase permanently deleted",
      purchase: deletedPurchase 
    });
  } catch (error) {
    console.error("Failed to permanently delete purchase:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}