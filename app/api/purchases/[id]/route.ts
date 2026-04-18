// app/api/purchases/[id]/route.ts - FIXED: Proper partyId and contactId population in GET

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Purchase from "@/models/Purchase";
import Item from "@/models/Item";
import StockAdjustment from "@/models/StockAdjustment";
import Voucher from "@/models/Voucher";
import ReturnNote from "@/models/ReturnNote";
import Party from "@/models/Party";
import { softDelete } from "@/utils/softDelete";
import { getUserInfo } from "@/lib/auth-helpers";
import { handlePurchaseStatusChange } from '@/utils/journalAutoCreate';
import { voidJournalsForReference } from '@/utils/journalManager';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { createPartySnapshot } from "@/utils/partySnapshot";
import { addStockForPurchase, removeStockForPurchase } from "@/utils/inventoryManager";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

/**
 * GET - Fetch a single purchase by ID
 * ✅ FIXED: Added partyId and contactId population
 */
export async function GET(request: Request, context: RequestContext) {
  try {
    const { error } = await requireAuthAndPermission({
      purchase: ["read"],
    });

    if (error) return error;

    await dbConnect();

    const _ensureModels = [Purchase, Item, StockAdjustment, Voucher, ReturnNote, Party];
    const { id } = await context.params;

    const includeDeleted = request.headers.get('X-Include-Deleted') === 'true';

    // ✅ FIXED: Added partyId and contactId population
    const purchaseQuery = Purchase.findById(id)
      .populate({
        path: 'partyId',
        select: 'name company type roles email phone address city district state country postalCode vatNumber'
      })
      .populate({
        path: 'contactId',
        select: 'name phone email designation'
      })
      .populate({
        path: 'connectedDocuments.paymentIds',
        model: 'Voucher',
        select: 'invoiceNumber grandTotal voucherType',
        match: { isDeleted: false }
      })
      .populate({
        path: 'connectedDocuments.returnNoteIds',
        model: 'ReturnNote',
        select: 'returnNumber status',
        match: { isDeleted: false }
      });

    if (includeDeleted) {
      purchaseQuery.setOptions({ includeDeleted: true });
    }

    const purchase = await purchaseQuery;

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (purchase.isDeleted && !includeDeleted) {
      return NextResponse.json({
        error: "This purchase has been deleted"
      }, { status: 410 });
    }

    return NextResponse.json(purchase);
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to fetch purchase ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * Helper function to detect changes
 */
function detectChanges(oldPurchase: any, newData: any) {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
  const fieldsToTrack = [
    'purchaseStatus',
    'inventoryStatus',
    'paymentStatus',
    'totalAmount',
    'discount',
    'paidAmount',
    'date',
    'purchaseDate'
  ];

  for (const field of fieldsToTrack) {
    if (newData[field] !== undefined && oldPurchase[field] !== newData[field]) {
      changes.push({
        field,
        oldValue: oldPurchase[field],
        newValue: newData[field],
      });
    }
  }

  // Check if items changed
  if (newData.items) {
    const oldItemsStr = JSON.stringify(oldPurchase.items.map((i: any) => ({
      itemId: i.itemId,
      quantity: i.quantity,
      unitCost: i.unitCost
    })));
    const newItemsStr = JSON.stringify(newData.items.map((i: any) => ({
      itemId: i.itemId,
      quantity: i.quantity,
      unitCost: i.unitCost
    })));

    if (oldItemsStr !== newItemsStr) {
      changes.push({
        field: 'items',
        oldValue: `${oldPurchase.items.length} item(s)`,
        newValue: `${newData.items.length} item(s)`,
      });
    }
  }

  return changes;
}

/**
 * Helper to check if items have structurally changed
 */
function haveItemsChanged(oldItems: any[], newItems: any[]) {
  if (oldItems.length !== newItems.length) {
    return true;
  }

  for (let i = 0; i < oldItems.length; i++) {
    const oldItem = oldItems[i];
    const newItem = newItems.find((item: any) => item.itemId === oldItem.itemId);

    if (!newItem) {
      return true;
    }
    if (oldItem.quantity !== newItem.quantity) {
      return true;
    }
    if (oldItem.unitCost !== newItem.unitCost) {
      return true;
    }
    // Check receivedQuantity changes
    if ((oldItem.receivedQuantity || 0) !== (newItem.receivedQuantity || 0)) {
      return true;
    }
  }

  return false;
}

/**
 * Helper to get actual received quantity for an item
 */
function getReceivedQuantity(item: any, inventoryStatus: string): number {
  if (inventoryStatus === 'received') {
    return item.quantity;
  } else if (inventoryStatus === 'partially received') {
    return item.receivedQuantity || 0;
  }
  return 0;
}

/**
 * Process item changes when editing purchases with inventory status
 */
async function processItemChanges(
  oldItems: any[],
  newItems: any[],
  purchaseRef: string,
  oldInventoryStatus: string
) {

  const oldItemsMap = new Map(oldItems.map(item => [item.itemId, item]));
  const newItemsMap = new Map(newItems.map(item => [item.itemId, item]));

  const allItemIds = new Set([...oldItemsMap.keys(), ...newItemsMap.keys()]);

  for (const itemId of allItemIds) {
    const oldItem = oldItemsMap.get(itemId);
    const newItem = newItemsMap.get(itemId);

    // CASE 1: NEW ITEM ADDED
    if (!oldItem && newItem) {
      continue;
    }

    // CASE 2: ITEM REMOVED
    if (oldItem && !newItem) {
      const oldReceivedQty = getReceivedQuantity(oldItem, oldInventoryStatus);

      if (oldReceivedQty > 0) {
        const dbItem = await Item.findById(itemId);
        if (dbItem) {
          const oldStock = dbItem.stock || 0;
          const newStock = oldStock - oldReceivedQty;

          await Item.findByIdAndUpdate(itemId, { stock: newStock });

          const newAdjustment = new StockAdjustment({
            itemId,
            itemName: oldItem.description,
            adjustmentType: 'decrement',
            value: oldReceivedQty,
            oldStock,
            newStock,
            oldCostPrice: dbItem.rate,
            newCostPrice: dbItem.rate,
            adjustmentReason: `Purchase ${purchaseRef} - item removed (${oldReceivedQty} units were received)`,
            referenceModel: 'Purchase',
            createdAt: new Date(),
          });

          await newAdjustment.save();
        }
      }
      continue;
    }

    // CASE 3: ORDERED QUANTITY CHANGED
    if (oldItem && newItem && oldItem.quantity !== newItem.quantity) {
      const oldReceivedQty = getReceivedQuantity(oldItem, oldInventoryStatus);

      // If new ordered < old received, cap received at new ordered
      if (newItem.quantity < oldReceivedQty) {
        const excessQty = oldReceivedQty - newItem.quantity;

        const dbItem = await Item.findById(itemId);
        if (dbItem) {
          const oldStock = dbItem.stock || 0;
          const newStock = oldStock - excessQty;

          await Item.findByIdAndUpdate(itemId, { stock: newStock });

          const newAdjustment = new StockAdjustment({
            itemId,
            itemName: newItem.description,
            adjustmentType: 'decrement',
            value: excessQty,
            oldStock,
            newStock,
            oldCostPrice: dbItem.rate,
            newCostPrice: dbItem.rate,
            adjustmentReason: `Purchase ${purchaseRef} - ordered quantity reduced (received: ${oldReceivedQty} → ${newItem.quantity})`,
            referenceModel: 'Purchase',
            createdAt: new Date(),
          });

          await newAdjustment.save();
        }

        newItem.receivedQuantity = newItem.quantity;
      } else {
        newItem.receivedQuantity = oldReceivedQty;
      }
    } else if (oldItem && newItem) {
      const oldReceivedQty = getReceivedQuantity(oldItem, oldInventoryStatus);
      newItem.receivedQuantity = oldReceivedQty;
    }
  }

  return newItems;
}

function determineInventoryStatusAfterEdit(items: any[], oldInventoryStatus: string): string {
  const hasNewItems = items.some(item => !item.receivedQuantity || item.receivedQuantity === 0);

  if (hasNewItems) {
    return 'partially received';
  }

  const allFullyReceived = items.every(item => {
    const received = item.receivedQuantity || 0;
    return received >= item.quantity;
  });

  if (allFullyReceived) {
    return 'received';
  }

  return 'partially received';
}

/**
 * PUT - Update a purchase
 * ✅ FIXED: Added snapshot updates when party/contact changes
 */
export async function PUT(request: Request, context: RequestContext) {
  try {
    const { error } = await requireAuthAndPermission({
      purchase: ["update"],
    });

    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();
    const user = await getUserInfo();

    const currentPurchase = await Purchase.findById(id);
    if (!currentPurchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (currentPurchase.isDeleted) {
      return NextResponse.json({
        error: "Cannot update a deleted purchase. Please restore it first."
      }, { status: 400 });
    }

    // ✅ FIXED: Handle party/contact changes - update snapshots
    if (body.partyId && body.partyId !== currentPurchase.partyId.toString()) {

      const { partySnapshot, contactSnapshot } = await createPartySnapshot(
        body.partyId,
        body.contactId
      );

      body.partySnapshot = partySnapshot;
      body.contactSnapshot = contactSnapshot;
    }
    // ✅ If only contact changed (same party)
    else if (body.contactId && body.contactId !== currentPurchase.contactId?.toString()) {

      const { contactSnapshot } = await createPartySnapshot(
        currentPurchase.partyId.toString(),
        body.contactId
      );

      body.contactSnapshot = contactSnapshot;
    }

    const oldPurchaseStatus = currentPurchase.purchaseStatus;
    const oldInventoryStatus = currentPurchase.inventoryStatus;
    const oldPaymentStatus = currentPurchase.paymentStatus;

    const newPurchaseStatus = body.purchaseStatus || oldPurchaseStatus;
    const newInventoryStatus = body.inventoryStatus || oldInventoryStatus;

    const itemsChanged = body.items && haveItemsChanged(currentPurchase.items, body.items);

    // SCENARIO 1: Editing items while inventory status is received or partially received
    // Only run if items were structurally changed (added/removed/qty/cost changed)
    // BUT NOT if only receivedQuantity changed (that's handled by SCENARIO 1.5)
    const structuralItemChanges = itemsChanged && body.items && (
      currentPurchase.items.length !== body.items.length ||
      currentPurchase.items.some((oldItem: any) => {
        const newItem = body.items.find((ni: any) => ni.itemId === oldItem.itemId);
        if (!newItem) return true; // Item removed
        return oldItem.quantity !== newItem.quantity || oldItem.unitCost !== newItem.unitCost;
      })
    );

    if ((oldInventoryStatus === 'received' || oldInventoryStatus === 'partially received') && structuralItemChanges) {

      // 1. Void existing journal if inventory status was received
      if (oldInventoryStatus === 'received') {
        await voidJournalsForReference(
          currentPurchase._id,
          user.id,
          user.username,
          'Purchase edited - voiding old journal'
        );
      }

      // 2. Process item changes
      const updatedItems = await processItemChanges(
        currentPurchase.items,
        body.items,
        currentPurchase.referenceNumber,
        oldInventoryStatus
      );

      body.items = updatedItems;

      // 3. Determine new inventory status
      const newDeterminedInventoryStatus = determineInventoryStatusAfterEdit(updatedItems, oldInventoryStatus);
      body.inventoryStatus = newDeterminedInventoryStatus;
    }

    // SCENARIO 1.5: Received quantity edits when status unchanged
    // When status is already received/partially received and items were edited,
    // check if receivedQuantity changed and adjust stock accordingly
    if ((oldInventoryStatus === 'received' || oldInventoryStatus === 'partially received') &&
      (newInventoryStatus === oldInventoryStatus) &&
      itemsChanged) {

      const itemsToAdjust: Array<{ itemId: string; itemName: string; quantity: number }> = [];

      for (const newItem of body.items) {
        const oldItem = currentPurchase.items.find((i: any) => i.itemId === newItem.itemId);
        if (!oldItem) continue; // New items are handled by processItemChanges

        const oldReceivedQty = getReceivedQuantity(oldItem, oldInventoryStatus);
        const newReceivedQty = getReceivedQuantity(newItem, newInventoryStatus);
        const qtyDifference = newReceivedQty - oldReceivedQty;

        if (qtyDifference !== 0) {
          itemsToAdjust.push({
            itemId: newItem.itemId,
            itemName: newItem.description,
            quantity: Math.abs(qtyDifference)
          });

        }
      }

      // Apply stock adjustments
      if (itemsToAdjust.length > 0) {
        for (const item of itemsToAdjust) {
          const newItem = body.items.find((i: any) => i.itemId === item.itemId);
          const oldItem = currentPurchase.items.find((i: any) => i.itemId === item.itemId);

          const oldReceivedQty = getReceivedQuantity(oldItem, oldInventoryStatus);
          const newReceivedQty = getReceivedQuantity(newItem, newInventoryStatus);
          const qtyDifference = newReceivedQty - oldReceivedQty;

          if (qtyDifference > 0) {
            // Increase stock
            await addStockForPurchase(
              currentPurchase._id,
              [item],
              `Purchase received quantity increased (${oldReceivedQty} → ${newReceivedQty})`
            );
          } else if (qtyDifference < 0) {
            // Decrease stock
            await removeStockForPurchase(
              currentPurchase._id,
              [item],
              `Purchase received quantity decreased (${oldReceivedQty} → ${newReceivedQty})`
            );
          }
        }
      }
    }

    // SCENARIO 2: Inventory status change
    if (oldInventoryStatus !== newInventoryStatus) {

      // TO Received
      if (newInventoryStatus === 'received' && oldInventoryStatus !== 'received') {
        // CRITICAL: Use currentPurchase.items to get OLD receivedQuantity values
        // body.items has NEW values which would make previouslyReceived wrong!
        const itemsToUse = currentPurchase.items;

        const itemsWithQty = itemsToUse
          .map((item: any) => {
            const previouslyReceived = getReceivedQuantity(item, oldInventoryStatus);
            const remainingToAdd = item.quantity - previouslyReceived;

            return {
              itemId: item.itemId,
              itemName: item.description,
              quantity: remainingToAdd
            };
          })
          .filter((item: any) => {
            const willAdd = item.quantity > 0;
            return willAdd;
          });

        if (itemsWithQty.length > 0) {
          await addStockForPurchase(
            currentPurchase._id,
            itemsWithQty,
            'Purchase fully received'
          );
        }
      }

      // TO Partially Received
      if (newInventoryStatus === 'partially received') {
        const itemsWithReceived = body.items || currentPurchase.items;
        for (const item of itemsWithReceived) {
          const newReceivedQty = item.receivedQuantity || 0;
          const oldReceivedQty = getReceivedQuantity(
            currentPurchase.items.find((i: any) => i.itemId === item.itemId),
            oldInventoryStatus
          );
          const qtyDifference = newReceivedQty - oldReceivedQty;

          if (qtyDifference !== 0) {
            const dbItem = await Item.findById(item.itemId);
            if (dbItem) {
              const oldStock = dbItem.stock || 0;
              const newStock = oldStock + qtyDifference;
              await Item.findByIdAndUpdate(item.itemId, { stock: newStock });

              const adjustmentType = qtyDifference > 0 ? 'increment' : 'decrement';
              const adjustmentValue = Math.abs(qtyDifference);

              const newAdjustment = new StockAdjustment({
                itemId: item.itemId,
                itemName: item.description,
                adjustmentType,
                value: adjustmentValue,
                oldStock,
                newStock,
                oldCostPrice: dbItem.rate,
                newCostPrice: dbItem.rate,
                adjustmentReason: `Purchase received quantity adjusted`,
                referenceModel: 'Purchase',
                createdAt: new Date(),
              });
              await newAdjustment.save();
            }
          }
        }
      }

      // FROM Received/Partially Received TO Pending
      if ((oldInventoryStatus === 'received' || oldInventoryStatus === 'partially received') &&
        newInventoryStatus === 'pending') {

        const itemsWithQty = currentPurchase.items
          .map((item: any) => {
            const qtyToRemove = getReceivedQuantity(item, oldInventoryStatus);

            return {
              itemId: item.itemId,
              itemName: item.description,
              quantity: qtyToRemove
            };
          })
          .filter((item: any) => {
            const willRemove = item.quantity > 0;
            return willRemove;
          });

        if (itemsWithQty.length > 0) {
          await removeStockForPurchase(
            currentPurchase._id,
            itemsWithQty,
            `Inventory status changed to ${newInventoryStatus}`
          );
        }
      }
    }

    // Detect changes for manual audit entry
    const changes = detectChanges(currentPurchase.toObject(), body);

    // Only add manual "Updated" entry if there are explicit changes
    if (changes.length > 0) {
      currentPurchase.addAuditEntry(
        'Updated',
        user.id,
        user.username,
        changes
      );
    }

    const updateData = { ...body };

    // Recalculate amounts if items or discount changed
    if (body.items || body.discount !== undefined) {
      const itemsToUse = body.items || currentPurchase.items;
      const grossTotal = itemsToUse.reduce((sum: number, item: any) => sum + (Number(item.total) || 0), 0);
      const discount = body.discount !== undefined ? Number(body.discount) || 0 : (currentPurchase.discount || 0);
      const subtotal = grossTotal - discount;
      const vatAmount = body.vatAmount !== undefined ? Number(body.vatAmount) || 0 : (currentPurchase.vatAmount || 0);
      const grandTotal = subtotal + vatAmount;

      updateData.totalAmount = grossTotal;
      updateData.discount = discount;
      updateData.vatAmount = vatAmount;
      updateData.grandTotal = grandTotal;
      updateData.remainingAmount = grandTotal - (currentPurchase.paidAmount || 0);
    }

    if (body.items) {
      updateData.items = body.items;
    }

    // Handle purchaseDate update
    if (body.purchaseDate) {
      updateData.purchaseDate = new Date(body.purchaseDate);
      updateData.date = updateData.purchaseDate;
    } else if (body.date) {
      updateData.date = new Date(body.date);
      updateData.purchaseDate = updateData.date;
    }

    currentPurchase.set({
      ...updateData,
      updatedBy: user.id,
    });

    await currentPurchase.save();

    // Handle journal for purchase status changes
    if (oldPurchaseStatus !== newPurchaseStatus) {
      await handlePurchaseStatusChange(
        currentPurchase.toObject(),
        oldPurchaseStatus,
        newPurchaseStatus,
        user.id,
        user.username || user.name
      );
    }

    return NextResponse.json(currentPurchase);
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to update purchase ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update purchase" }, { status: 400 });
  }
}

/**
 * DELETE - Soft delete
 */
export async function DELETE(request: Request, context: RequestContext) {
  try {
    const { error } = await requireAuthAndPermission({
      purchase: ["soft_delete"],
    });

    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    const user = await getUserInfo();

    const purchaseToDelete = await Purchase.findById(id);
    if (!purchaseToDelete) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (purchaseToDelete.isDeleted) {
      return NextResponse.json({
        error: "Purchase is already deleted"
      }, { status: 400 });
    }

    // Void journals
    await voidJournalsForReference(
      purchaseToDelete._id,
      user.id,
      user.username,
      'Purchase soft deleted'
    );

    // Revert stock based on inventory status
    if (purchaseToDelete.inventoryStatus === 'received' || purchaseToDelete.inventoryStatus === 'partially received') {
      for (const item of purchaseToDelete.items) {
        const qtyToRemove = getReceivedQuantity(item, purchaseToDelete.inventoryStatus);
        if (qtyToRemove > 0) {
          const dbItem = await Item.findById(item.itemId);
          if (dbItem) {
            const oldStock = dbItem.stock || 0;
            const newStock = oldStock - qtyToRemove;

            await Item.findByIdAndUpdate(item.itemId, { stock: newStock });

            await new StockAdjustment({
              itemId: item.itemId,
              itemName: item.description,
              adjustmentType: 'decrement',
              value: qtyToRemove,
              oldStock,
              newStock,
              oldCostPrice: dbItem.rate,
              newCostPrice: dbItem.rate,
              adjustmentReason: `Purchase soft deleted`,
              referenceModel: 'Purchase',
              referenceId: purchaseToDelete._id,
              createdAt: new Date(),
            }).save();
          }
        }
      }
    }

    const deletedPurchase = await softDelete(Purchase, id, user.id, user.username);

    return NextResponse.json({
      message: "Purchase soft deleted successfully",
      purchase: deletedPurchase
    });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}