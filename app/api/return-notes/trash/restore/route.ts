// app/api/return-notes/trash/restore/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReturnNote from "@/models/ReturnNote";
import Purchase from "@/models/Purchase";
import Invoice from "@/models/Invoice";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";
import {
  reverseStockForSalesReturn,
  removeStockForPurchaseReturn,
} from "@/utils/inventoryManager";
import {
  createJournalForSalesReturn,
  createJournalForPurchaseReturn,
} from "@/utils/journalAutoCreate";

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

    const returnNoteToRestore = await ReturnNote.findById(id).setOptions({
      includeDeleted: true,
    });

    if (!returnNoteToRestore) {
      return NextResponse.json(
        { error: "Return note not found" },
        { status: 404 }
      );
    }

    if (!returnNoteToRestore.isDeleted) {
      return NextResponse.json(
        { error: "Return note is not deleted" },
        { status: 400 }
      );
    }

    const returnType = returnNoteToRestore.returnType;

    console.log(
      `♻️ Restoring ${returnType} return note ${returnNoteToRestore.returnNumber}...`
    );

    // ─── If it was approved: restore stock + create journal ────────────────
    if (returnNoteToRestore.status === "approved") {

      if (returnType === "purchaseReturn") {
        const purchase = await Purchase.findById(
          returnNoteToRestore.connectedDocuments.purchaseId
        );
        if (purchase && !purchase.isDeleted) {
          // Restore purchase item returned quantities
          for (const returnItem of returnNoteToRestore.items) {
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

          // Re-add return note ID to purchase
          const currentReturnNoteIds =
            purchase.connectedDocuments?.returnNoteIds || [];
          if (
            !currentReturnNoteIds.some(
              (rid: any) => rid.toString() === id
            )
          ) {
            currentReturnNoteIds.push(id);
            purchase.connectedDocuments = {
              ...purchase.connectedDocuments,
              returnNoteIds: currentReturnNoteIds,
            };
          }

          purchase.addAuditEntry(
            `Return Note ${returnNoteToRestore.returnNumber} restored`,
            user.id,
            user.username || user.name
          );
          await purchase.save();
        }

        // Deduct stock again (items going back to supplier)
        await removeStockForPurchaseReturn(
          returnNoteToRestore._id,
          returnNoteToRestore.items.map((item: any) => ({
            itemId: item.itemId?.toString(),
            itemName: item.description,
            returnQuantity: item.returnQuantity,
          })),
          returnNoteToRestore.returnNumber
        );

        // Recreate journal
        await createJournalForPurchaseReturn(
          returnNoteToRestore.toObject(),
          user.id,
          user.username || user.name
        );

      } else if (returnType === "salesReturn") {
        const invoice = await Invoice.findById(
          returnNoteToRestore.connectedDocuments.invoiceId
        );
        if (invoice && !invoice.isDeleted) {
          // Restore invoice returned quantities
          for (const returnItem of returnNoteToRestore.items) {
            const invoiceItemIndex = invoice.items.findIndex(
              (ii: any) =>
                (ii.itemId &&
                  returnItem.itemId &&
                  ii.itemId.toString() === returnItem.itemId.toString()) ||
                ii.description === returnItem.description
            );

            if (invoiceItemIndex !== -1) {
              const currentReturned =
                invoice.items[invoiceItemIndex].returnedQuantity || 0;
              invoice.items[invoiceItemIndex].returnedQuantity =
                currentReturned + returnItem.returnQuantity;
            }
          }

          // Re-add return note ID to invoice
          const currentReturnNoteIds =
            invoice.connectedDocuments?.returnNoteIds || [];
          if (
            !currentReturnNoteIds.some(
              (rid: any) => rid.toString() === id
            )
          ) {
            currentReturnNoteIds.push(id);
            invoice.connectedDocuments = {
              ...invoice.connectedDocuments,
              returnNoteIds: currentReturnNoteIds,
            };
          }

          invoice.addAuditEntry(
            `Sales Return Note ${returnNoteToRestore.returnNumber} restored`,
            user.id,
            user.username || user.name
          );
          await invoice.save();

          // Add stock back (reverse the deduction)
          try {
            await reverseStockForSalesReturn(
              returnNoteToRestore._id,
              returnNoteToRestore.items
            );
            console.log(
              `✅ Stock restored for sales return ${returnNoteToRestore.returnNumber}`
            );
          } catch (stockError: any) {
            console.error(`❌ Stock restoration failed:`, stockError);
            return NextResponse.json(
              {
                error: `Cannot restore sales return: ${stockError.message}`,
              },
              { status: 400 }
            );
          }
        }

        // Recreate journal
        await createJournalForSalesReturn(
          returnNoteToRestore.toObject(),
          user.id,
          user.username || user.name
        );
      }

    } else {
      // ─── Not approved: just re-link to connected documents ──────────────
      if (returnType === "purchaseReturn") {
        const purchase = await Purchase.findById(
          returnNoteToRestore.connectedDocuments.purchaseId
        );
        if (purchase && !purchase.isDeleted) {
          const currentReturnNoteIds =
            purchase.connectedDocuments?.returnNoteIds || [];
          if (
            !currentReturnNoteIds.some(
              (rid: any) => rid.toString() === id
            )
          ) {
            currentReturnNoteIds.push(id);
            purchase.connectedDocuments = {
              ...purchase.connectedDocuments,
              returnNoteIds: currentReturnNoteIds,
            };
          }

          purchase.addAuditEntry(
            `Return Note ${returnNoteToRestore.returnNumber} restored`,
            user.id,
            user.username || user.name
          );
          await purchase.save();
        }
      } else if (returnType === "salesReturn") {
        const invoice = await Invoice.findById(
          returnNoteToRestore.connectedDocuments.invoiceId
        );
        if (invoice && !invoice.isDeleted) {
          const currentReturnNoteIds =
            invoice.connectedDocuments?.returnNoteIds || [];
          if (
            !currentReturnNoteIds.some(
              (rid: any) => rid.toString() === id
            )
          ) {
            currentReturnNoteIds.push(id);
            invoice.connectedDocuments = {
              ...invoice.connectedDocuments,
              returnNoteIds: currentReturnNoteIds,
            };
          }

          invoice.addAuditEntry(
            `Sales Return Note ${returnNoteToRestore.returnNumber} restored`,
            user.id,
            user.username || user.name
          );
          await invoice.save();
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
      return NextResponse.json(
        { error: "Return note not found" },
        { status: 404 }
      );
    }

    console.log(
      `✅ ${returnType} return note restored: ${restoredReturnNote.returnNumber}`
    );

    return NextResponse.json({
      message: "Return note restored successfully",
      returnNote: restoredReturnNote,
    });
  } catch (error) {
    console.error("Failed to restore return note:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}