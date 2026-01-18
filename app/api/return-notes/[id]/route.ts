// app/api/return-notes/[id]/route.ts - COMPLETE: Multi-Type Support

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReturnNote from "@/models/ReturnNote";
import Purchase from "@/models/Purchase";
import Invoice from "@/models/Invoice";
import Material from "@/models/Material";
import DebitNote from "@/models/DebitNote";
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

    const _ensureModels = [DebitNote, Purchase, Invoice, Material];

    const returnNote = await ReturnNote.findById(id)
      .populate({
        path: 'connectedDocuments.purchaseId',
        select: 'referenceNumber supplierName items inventoryStatus',
        match: { isDeleted: false }
      })
      .populate({
        path: 'connectedDocuments.invoiceId',
        select: 'invoiceNumber customerName items status',
        match: { isDeleted: false }
      })
      .populate({
        path: 'connectedDocuments.debitNoteId',
        select: 'debitNoteNumber status',
        match: { isDeleted: false }
      })
      .populate({
        path: 'connectedDocuments.creditNoteId',
        select: 'creditNoteNumber status',
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
    const returnType = currentReturnNote.returnType;

    const changes = detectChanges(currentReturnNote.toObject(), body);

    // Handle status change to 'approved'
    if (oldStatus !== 'approved' && newStatus === 'approved') {
      console.log(`📦 Approving ${returnType} return note ${currentReturnNote.returnNumber}...`);

      if (returnType === 'purchaseReturn') {
        // Handle purchase return approval
        const purchase = await Purchase.findById(currentReturnNote.connectedDocuments.purchaseId);
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

        // Reduce material stock
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

        console.log(`✅ Stock reduced for purchase return ${currentReturnNote.returnNumber}`);
      } else if (returnType === 'salesReturn') {
        // Handle sales return approval (NO stock adjustment)
        const invoice = await Invoice.findById(currentReturnNote.connectedDocuments.invoiceId);
        if (invoice && !invoice.isDeleted) {
          for (const returnItem of currentReturnNote.items) {
            const invoiceItemIndex = invoice.items.findIndex(
              (ii: any) => ii.description === returnItem.productName
            );

            if (invoiceItemIndex !== -1) {
              const currentReturned = invoice.items[invoiceItemIndex].returnedQuantity || 0;
              invoice.items[invoiceItemIndex].returnedQuantity = currentReturned + returnItem.returnQuantity;
            }
          }
          invoice.addAuditEntry(
            `Sales Return Note ${currentReturnNote.returnNumber} approved`,
            user.id,
            user.username || user.name
          );
          await invoice.save();
        }

        console.log(`✅ Sales return ${currentReturnNote.returnNumber} approved - invoice returned quantities updated`);
      }
      // Manual returns: no document updates needed
    }

    // Handle status change from 'approved' to other status
    if (oldStatus === 'approved' && newStatus !== 'approved') {
      console.log(`🔄 Reversing ${returnType} return note ${currentReturnNote.returnNumber}...`);

      if (returnType === 'purchaseReturn') {
        const purchase = await Purchase.findById(currentReturnNote.connectedDocuments.purchaseId);
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

        // Add material stock back
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

        console.log(`✅ Stock restored for purchase return ${currentReturnNote.returnNumber}`);
      } else if (returnType === 'salesReturn') {
        const invoice = await Invoice.findById(currentReturnNote.connectedDocuments.invoiceId);
        if (invoice && !invoice.isDeleted) {
          for (const returnItem of currentReturnNote.items) {
            const invoiceItemIndex = invoice.items.findIndex(
              (ii: any) => ii.description === returnItem.productName
            );

            if (invoiceItemIndex !== -1) {
              const currentReturned = invoice.items[invoiceItemIndex].returnedQuantity || 0;
              invoice.items[invoiceItemIndex].returnedQuantity = Math.max(0, currentReturned - returnItem.returnQuantity);
            }
          }
          invoice.addAuditEntry(
            `Sales Return Note ${currentReturnNote.returnNumber} reversed`,
            user.id,
            user.username || user.name
          );
          await invoice.save();
        }

        console.log(`✅ Sales return ${currentReturnNote.returnNumber} reversed - invoice returned quantities restored`);
      }
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

    const returnType = returnNote.returnType;

    // If the return note was approved, reverse the changes
    if (returnNote.status === 'approved') {
      console.log(`🔄 Reversing approved ${returnType} return note ${returnNote.returnNumber}...`);

      if (returnType === 'purchaseReturn') {
        const purchase = await Purchase.findById(returnNote.connectedDocuments.purchaseId);
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

          // Remove return note ID from purchase
          const updatedReturnNoteIds = (purchase.connectedDocuments?.returnNoteIds || [])
            .filter((rid: any) => rid.toString() !== id);

          purchase.connectedDocuments = {
            ...purchase.connectedDocuments,
            returnNoteIds: updatedReturnNoteIds
          };

          purchase.addAuditEntry(
            `Return Note ${returnNote.returnNumber} deleted`,
            user.id,
            user.username || user.name
          );

          await purchase.save();
        }

        // Add material stock back
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
      } else if (returnType === 'salesReturn') {
        const invoice = await Invoice.findById(returnNote.connectedDocuments.invoiceId);
        if (invoice && !invoice.isDeleted) {
          for (const returnItem of returnNote.items) {
            const invoiceItemIndex = invoice.items.findIndex(
              (ii: any) => ii.description === returnItem.productName
            );

            if (invoiceItemIndex !== -1) {
              const currentReturned = invoice.items[invoiceItemIndex].returnedQuantity || 0;
              invoice.items[invoiceItemIndex].returnedQuantity = Math.max(0, currentReturned - returnItem.returnQuantity);
            }
          }
          // Remove return note ID from invoice
          const updatedReturnNoteIds = (invoice.connectedDocuments?.returnNoteIds || [])
            .filter((rid: any) => rid.toString() !== id);

          invoice.connectedDocuments = {
            ...invoice.connectedDocuments,
            returnNoteIds: updatedReturnNoteIds
          };

          invoice.addAuditEntry(
            `Sales Return Note ${returnNote.returnNumber} deleted`,
            user.id,
            user.username || user.name
          );

          await invoice.save();
        }
      }
    } else {
      // Even if not approved, remove from connected documents
      if (returnType === 'purchaseReturn') {
        const purchase = await Purchase.findById(returnNote.connectedDocuments.purchaseId);
        if (purchase && !purchase.isDeleted) {
          const updatedReturnNoteIds = (purchase.connectedDocuments?.returnNoteIds || [])
            .filter((rid: any) => rid.toString() !== id);

          purchase.connectedDocuments = {
            ...purchase.connectedDocuments,
            returnNoteIds: updatedReturnNoteIds
          };

          purchase.addAuditEntry(
            `Return Note ${returnNote.returnNumber} deleted`,
            user.id,
            user.username || user.name
          );

          await purchase.save();
        }
      } else if (returnType === 'salesReturn') {
        const invoice = await Invoice.findById(returnNote.connectedDocuments.invoiceId);
        if (invoice && !invoice.isDeleted) {
          const updatedReturnNoteIds = (invoice.connectedDocuments?.returnNoteIds || [])
            .filter((rid: any) => rid.toString() !== id);

          invoice.connectedDocuments = {
            ...invoice.connectedDocuments,
            returnNoteIds: updatedReturnNoteIds
          };

          invoice.addAuditEntry(
            `Sales Return Note ${returnNote.returnNumber} deleted`,
            user.id,
            user.username || user.name
          );

          await invoice.save();
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

    console.log(`✅ Successfully soft deleted ${returnType} return note ${returnNote.returnNumber}`);

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