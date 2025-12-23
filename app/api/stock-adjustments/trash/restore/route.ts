// app/api/stock-adjustments/trash/restore/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import StockAdjustment from "@/models/StockAdjustment";
import Material from "@/models/Material";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * POST - Restore a soft-deleted stock adjustment
 * Body: { id: string }
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuthAndPermission({
      stockAdjustment: ["restore"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();

    // Validate required fields
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { id } = body;
    
    // Get the adjustment before restoring to reapply changes
    const adjustmentToRestore = await StockAdjustment.findById(id)
      .setOptions({ includeDeleted: true });
    
    if (!adjustmentToRestore) {
      return NextResponse.json({ error: "Adjustment not found" }, { status: 404 });
    }

    if (!adjustmentToRestore.isDeleted) {
      return NextResponse.json({ 
        error: "Adjustment is not deleted" 
      }, { status: 400 });
    }

    // Reapply the stock and price changes
    const material = await Material.findById(adjustmentToRestore.materialId);
    if (material) {
      const stockReapplyValue = adjustmentToRestore.adjustmentType === 'increment' 
        ? adjustmentToRestore.value 
        : -adjustmentToRestore.value;
      
      const newStock = material.stock + stockReapplyValue;
      
      const wasUnitCostChanged = adjustmentToRestore.oldUnitCost !== adjustmentToRestore.newUnitCost;
      
      const updatePayload: { stock: number; unitCost?: number } = {
        stock: newStock
      };
      
      if (wasUnitCostChanged && typeof adjustmentToRestore.newUnitCost === 'number') {
        updatePayload.unitCost = adjustmentToRestore.newUnitCost;
      }
      
      await Material.findByIdAndUpdate(adjustmentToRestore.materialId, updatePayload);
    }
    
    // Restore the adjustment record
    const restoredAdjustment = await restore(StockAdjustment, id, session.user.id);
    
    return NextResponse.json({ 
      message: "Adjustment restored successfully and changes reapplied",
      adjustment: restoredAdjustment 
    });
  } catch (error) {
    console.error("Failed to restore stock adjustment:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}