// app/api/materials/[id]/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Material from "@/models/Material";
import StockAdjustment from "@/models/StockAdjustment";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

/**
 * PUT - Update a material
 */
export async function PUT(request: Request, context: RequestContext) {
  try {
    const { error, session } = await requireAuthAndPermission({
      material: ["update"],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();

    // Get the current material to compare stock changes
    const currentMaterial = await Material.findById(id);
    if (!currentMaterial) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    // Check if the material is soft-deleted
    if (currentMaterial.isDeleted) {
      return NextResponse.json({
        error: "Cannot update a deleted material. Please restore it first."
      }, { status: 400 });
    }

    // UNIT LOCKING: Prevent unit changes if locked
    if (body.unit && body.unit !== currentMaterial.unit) {
      if (currentMaterial.baseUnitLocked) {
        return NextResponse.json({
          error: "Cannot change unit after stock movements have been recorded. Unit is locked."
        }, { status: 400 });
      }
    }

    const updatedMaterial = await Material.findByIdAndUpdate(
      id,
      { ...body, updatedBy: session.user.id },
      { new: true }
    );

    // Check if stock has changed
    const oldStock = currentMaterial.stock;
    const newStock = updatedMaterial.stock;
    const oldUnitCost = currentMaterial.unitCost;
    const newUnitCost = updatedMaterial.unitCost;

    if (oldStock !== newStock || oldUnitCost !== newUnitCost) {
      // AUTO-LOCK: Lock unit on first stock movement
      if (!currentMaterial.baseUnitLocked && newStock > 0) {
        await Material.findByIdAndUpdate(id, { baseUnitLocked: true });
      }

      // Create a stock adjustment record
      const stockDifference = newStock - oldStock;
      const adjustmentType = stockDifference >= 0 ? 'increment' : 'decrement';
      const adjustmentValue = Math.abs(stockDifference);

      const newAdjustment = new StockAdjustment({
        materialId: id,
        materialName: updatedMaterial.name,
        adjustmentType,
        value: adjustmentValue,
        oldStock,
        newStock,
        oldUnitCost,
        newUnitCost,
        adjustmentReason: 'Material page edit',
        createdAt: new Date(),
        createdBy: session.user.id,
      });

      await newAdjustment.save();
    }

    return NextResponse.json(updatedMaterial);
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to update material ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update material" }, { status: 400 });
  }
}

/**
 * DELETE - Soft delete a material
 */
export async function DELETE(request: Request, context: RequestContext) {
  try {
    const { error, session } = await requireAuthAndPermission({
      material: ["soft_delete"],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;

    // softDelete utility automatically gets Better Auth user ID
    const deletedMaterial = await softDelete(Material, id, session.user.id);

    if (!deletedMaterial) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Material soft deleted successfully",
      material: deletedMaterial
    });
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to delete material ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}