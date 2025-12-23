// app/api/stock-adjustments/trash/delete/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import StockAdjustment from "@/models/StockAdjustment";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * DELETE - Permanently delete a stock adjustment
 * Body: { id: string }
 */
export async function DELETE(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      stockAdjustment: ["permanent_delete"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();

    // Validate required fields
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { id } = body;
    
    // Check if the adjustment is soft-deleted first
    const adjustment = await StockAdjustment.findById(id).setOptions({ includeDeleted: true });
    
    if (!adjustment) {
      return NextResponse.json({ error: "Adjustment not found" }, { status: 404 });
    }
    
    if (!adjustment.isDeleted) {
      return NextResponse.json({ 
        error: "Adjustment must be soft-deleted before permanent deletion" 
      }, { status: 400 });
    }
    
    const deletedAdjustment = await permanentDelete(StockAdjustment, id);
    
    return NextResponse.json({ 
      message: "Adjustment permanently deleted",
      adjustment: deletedAdjustment 
    });
  } catch (error) {
    console.error("Failed to permanently delete stock adjustment:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}