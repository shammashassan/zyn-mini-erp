// app/api/stock-adjustments/[id]/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import StockAdjustment from "@/models/StockAdjustment";
import Material from "@/models/Material";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

/**
 * DELETE - Soft delete a stock adjustment record
 */
export async function DELETE(request: Request, context: RequestContext) {
  try {
    const { error, session } = await requireAuthAndPermission({
      stockAdjustment: ["soft_delete"],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;

    // Get the adjustment record before soft deleting
    const adjustmentToDelete = await StockAdjustment.findById(id);

    if (!adjustmentToDelete) {
      return NextResponse.json({ error: "Adjustment record not found" }, { status: 404 });
    }

    // Check if already deleted
    if (adjustmentToDelete.isDeleted) {
      return NextResponse.json({
        error: "Adjustment record is already deleted"
      }, { status: 400 });
    }

    // Revert the stock and price changes in the material
    const material = await Material.findById(adjustmentToDelete.materialId);
    if (material) {
      const stockRevertValue = adjustmentToDelete.adjustmentType === 'increment'
        ? -adjustmentToDelete.value
        : +adjustmentToDelete.value;

      const newStock = material.stock + stockRevertValue;

      const wasUnitCostChanged = adjustmentToDelete.oldUnitCost !== adjustmentToDelete.newUnitCost;

      const updatePayload: { stock: number; unitCost?: number } = {
        stock: newStock
      };

      if (wasUnitCostChanged && typeof adjustmentToDelete.oldUnitCost === 'number') {
        updatePayload.unitCost = adjustmentToDelete.oldUnitCost;
      }

      await Material.findByIdAndUpdate(adjustmentToDelete.materialId, updatePayload);
    }

    // Soft delete the adjustment record
    const deletedAdjustment = await softDelete(StockAdjustment, id, session.user.id);

    return NextResponse.json({
      message: "Adjustment record soft deleted and changes reverted",
      adjustment: deletedAdjustment
    });
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to delete adjustment record ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}