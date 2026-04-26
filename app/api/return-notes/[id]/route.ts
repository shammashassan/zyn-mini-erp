// app/api/return-notes/[id]/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReturnNote from "@/models/ReturnNote";
import Purchase from "@/models/Purchase";
import Invoice from "@/models/Invoice";
import DebitNote from "@/models/DebitNote";
import POSSale from "@/models/POSSale";
import StockAdjustment from "@/models/StockAdjustment";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { voidJournalsForReference } from "@/utils/journalManager";
import {
  reverseStockForSalesReturn,
  deductStockForInvoice,
  removeStockForPurchaseReturn,
  addStockForPurchaseReturn,
} from "@/utils/inventoryManager";
import {
  createJournalForSalesReturn,
  createJournalForPurchaseReturn,
} from "@/utils/journalAutoCreate";

interface RequestContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const { error } = await requireAuthAndPermission({
      returnNote: ["read"],
    });
    if (error) return error;

    const _ensureModels = [DebitNote, Purchase, Invoice];
    const includeDeleted = request.headers.get('X-Include-Deleted') === 'true';

    const returnNoteQuery = ReturnNote.findById(id)
      .populate({
        path: "connectedDocuments.purchaseId",
        select: "referenceNumber items inventoryStatus partySnapshot",
        match: { isDeleted: false },
      })
      .populate({
        path: "connectedDocuments.invoiceId",
        select: "invoiceNumber items status partySnapshot",
        match: { isDeleted: false },
      })
      .populate({
        path: "connectedDocuments.debitNoteId",
        select: "debitNoteNumber status",
        match: { isDeleted: false },
      })
      .populate({
        path: "connectedDocuments.creditNoteId",
        select: "creditNoteNumber status",
        match: { isDeleted: false },
      });

    if (includeDeleted) {
      returnNoteQuery.setOptions({ includeDeleted: true });
    }

    const returnNote = await returnNoteQuery;

    if (!returnNote) {
      return NextResponse.json(
        { error: "Return note not found" },
        { status: 404 }
      );
    }

    if (returnNote.isDeleted && !includeDeleted) {
      return NextResponse.json(
        { error: "This return note has been deleted" },
        { status: 410 }
      );
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
  const fieldsToTrack = ["status", "reason", "notes"];

  for (const field of fieldsToTrack) {
    if (
      newData[field] !== undefined &&
      oldReturnNote[field] !== newData[field]
    ) {
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
      return NextResponse.json(
        { error: "Return note not found" },
        { status: 404 }
      );
    }

    if (currentReturnNote.isDeleted) {
      return NextResponse.json(
        {
          error: "Cannot update a deleted return note. Please restore it first.",
        },
        { status: 400 }
      );
    }

    const oldStatus = currentReturnNote.status;
    const newStatus = body.status || oldStatus;
    const returnType = currentReturnNote.returnType;

    const changes = detectChanges(currentReturnNote.toObject(), body);

    // ─── Transition: pending/cancelled → approved ──────────────────────────
    if (oldStatus !== "approved" && newStatus === "approved") {

      if (returnType === "purchaseReturn") {
        // 1. Update purchase returned quantities
        const purchase = await Purchase.findById(
          currentReturnNote.connectedDocuments.purchaseId
        );
        if (!purchase || purchase.isDeleted) {
          return NextResponse.json(
            { error: "Associated purchase not found" },
            { status: 404 }
          );
        }

        for (const returnItem of currentReturnNote.items) {
          const purchaseItemIndex = purchase.items.findIndex(
            (pi: any) =>
              (pi.itemId &&
                returnItem.itemId &&
                pi.itemId.toString() === returnItem.itemId.toString()) ||
              pi.description === returnItem.description
          );

          if (purchaseItemIndex !== -1) {
            const currentReturned =
              purchase.items[purchaseItemIndex].returnedQuantity || 0;
            purchase.items[purchaseItemIndex].returnedQuantity =
              currentReturned + returnItem.returnQuantity;
          }
        }

        purchase.addAuditEntry(
          `Return Note ${currentReturnNote.returnNumber} approved`,
          user.id,
          user.username || user.name
        );
        await purchase.save();

        // 2. Deduct stock
        await removeStockForPurchaseReturn(
          currentReturnNote._id,
          currentReturnNote.items.map((item: any) => ({
            itemId: item.itemId?.toString(),
            itemName: item.description,
            returnQuantity: item.returnQuantity,
          })),
          currentReturnNote.returnNumber
        );

        // 3. Create journal
        await createJournalForPurchaseReturn(
          { ...currentReturnNote.toObject(), status: "approved" },
          user.id,
          user.username || user.name
        );

      } else if (returnType === "salesReturn") {
        // 1. Update invoice returned quantities
        const invoice = await Invoice.findById(
          currentReturnNote.connectedDocuments.invoiceId
        );
        if (invoice && !invoice.isDeleted) {
          for (const returnItem of currentReturnNote.items) {
            const invoiceItemIndex = invoice.items.findIndex(
              (ii: any) => ii.description === returnItem.description
            );

            if (invoiceItemIndex !== -1) {
              const currentReturned =
                invoice.items[invoiceItemIndex].returnedQuantity || 0;
              invoice.items[invoiceItemIndex].returnedQuantity =
                currentReturned + returnItem.returnQuantity;
            }
          }
          invoice.addAuditEntry(
            `Sales Return Note ${currentReturnNote.returnNumber} approved`,
            user.id,
            user.username || user.name
          );
          await invoice.save();
        }

        // 2. Restore stock (reverse the deduction that happened on invoice approval)
        try {
          await reverseStockForSalesReturn(
            currentReturnNote._id,
            currentReturnNote.items
          );
        } catch (stockError: any) {
          console.error(`❌ Stock reversal failed:`, stockError);
          return NextResponse.json(
            { error: `Cannot approve sales return: ${stockError.message}` },
            { status: 400 }
          );
        }

        // 3. Create journal
        await createJournalForSalesReturn(
          { ...currentReturnNote.toObject(), status: "approved" },
          user.id,
          user.username || user.name
        );
      }
    }

    // ─── Transition: approved → pending/cancelled ──────────────────────────
    if (oldStatus === "approved" && newStatus !== "approved") {

      // 1. Void journal
      await voidJournalsForReference(
        currentReturnNote._id,
        user.id,
        user.username || user.name,
        `Return note status changed from approved to ${newStatus}`
      );

      if (returnType === "purchaseReturn") {
        // 2. Reverse purchase returned quantities
        const purchase = await Purchase.findById(
          currentReturnNote.connectedDocuments.purchaseId
        );
        if (purchase && !purchase.isDeleted) {
          for (const returnItem of currentReturnNote.items) {
            const purchaseItemIndex = purchase.items.findIndex(
              (pi: any) =>
                (pi.itemId &&
                  returnItem.itemId &&
                  pi.itemId.toString() === returnItem.itemId.toString()) ||
                pi.description === returnItem.description
            );

            if (purchaseItemIndex !== -1) {
              const currentReturned =
                purchase.items[purchaseItemIndex].returnedQuantity || 0;
              purchase.items[purchaseItemIndex].returnedQuantity = Math.max(
                0,
                currentReturned - returnItem.returnQuantity
              );
            }
          }

          purchase.addAuditEntry(
            `Return Note ${currentReturnNote.returnNumber} reversed`,
            user.id,
            user.username || user.name
          );
          await purchase.save();
        }

        // 3. Add stock back
        await addStockForPurchaseReturn(
          currentReturnNote._id,
          currentReturnNote.items.map((item: any) => ({
            itemId: item.itemId?.toString(),
            itemName: item.description,
            returnQuantity: item.returnQuantity,
          })),
          currentReturnNote.returnNumber
        );

      } else if (returnType === "salesReturn") {
        // 2. Reverse invoice returned quantities
        const invoice = await Invoice.findById(
          currentReturnNote.connectedDocuments.invoiceId
        );
        if (invoice && !invoice.isDeleted) {
          for (const returnItem of currentReturnNote.items) {
            const invoiceItemIndex = invoice.items.findIndex(
              (ii: any) => ii.description === returnItem.description
            );

            if (invoiceItemIndex !== -1) {
              const currentReturned =
                invoice.items[invoiceItemIndex].returnedQuantity || 0;
              invoice.items[invoiceItemIndex].returnedQuantity = Math.max(
                0,
                currentReturned - returnItem.returnQuantity
              );
            }
          }
          invoice.addAuditEntry(
            `Sales Return Note ${currentReturnNote.returnNumber} reversed`,
            user.id,
            user.username || user.name
          );
          await invoice.save();
        }

        // 3. Deduct stock again (undo the reversal)
        try {
          await deductStockForInvoice(
            currentReturnNote.connectedDocuments.invoiceId,
            currentReturnNote.items
          );
        } catch (stockError: any) {
          console.error(`❌ Stock deduction failed:`, stockError);
          // Don't fail the status change if stock deduction fails
        }
      } else if (returnType === "posReturn") {
        // 2. Reverse POSSale returned quantities
        const posSale = await POSSale.findById(
          currentReturnNote.connectedDocuments.posSaleId
        );
        if (posSale && !posSale.isDeleted) {
          for (const returnItem of currentReturnNote.items) {
            const posItemIndex = posSale.items.findIndex(
              (pi: any) => pi.itemId?.toString() === returnItem.itemId?.toString()
            );

            if (posItemIndex !== -1) {
              const currentReturned = posSale.items[posItemIndex].returnedQuantity || 0;
              posSale.items[posItemIndex].returnedQuantity = Math.max(
                0,
                currentReturned - returnItem.returnQuantity
              );
            }
          }
          posSale.addAuditEntry(
            `POS Return Note ${currentReturnNote.returnNumber} status changed from approved to ${newStatus}`,
            user.id,
            user.username || user.name
          );
          await posSale.save();
        }

        // 3. Deduct stock again (undo the reversal)
        try {
          await deductStockForInvoice(
            currentReturnNote._id,
            currentReturnNote.items.map((item: any) => ({
              itemId: item.itemId,
              quantity: item.returnQuantity,
            }))
          );
        } catch (stockError: any) {
          console.error(`❌ Stock deduction failed:`, stockError);
        }
      }
    }

    currentReturnNote.addAuditEntry(
      "Updated",
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
    return NextResponse.json(
      { error: "Failed to update return note" },
      { status: 400 }
    );
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
      return NextResponse.json(
        { error: "Return note not found" },
        { status: 404 }
      );
    }

    if (returnNote.isDeleted) {
      return NextResponse.json(
        { error: "Return note is already deleted" },
        { status: 400 }
      );
    }

    const returnType = returnNote.returnType;

    // ─── If approved: reverse everything ──────────────────────────────────
    if (returnNote.status === "approved") {

      // 1. Void journal
      await voidJournalsForReference(
        returnNote._id,
        user.id,
        user.username || user.name,
        "Return note soft deleted"
      );

      if (returnType === "purchaseReturn") {
        // 2. Reverse purchase returned quantities
        const purchase = await Purchase.findById(
          returnNote.connectedDocuments.purchaseId
        );
        if (purchase && !purchase.isDeleted) {
          for (const returnItem of returnNote.items) {
            const purchaseItemIndex = purchase.items.findIndex(
              (pi: any) =>
                (pi.itemId &&
                  returnItem.itemId &&
                  pi.itemId.toString() === returnItem.itemId.toString()) ||
                pi.description === returnItem.description
            );

            if (purchaseItemIndex !== -1) {
              const currentReturned =
                purchase.items[purchaseItemIndex].returnedQuantity || 0;
              purchase.items[purchaseItemIndex].returnedQuantity = Math.max(
                0,
                currentReturned - returnItem.returnQuantity
              );
            }
          }

          const updatedReturnNoteIds = (
            purchase.connectedDocuments?.returnNoteIds || []
          ).filter((rid: any) => rid.toString() !== id);
          purchase.connectedDocuments = {
            ...purchase.connectedDocuments,
            returnNoteIds: updatedReturnNoteIds,
          };

          purchase.addAuditEntry(
            `Return Note ${returnNote.returnNumber} deleted`,
            user.id,
            user.username || user.name
          );
          await purchase.save();
        }

        // 3. Add stock back
        await addStockForPurchaseReturn(
          returnNote._id,
          returnNote.items.map((item: any) => ({
            itemId: item.itemId?.toString(),
            itemName: item.description,
            returnQuantity: item.returnQuantity,
          })),
          returnNote.returnNumber
        );

      } else if (returnType === "salesReturn") {
        // 2. Reverse invoice returned quantities
        const invoice = await Invoice.findById(
          returnNote.connectedDocuments.invoiceId
        );
        if (invoice && !invoice.isDeleted) {
          for (const returnItem of returnNote.items) {
            const invoiceItemIndex = invoice.items.findIndex(
              (ii: any) => ii.description === returnItem.description
            );

            if (invoiceItemIndex !== -1) {
              const currentReturned =
                invoice.items[invoiceItemIndex].returnedQuantity || 0;
              invoice.items[invoiceItemIndex].returnedQuantity = Math.max(
                0,
                currentReturned - returnItem.returnQuantity
              );
            }
          }

          const updatedReturnNoteIds = (
            invoice.connectedDocuments?.returnNoteIds || []
          ).filter((rid: any) => rid.toString() !== id);
          invoice.connectedDocuments = {
            ...invoice.connectedDocuments,
            returnNoteIds: updatedReturnNoteIds,
          };

          invoice.addAuditEntry(
            `Sales Return Note ${returnNote.returnNumber} deleted`,
            user.id,
            user.username || user.name
          );
          await invoice.save();

          // 3. Deduct stock again (undo the reversal)
          try {
            await deductStockForInvoice(
              returnNote._id,
              returnNote.items.map((item: any) => ({
                itemId: item.itemId,
                quantity: item.returnQuantity,
              }))
            );
            console.log(
              `✅ Stock deducted for deleted sales return ${returnNote.returnNumber}`
            );
          } catch (stockError: any) {
            console.error(`❌ Stock deduction failed:`, stockError);
          }
        }
      } else if (returnType === "posReturn") {
        // 2. Reverse POSSale returned quantities
        const posSale = await POSSale.findById(
          returnNote.connectedDocuments.posSaleId
        );
        if (posSale && !posSale.isDeleted) {
          for (const returnItem of returnNote.items) {
            const posItemIndex = posSale.items.findIndex(
              (pi: any) => pi.itemId?.toString() === returnItem.itemId?.toString()
            );

            if (posItemIndex !== -1) {
              const currentReturned = posSale.items[posItemIndex].returnedQuantity || 0;
              posSale.items[posItemIndex].returnedQuantity = Math.max(
                0,
                currentReturned - returnItem.returnQuantity
              );
            }
          }

          const updatedReturnNoteIds = (
            posSale.connectedDocuments?.returnNoteIds || []
          ).filter((rid: any) => rid.toString() !== id);
          posSale.connectedDocuments = {
            ...posSale.connectedDocuments,
            returnNoteIds: updatedReturnNoteIds,
          };

          posSale.addAuditEntry(
            `POS Return Note ${returnNote.returnNumber} deleted`,
            user.id,
            user.username || user.name
          );
          await posSale.save();

          // 3. Deduct stock again (undo the reversal)
          try {
            await deductStockForInvoice(
              returnNote._id,
              returnNote.items.map((item: any) => ({
                itemId: item.itemId,
                quantity: item.returnQuantity,
              }))
            );
          } catch (stockError: any) {
            console.error(`❌ Stock deduction failed:`, stockError);
          }
        }
      }

    } else {
      // ─── Not approved: just unlink from connected documents ─────────────
      if (returnType === "purchaseReturn") {
        const purchase = await Purchase.findById(
          returnNote.connectedDocuments.purchaseId
        );
        if (purchase && !purchase.isDeleted) {
          const updatedReturnNoteIds = (
            purchase.connectedDocuments?.returnNoteIds || []
          ).filter((rid: any) => rid.toString() !== id);

          purchase.connectedDocuments = {
            ...purchase.connectedDocuments,
            returnNoteIds: updatedReturnNoteIds,
          };

          purchase.addAuditEntry(
            `Return Note ${returnNote.returnNumber} deleted`,
            user.id,
            user.username || user.name
          );
          await purchase.save();
        }
      } else if (returnType === "salesReturn") {
        const invoice = await Invoice.findById(
          returnNote.connectedDocuments.invoiceId
        );
        if (invoice && !invoice.isDeleted) {
          const updatedReturnNoteIds = (
            invoice.connectedDocuments?.returnNoteIds || []
          ).filter((rid: any) => rid.toString() !== id);

          invoice.connectedDocuments = {
            ...invoice.connectedDocuments,
            returnNoteIds: updatedReturnNoteIds,
          };

          invoice.addAuditEntry(
            `Sales Return Note ${returnNote.returnNumber} deleted`,
            user.id,
            user.username || user.name
          );
          await invoice.save();
        }
      } else if (returnType === "posReturn") {
        const posSale = await POSSale.findById(
          returnNote.connectedDocuments.posSaleId
        );
        if (posSale && !posSale.isDeleted) {
          const updatedReturnNoteIds = (
            posSale.connectedDocuments?.returnNoteIds || []
          ).filter((rid: any) => rid.toString() !== id);

          posSale.connectedDocuments = {
            ...posSale.connectedDocuments,
            returnNoteIds: updatedReturnNoteIds,
          };

          posSale.addAuditEntry(
            `POS Return Note ${returnNote.returnNumber} deleted`,
            user.id,
            user.username || user.name
          );
          await posSale.save();
        }
      }
    }

    returnNote.addAuditEntry(
      "Soft Deleted",
      user.id,
      user.username || user.name
    );
    await returnNote.save();

    const deletedReturnNote = await softDelete(
      ReturnNote,
      id,
      user.id,
      user.username || user.name
    );

    console.log(
      `✅ Successfully soft deleted ${returnType} return note ${returnNote.returnNumber}`
    );

    return NextResponse.json({
      message: "Return note soft deleted successfully",
      returnNote: deletedReturnNote,
    });
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to delete return note ${params.id}:`, error);
    return NextResponse.json(
      {
        error: "Server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}