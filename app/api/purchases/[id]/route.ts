// app/api/purchases/[id]/route.ts - FIXED: Enhanced audit tracking with username

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Purchase from "@/models/Purchase";
import Material from "@/models/Material";
import StockAdjustment from "@/models/StockAdjustment";
import { softDelete } from "@/utils/softDelete";
import { getUserInfo } from "@/lib/auth-helpers";
import { createJournalForPurchase } from '@/utils/journalAutoCreate';
import { voidJournalsForReference } from '@/utils/journalManager';
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

/**
 * GET - Fetch a single purchase by ID
 */
export async function GET(request: Request, context: RequestContext) {
  try {
    const { error } = await requireAuthAndPermission({
      purchase: ["read"],
    });

    if (error) return error;

    await dbConnect();
    const { id } = await context.params;

    const purchase = await Purchase.findById(id)
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
    'supplierName',
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
  if (oldItems.length !== newItems.length) return true;

  for (let i = 0; i < oldItems.length; i++) {
    const oldItem = oldItems[i];
    const newItem = newItems.find((item: any) => item.materialId === oldItem.materialId);

    if (!newItem) return true;
    if (oldItem.quantity !== newItem.quantity) return true;
    if (oldItem.unitCost !== newItem.unitCost) return true;
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
  console.log('\n📦 Processing item changes...');
  console.log(`   Old inventory status: ${oldInventoryStatus}`);

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
 * ✅ FIXED: Enhanced audit tracking with proper username for automatic changes
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

    const oldPurchaseStatus = currentPurchase.purchaseStatus;
    const oldInventoryStatus = currentPurchase.inventoryStatus;
    const oldPaymentStatus = currentPurchase.paymentStatus;

    const newPurchaseStatus = body.purchaseStatus || oldPurchaseStatus;
    const newInventoryStatus = body.inventoryStatus || oldInventoryStatus;

    const itemsChanged = body.items && haveItemsChanged(currentPurchase.items, body.items);

    console.log(`\n📝 Purchase Update: ${currentPurchase.referenceNumber}`);
    console.log(`   Old Purchase Status: ${oldPurchaseStatus}, New: ${newPurchaseStatus}`);
    console.log(`   Old Inventory Status: ${oldInventoryStatus}, New: ${newInventoryStatus}`);
    console.log(`   Old Payment Status: ${oldPaymentStatus}`);
    console.log(`   Items Changed: ${itemsChanged}`);

    // SCENARIO 1: Editing items while inventory status is received or partially received
    if ((oldInventoryStatus === 'received' || oldInventoryStatus === 'partially received') && itemsChanged) {
      console.log(`\n🔧 Editing ${oldInventoryStatus} purchase...`);

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

    // SCENARIO 2: Inventory status change
    if (oldInventoryStatus !== newInventoryStatus && !itemsChanged) {
      // TO Received
      if (newInventoryStatus === 'received' && oldInventoryStatus !== 'received') {
        const itemsToUse = body.items || currentPurchase.items;
        for (const item of itemsToUse) {
          const previouslyReceived = getReceivedQuantity(item, oldInventoryStatus);
          const remainingToAdd = item.quantity - previouslyReceived;

          if (remainingToAdd > 0) {
            const material = await Material.findById(item.materialId);
            if (material) {
              const oldStock = material.stock;
              const newStock = oldStock + remainingToAdd;
              await Material.findByIdAndUpdate(item.materialId, { stock: newStock });

              const adjustmentReason = previouslyReceived > 0
                ? `Purchase fully received (${item.quantity} of ${item.quantity} total)`
                : `Purchase fully received`;

              const newAdjustment = new StockAdjustment({
                materialId: item.materialId,
                materialName: item.materialName,
                adjustmentType: 'increment',
                value: remainingToAdd,
                oldStock,
                newStock,
                oldUnitCost: material.unitCost,
                newUnitCost: material.unitCost,
                adjustmentReason,
                createdAt: new Date(),
              });
              await newAdjustment.save();
            }
          }
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
        for (const item of currentPurchase.items) {
          const qtyToRemove = getReceivedQuantity(item, oldInventoryStatus);
          if (qtyToRemove > 0) {
            const material = await Material.findById(item.materialId);
            if (material) {
              const oldStock = material.stock;
              const newStock = oldStock - qtyToRemove;
              await Material.findByIdAndUpdate(item.materialId, { stock: newStock });

              const newAdjustment = new StockAdjustment({
                materialId: item.materialId,
                materialName: item.materialName,
                adjustmentType: 'decrement',
                value: qtyToRemove,
                oldStock,
                newStock,
                oldUnitCost: material.unitCost,
                newUnitCost: material.unitCost,
                adjustmentReason: `Inventory status changed to ${newInventoryStatus}`,
                createdAt: new Date(),
              });
              await newAdjustment.save();
            }
          }
        }
      }
    }

    // Detect changes for manual audit entry
    const changes = detectChanges(currentPurchase.toObject(), body);

    // ✅ Only add manual "Updated" entry if there are explicit changes
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

      console.log(`\n📊 Purchase Update Calculation:`);
      console.log(`   Gross Total: ${grossTotal.toFixed(2)}`);
      console.log(`   Discount: ${discount.toFixed(2)}`);
      console.log(`   Subtotal: ${subtotal.toFixed(2)}`);
      console.log(`   VAT (5%): ${vatAmount.toFixed(2)}`);
      console.log(`   Grand Total: ${grandTotal.toFixed(2)}`);

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

    // ✅ FIXED: Update the last audit entry with username if payment status auto-changed
    await currentPurchase.save();
    
    // After save, check if the last audit entry is "Payment Status Auto-Updated" and add username
    if (currentPurchase.actionHistory.length > 0) {
      const lastEntry = currentPurchase.actionHistory[currentPurchase.actionHistory.length - 1];
      if (lastEntry.action === 'Payment Status Auto-Updated' && !lastEntry.username) {
        lastEntry.username = user.username;
        await currentPurchase.save();
      }
    }

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