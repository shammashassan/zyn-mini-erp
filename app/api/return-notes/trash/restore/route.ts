// app/api/return-notes/trash/restore/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReturnNote from "@/models/ReturnNote";
import Purchase from "@/models/Purchase";
import Material from "@/models/Material";
import StockAdjustment from "@/models/StockAdjustment";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = body;

    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { error, session } = await requireAuthAndPermission({
      returnNote: ["restore"],
    });
    if (error) return error;

    const user = session.user;

    const returnNoteToRestore = await ReturnNote.findById(id).setOptions({ includeDeleted: true });

    if (!returnNoteToRestore) {
      return NextResponse.json({ error: "Return note not found" }, { status: 404 });
    }

    if (!returnNoteToRestore.isDeleted) {
      return NextResponse.json({
        error: "Return note is not deleted"
      }, { status: 400 });
    }

    console.log(`♻️ Restoring return note ${returnNoteToRestore.returnNumber}...`);

    // If the return note was approved, restore the stock changes
    if (returnNoteToRestore.status === 'approved') {
      const purchase = await Purchase.findById(returnNoteToRestore.purchaseId);
      if (purchase && !purchase.isDeleted) {
        // Restore purchase item returned quantities
        for (const returnItem of returnNoteToRestore.items) {
          const purchaseItemIndex = purchase.items.findIndex(
            (pi: any) => pi.materialId === returnItem.materialId
          );

          if (purchaseItemIndex !== -1) {
            const currentReturned = purchase.items[purchaseItemIndex].returnedQuantity || 0;
            purchase.items[purchaseItemIndex].returnedQuantity = currentReturned + returnItem.returnQuantity;
          }
        }

        purchase.addAuditEntry(
          `Return Note ${returnNoteToRestore.returnNumber} restored`,
          user.id,
          user.username || user.name
        );

        await purchase.save();
      }

      // Reduce stock again
      for (const returnItem of returnNoteToRestore.items) {
        const material = await Material.findById(returnItem.materialId);
        if (material) {
          const oldStock = material.stock;
          const newStock = oldStock - returnItem.returnQuantity;

          await Material.findByIdAndUpdate(returnItem.materialId, { stock: newStock });

          const newAdjustment = new StockAdjustment({
            materialId: returnItem.materialId,
            materialName: returnItem.materialName,
            adjustmentType: 'decrement',
            value: returnItem.returnQuantity,
            oldStock,
            newStock,
            oldUnitCost: material.unitCost,
            newUnitCost: material.unitCost,
            adjustmentReason: `Return Note ${returnNoteToRestore.returnNumber} restored`,
            createdAt: new Date(),
          });

          await newAdjustment.save();
        }
      }
    }

    const restoredReturnNote = await restore(
      ReturnNote,
      id,
      user.id,
      user.username || user.name
    );

    if (!restoredReturnNote) {
      return NextResponse.json({ error: "Return note not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Return note restored successfully",
      returnNote: restoredReturnNote
    });
  } catch (error) {
    console.error("Failed to restore return note:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}