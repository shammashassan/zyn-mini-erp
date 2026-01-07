// app/api/return-notes/[id]/route.ts - UPDATED: No Commercial Fields

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReturnNote from "@/models/ReturnNote";
import Purchase from "@/models/Purchase";
import Material from "@/models/Material";
import StockAdjustment from "@/models/StockAdjustment";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

export async function GET(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const { error } = await requireAuthAndPermission({
      returnNote: ["read"],
    });
    if (error) return error;

    const returnNote = await ReturnNote.findById(id)
      .populate({
        path: 'purchaseId',
        select: 'referenceNumber supplierName items inventoryStatus',
        match: { isDeleted: false }
      })
      .populate({
        path: 'connectedDocuments.debitNoteId',
        select: 'debitNoteNumber',
        match: { isDeleted: false }
      });

    if (!returnNote) {
      return NextResponse.json({ error: "Return note not found" }, { status: 404 });
    }

    if (returnNote.isDeleted) {
      return NextResponse.json({
        error: "This return note has been deleted"
      }, { status: 410 });
    }

    return NextResponse.json(returnNote);
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to fetch return note ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

function detectChanges(oldReturnNote: any, newData: any) {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
  const fieldsToTrack = ['status', 'reason', 'notes'];

  for (const field of fieldsToTrack) {
    if (newData[field] !== undefined && oldReturnNote[field] !== newData[field]) {
      changes.push({
        field,
        oldValue: oldReturnNote[field],
        newValue: newData[field],
      });
    }
  }

  return changes;
}

export async function PUT(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();

    const { error, session } = await requireAuthAndPermission({
      returnNote: ["update"],
    });
    if (error) return error;

    const user = session.user;

    const currentReturnNote = await ReturnNote.findById(id);
    if (!currentReturnNote) {
      return NextResponse.json({ error: "Return note not found" }, { status: 404 });
    }

    if (currentReturnNote.isDeleted) {
      return NextResponse.json({
        error: "Cannot update a deleted return note. Please restore it first."
      }, { status: 400 });
    }

    const oldStatus = currentReturnNote.status;
    const newStatus = body.status || oldStatus;

    const changes = detectChanges(currentReturnNote.toObject(), body);

    // Handle status change to 'approved'
    if (oldStatus !== 'approved' && newStatus === 'approved') {
      console.log(`📦 Approving return note ${currentReturnNote.returnNumber}...`);

      const purchase = await Purchase.findById(currentReturnNote.purchaseId);
      if (!purchase || purchase.isDeleted) {
        return NextResponse.json({
          error: "Associated purchase not found"
        }, { status: 404 });
      }

      // Update purchase item returned quantities
      for (const returnItem of currentReturnNote.items) {
        const purchaseItemIndex = purchase.items.findIndex(
          (pi: any) => pi.materialId === returnItem.materialId
        );

        if (purchaseItemIndex !== -1) {
          const currentReturned = purchase.items[purchaseItemIndex].returnedQuantity || 0;
          purchase.items[purchaseItemIndex].returnedQuantity = currentReturned + returnItem.returnQuantity;
        }
      }

      purchase.addAuditEntry(
        `Return Note ${currentReturnNote.returnNumber} approved`,
        user.id,
        user.username || user.name
      );

      await purchase.save();

      // Reduce stock
      for (const returnItem of currentReturnNote.items) {
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
            adjustmentReason: `Return Note ${currentReturnNote.returnNumber} approved`,
            createdAt: new Date(),
          });

          await newAdjustment.save();
        }
      }

      console.log(`✅ Stock reduced for return note ${currentReturnNote.returnNumber}`);
    }

    // Handle status change from 'approved' to other status
    if (oldStatus === 'approved' && newStatus !== 'approved') {
      console.log(`🔄 Reversing return note ${currentReturnNote.returnNumber}...`);

      const purchase = await Purchase.findById(currentReturnNote.purchaseId);
      if (purchase && !purchase.isDeleted) {
        // Reverse purchase item returned quantities
        for (const returnItem of currentReturnNote.items) {
          const purchaseItemIndex = purchase.items.findIndex(
            (pi: any) => pi.materialId === returnItem.materialId
          );

          if (purchaseItemIndex !== -1) {
            const currentReturned = purchase.items[purchaseItemIndex].returnedQuantity || 0;
            purchase.items[purchaseItemIndex].returnedQuantity = Math.max(0, currentReturned - returnItem.returnQuantity);
          }
        }

        purchase.addAuditEntry(
          `Return Note ${currentReturnNote.returnNumber} reversed`,
          user.id,
          user.username || user.name
        );

        await purchase.save();
      }

      // Add stock back
      for (const returnItem of currentReturnNote.items) {
        const material = await Material.findById(returnItem.materialId);
        if (material) {
          const oldStock = material.stock;
          const newStock = oldStock + returnItem.returnQuantity;

          await Material.findByIdAndUpdate(returnItem.materialId, { stock: newStock });

          const newAdjustment = new StockAdjustment({
            materialId: returnItem.materialId,
            materialName: returnItem.materialName,
            adjustmentType: 'increment',
            value: returnItem.returnQuantity,
            oldStock,
            newStock,
            oldUnitCost: material.unitCost,
            newUnitCost: material.unitCost,
            adjustmentReason: `Return Note ${currentReturnNote.returnNumber} reversed`,
            createdAt: new Date(),
          });

          await newAdjustment.save();
        }
      }

      console.log(`✅ Stock restored for return note ${currentReturnNote.returnNumber}`);
    }

    currentReturnNote.addAuditEntry(
      'Updated',
      user.id,
      user.username || user.name,
      changes.length > 0 ? changes : undefined
    );

    currentReturnNote.set({
      ...body,
      updatedBy: user.id,
    });

    await currentReturnNote.save();

    console.log(`✅ Return note ${id} updated successfully`);

    return NextResponse.json(currentReturnNote);
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to update return note ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update return note" }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const { error, session } = await requireAuthAndPermission({
      returnNote: ["soft_delete"],
    });
    if (error) return error;

    const user = session.user;

    const returnNote = await ReturnNote.findById(id);

    if (!returnNote) {
      return NextResponse.json({ error: "Return note not found" }, { status: 404 });
    }

    if (returnNote.isDeleted) {
      return NextResponse.json({
        error: "Return note is already deleted"
      }, { status: 400 });
    }

    // If the return note was approved, reverse the stock changes
    if (returnNote.status === 'approved') {
      console.log(`🔄 Reversing approved return note ${returnNote.returnNumber}...`);

      const purchase = await Purchase.findById(returnNote.purchaseId);
      if (purchase && !purchase.isDeleted) {
        // Reverse purchase item returned quantities
        for (const returnItem of returnNote.items) {
          const purchaseItemIndex = purchase.items.findIndex(
            (pi: any) => pi.materialId === returnItem.materialId
          );

          if (purchaseItemIndex !== -1) {
            const currentReturned = purchase.items[purchaseItemIndex].returnedQuantity || 0;
            purchase.items[purchaseItemIndex].returnedQuantity = Math.max(0, currentReturned - returnItem.returnQuantity);
          }
        }

        purchase.addAuditEntry(
          `Return Note ${returnNote.returnNumber} deleted`,
          user.id,
          user.username || user.name
        );

        await purchase.save();
      }

      // Add stock back
      for (const returnItem of returnNote.items) {
        const material = await Material.findById(returnItem.materialId);
        if (material) {
          const oldStock = material.stock;
          const newStock = oldStock + returnItem.returnQuantity;

          await Material.findByIdAndUpdate(returnItem.materialId, { stock: newStock });

          const newAdjustment = new StockAdjustment({
            materialId: returnItem.materialId,
            materialName: returnItem.materialName,
            adjustmentType: 'increment',
            value: returnItem.returnQuantity,
            oldStock,
            newStock,
            oldUnitCost: material.unitCost,
            newUnitCost: material.unitCost,
            adjustmentReason: `Return Note ${returnNote.returnNumber} deleted`,
            createdAt: new Date(),
          });

          await newAdjustment.save();
        }
      }
    }

    returnNote.addAuditEntry(
      'Soft Deleted',
      user.id,
      user.username || user.name
    );

    await returnNote.save();

    const deletedReturnNote = await softDelete(ReturnNote, id, user.id, user.username || user.name);

    console.log(`✅ Successfully soft deleted return note ${returnNote.returnNumber}`);

    return NextResponse.json({
      message: "Return note soft deleted successfully",
      returnNote: deletedReturnNote
    });
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to delete return note ${params.id}:`, error);
    return NextResponse.json({
      error: "Server error",
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}