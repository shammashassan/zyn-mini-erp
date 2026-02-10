// app/api/purchases/[id]/route.ts - FIXED: Proper partyId and contactId population in GET

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Purchase from "@/models/Purchase";
import Material from "@/models/Material";
import StockAdjustment from "@/models/StockAdjustment";
import Voucher from "@/models/Voucher";
import ReturnNote from "@/models/ReturnNote";
import Party from "@/models/Party";
import { softDelete } from "@/utils/softDelete";
import { getUserInfo } from "@/lib/auth-helpers";
import { createJournalForPurchase } from '@/utils/journalAutoCreate';
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

    const _ensureModels = [Purchase, Material, StockAdjustment, Voucher, ReturnNote, Party];
    const { id } = await context.params;

    // ✅ FIXED: Added partyId and contactId population
    const purchase = await Purchase.findById(id)
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

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
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
      materialId: i.materialId,
      quantity: i.quantity,
      unitCost: i.unitCost
    })));
    const newItemsStr = JSON.stringify(newData.items.map((i: any) => ({
      materialId: i.materialId,
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
    const newItem = newItems.find((item: any) => item.materialId === oldItem.materialId);

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

  const oldItemsMap = new Map(oldItems.map(item => [item.materialId, item]));
  const newItemsMap = new Map(newItems.map(item => [item.materialId, item]));

  const allMaterialIds = new Set([...oldItemsMap.keys(), ...newItemsMap.keys()]);

  for (const materialId of allMaterialIds) {
    const oldItem = oldItemsMap.get(materialId);
    const newItem = newItemsMap.get(materialId);

    // CASE 1: NEW ITEM ADDED
    if (!oldItem && newItem) {
      continue;
    }

    // CASE 2: ITEM REMOVED
    if (oldItem && !newItem) {
      const oldReceivedQty = getReceivedQuantity(oldItem, oldInventoryStatus);

      if (oldReceivedQty > 0) {
        const material = await Material.findById(materialId);
        if (material) {
          const oldStock = material.stock;
          const newStock = oldStock - oldReceivedQty;

          await Material.findByIdAndUpdate(materialId, { stock: newStock });

          const newAdjustment = new StockAdjustment({
            materialId,
            materialName: oldItem.materialName,
            adjustmentType: 'decrement',
            value: oldReceivedQty,
            oldStock,
            newStock,
            oldUnitCost: material.unitCost,
            newUnitCost: material.unitCost,
            adjustmentReason: `Purchase ${purchaseRef} - item removed (${oldReceivedQty} units were received)`,
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

        const material = await Material.findById(materialId);
        if (material) {
          const oldStock = material.stock;
          const newStock = oldStock - excessQty;

          await Material.findByIdAndUpdate(materialId, { stock: newStock });

          const newAdjustment = new StockAdjustment({
            materialId,
            materialName: newItem.materialName,
            adjustmentType: 'decrement',
            value: excessQty,
            oldStock,
            newStock,
            oldUnitCost: material.unitCost,
            newUnitCost: material.unitCost,
            adjustmentReason: `Purchase ${purchaseRef} - ordered quantity reduced (received: ${oldReceivedQty} → ${newItem.quantity})`,
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
        const newItem = body.items.find((ni: any) => ni.materialId === oldItem.materialId);
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

      const itemsToAdjust: Array<{ materialId: string; materialName: string; quantity: number }> = [];

      for (const newItem of body.items) {
        const oldItem = currentPurchase.items.find((i: any) => i.materialId === newItem.materialId);
        if (!oldItem) continue; // New items are handled by processItemChanges

        const oldReceivedQty = getReceivedQuantity(oldItem, oldInventoryStatus);
        const newReceivedQty = getReceivedQuantity(newItem, newInventoryStatus);
        const qtyDifference = newReceivedQty - oldReceivedQty;

        if (qtyDifference !== 0) {
          itemsToAdjust.push({
            materialId: newItem.materialId,
            materialName: newItem.materialName,
            quantity: Math.abs(qtyDifference)
          });

        }
      }

      // Apply stock adjustments
      if (itemsToAdjust.length > 0) {
        for (const item of itemsToAdjust) {
          const newItem = body.items.find((i: any) => i.materialId === item.materialId);
          const oldItem = currentPurchase.items.find((i: any) => i.materialId === item.materialId);

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
              materialId: item.materialId,
              materialName: item.materialName,
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
            currentPurchase.items.find((i: any) => i.materialId === item.materialId),
            oldInventoryStatus
          );
          const qtyDifference = newReceivedQty - oldReceivedQty;

          if (qtyDifference !== 0) {
            const material = await Material.findById(item.materialId);
            if (material) {
              const oldStock = material.stock;
              const newStock = oldStock + qtyDifference;
              await Material.findByIdAndUpdate(item.materialId, { stock: newStock });

              const adjustmentType = qtyDifference > 0 ? 'increment' : 'decrement';
              const adjustmentValue = Math.abs(qtyDifference);

              const newAdjustment = new StockAdjustment({
                materialId: item.materialId,
                materialName: item.materialName,
                adjustmentType,
                value: adjustmentValue,
                oldStock,
                newStock,
                oldUnitCost: material.unitCost,
                newUnitCost: material.unitCost,
                adjustmentReason: `Purchase received quantity adjusted`,
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
              materialId: item.materialId,
              materialName: item.materialName,
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
      const isTaxPayable = body.isTaxPayable !== undefined ? body.isTaxPayable : currentPurchase.isTaxPayable;
      const vatAmount = isTaxPayable ? (subtotal * 0.05) : 0;
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

    const finalInventoryStatus = currentPurchase.inventoryStatus;

    // Handle journal for inventory status changes
    if (oldInventoryStatus !== newInventoryStatus) {
      if (newInventoryStatus === 'received') {
        await createJournalForPurchase(
          currentPurchase.toObject(),
          user.id,
          user.username || user.name
        );
      } else if (oldInventoryStatus === 'received') {
        await voidJournalsForReference(
          currentPurchase._id,
          user.id,
          user.username,
          `Inventory status changed from ${oldInventoryStatus} to ${newInventoryStatus}`
        );
      }
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
          const material = await Material.findById(item.materialId);
          if (material) {
            const oldStock = material.stock;
            const newStock = oldStock - qtyToRemove;

            await Material.findByIdAndUpdate(item.materialId, { stock: newStock });

            await new StockAdjustment({
              materialId: item.materialId,
              materialName: item.materialName,
              adjustmentType: 'decrement',
              value: qtyToRemove,
              oldStock,
              newStock,
              oldUnitCost: material.unitCost,
              newUnitCost: material.unitCost,
              adjustmentReason: `Purchase soft deleted`,
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