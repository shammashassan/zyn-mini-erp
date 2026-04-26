// app/api/return-notes/trash/restore/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import ReturnNote from "@/models/ReturnNote";
import Purchase from "@/models/Purchase";
import Invoice from "@/models/Invoice";
import POSSale from "@/models/POSSale";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";
import {
  reverseStockForSalesReturn,
  removeStockForPurchaseReturn,
} from "@/utils/inventoryManager";
import {
  createJournalForSalesReturn,
  createJournalForPurchaseReturn,
  createJournalForPOSReturn,
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
            const purchaseItem = purchase.items.find(
              (pi: any) =>
                (pi.itemId &&
                  returnItem.itemId &&
                  pi.itemId.toString() === returnItem.itemId.toString()) ||
                pi.description === returnItem.description
            );

            if (purchaseItem) {
              const currentReturned = purchaseItem.returnedQuantity || 0;
              const originalQty = purchaseItem.quantity;

              if (currentReturned + returnItem.returnQuantity > originalQty) {
                return NextResponse.json(
                  {
                    error: `Cannot restore: Item ${purchaseItem.description} already has ${currentReturned} returned out of ${originalQty} purchased. Restoring this would exceed the original quantity.`,
                  },
                  { status: 400 }
                );
              }
              purchaseItem.returnedQuantity = currentReturned + returnItem.returnQuantity;
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
            const invoiceItem = invoice.items.find(
              (ii: any) =>
                (ii.itemId &&
                  returnItem.itemId &&
                  ii.itemId.toString() === returnItem.itemId.toString()) ||
                ii.description === returnItem.description
            );

            if (invoiceItem) {
              const currentReturned = invoiceItem.returnedQuantity || 0;
              const originalQty = invoiceItem.quantity;

              if (currentReturned + returnItem.returnQuantity > originalQty) {
                return NextResponse.json(
                  {
                    error: `Cannot restore: Item ${invoiceItem.description} already has ${currentReturned} returned out of ${originalQty} sold. Restoring this would exceed the original quantity.`,
                  },
                  { status: 400 }
                );
              }
              invoiceItem.returnedQuantity = currentReturned + returnItem.returnQuantity;
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
      } else if (returnType === "posReturn") {
        const posSale = await POSSale.findById(
          returnNoteToRestore.connectedDocuments.posSaleId
        );
        if (posSale && !posSale.isDeleted) {
          // Restore POSSale returned quantities
          for (const returnItem of returnNoteToRestore.items) {
            const posItem = posSale.items.find(
              (pi: any) => pi.itemId?.toString() === returnItem.itemId?.toString()
            );

            if (posItem) {
              const currentReturned = posItem.returnedQuantity || 0;
              const originalSold = posItem.quantity;

              if (currentReturned + returnItem.returnQuantity > originalSold) {
                return NextResponse.json(
                  {
                    error: `Cannot restore: Item ${posItem.description} already has ${currentReturned} returned out of ${originalSold} sold. Restoring this would exceed the sold quantity.`,
                  },
                  { status: 400 }
                );
              }
              posItem.returnedQuantity = currentReturned + returnItem.returnQuantity;
            }
          }

          // Re-add return note ID to posSale
          const currentReturnNoteIds =
            posSale.connectedDocuments?.returnNoteIds || [];
          if (
            !currentReturnNoteIds.some(
              (rid: any) => rid.toString() === id
            )
          ) {
            currentReturnNoteIds.push(id);
            posSale.connectedDocuments = {
              ...posSale.connectedDocuments,
              returnNoteIds: currentReturnNoteIds,
            };
          }

          posSale.addAuditEntry(
            `POS Return Note ${returnNoteToRestore.returnNumber} restored`,
            user.id,
            user.username || user.name
          );
          await posSale.save();
        }

        // Add stock back (restore the reversal)
        try {
          await reverseStockForSalesReturn(
            returnNoteToRestore._id,
            returnNoteToRestore.items
          );
        } catch (stockError: any) {
          console.error(`❌ Stock restoration failed:`, stockError);
          return NextResponse.json(
            {
              error: `Cannot restore POS return: ${stockError.message}`,
            },
            { status: 400 }
          );
        }

        // Recreate journal
        await createJournalForPOSReturn(
          returnNoteToRestore.toObject(),
          posSale?.paymentMethod || 'Cash',
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
      } else if (returnType === "posReturn") {
        const posSale = await POSSale.findById(
          returnNoteToRestore.connectedDocuments.posSaleId
        );
        if (posSale && !posSale.isDeleted) {
          const currentReturnNoteIds =
            posSale.connectedDocuments?.returnNoteIds || [];
          if (
            !currentReturnNoteIds.some(
              (rid: any) => rid.toString() === id
            )
          ) {
            currentReturnNoteIds.push(id);
            posSale.connectedDocuments = {
              ...posSale.connectedDocuments,
              returnNoteIds: currentReturnNoteIds,
            };
          }

          posSale.addAuditEntry(
            `POS Return Note ${returnNoteToRestore.returnNumber} restored`,
            user.id,
            user.username || user.name
          );
          await posSale.save();
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