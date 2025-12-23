// app/api/purchases/[id]/route.ts - COMPLETE

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Purchase from "@/models/Purchase";
import Material from "@/models/Material";
import StockAdjustment from "@/models/StockAdjustment";
import Voucher from "@/models/Voucher";
import { softDelete } from "@/utils/softDelete";
import { getUserInfo } from "@/lib/auth-helpers";
import { handlePurchaseStatusChange, createJournalForPurchase } from '@/utils/journalAutoCreate';
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
    'status', 
    'paymentStatus', 
    'totalAmount', 
    'discount',  // NEW: Track discount changes
    'supplierName', 
    'paidAmount', 
    'date'
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
function getReceivedQuantity(item: any, purchaseStatus: string): number {
  if (purchaseStatus === 'Received') {
    return item.quantity;
  } else if (purchaseStatus === 'Partially Received') {
    return item.receivedQuantity || 0;
  }
  return 0;
}

/**
 * Process item changes when editing Received/Partially Received purchase
 */
async function processItemChanges(
  oldItems: any[],
  newItems: any[],
  purchaseRef: string,
  oldStatus: string
) {
  console.log('\n📦 Processing item changes...');
  console.log(`   Old status: ${oldStatus}`);

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
      const oldReceivedQty = getReceivedQuantity(oldItem, oldStatus);

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
      const oldReceivedQty = getReceivedQuantity(oldItem, oldStatus);

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
      const oldReceivedQty = getReceivedQuantity(oldItem, oldStatus);
      newItem.receivedQuantity = oldReceivedQty;
    }
  }

  return newItems;
}

function determineStatusAfterEdit(items: any[], oldStatus: string): string {
  const hasNewItems = items.some(item => !item.receivedQuantity || item.receivedQuantity === 0);

  if (hasNewItems) {
    return 'Partially Received';
  }

  const allFullyReceived = items.every(item => {
    const received = item.receivedQuantity || 0;
    return received >= item.quantity;
  });

  if (allFullyReceived) {
    return 'Received';
  }

  return 'Partially Received';
}

/**
 * PUT - Update a purchase with proper discount handling
 * 
 * Key fixes:
 * 1. Recalculate amounts if items or discount changed
 * 2. Preserve discount when not explicitly changed
 * 3. Ensure journal entries are balanced
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

    const oldStatus = currentPurchase.status;
    const newStatus = body.status || oldStatus;
    const itemsChanged = body.items && haveItemsChanged(currentPurchase.items, body.items);

    console.log(`\n📄 Purchase Update: ${currentPurchase.referenceNumber}`);
    console.log(`   Old Status: ${oldStatus}, New Status: ${newStatus}`);
    console.log(`   Items Changed: ${itemsChanged}`);

    // SCENARIO 1: Editing items while status is Received or Partially Received
    if ((oldStatus === 'Received' || oldStatus === 'Partially Received') && itemsChanged) {
      console.log(`\n🔧 Editing ${oldStatus} purchase...`);

      // 1. Void existing journal if status was Received
      if (oldStatus === 'Received') {
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
        oldStatus
      );

      body.items = updatedItems;

      // 3. Determine new status
      const newDeterminedStatus = determineStatusAfterEdit(updatedItems, oldStatus);
      body.status = newDeterminedStatus;
    }

    // SCENARIO 2: Status change via modal
    if (oldStatus !== newStatus && !itemsChanged) {
      // TO Received
      if (newStatus === 'Received' && oldStatus !== 'Received') {
        const itemsToUse = body.items || currentPurchase.items;
        for (const item of itemsToUse) {
          const previouslyReceived = getReceivedQuantity(item, oldStatus);
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
      if (newStatus === 'Partially Received') {
        const itemsWithReceived = body.items || currentPurchase.items;
        for (const item of itemsWithReceived) {
          const newReceivedQty = item.receivedQuantity || 0;
          const oldReceivedQty = getReceivedQuantity(
            currentPurchase.items.find((i: any) => i.materialId === item.materialId),
            oldStatus
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

      // FROM Received/Partially Received TO Ordered/Cancelled
      if ((oldStatus === 'Received' || oldStatus === 'Partially Received') &&
        newStatus !== 'Received' && newStatus !== 'Partially Received') {
        for (const item of currentPurchase.items) {
          const qtyToRemove = getReceivedQuantity(item, oldStatus);
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
                adjustmentReason: `Purchase status changed to ${newStatus}`,
                createdAt: new Date(),
              });
              await newAdjustment.save();
            }
          }
        }
      }
    }

    const changes = detectChanges(currentPurchase.toObject(), body);

    currentPurchase.addAuditEntry(
      'Updated',
      user.id,
      user.username,
      changes.length > 0 ? changes : undefined
    );

    const updateData = { ...body };
    
    // ✅ FIX: Recalculate amounts if items or discount changed
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

      // Update with recalculated values
      updateData.totalAmount = grossTotal;
      updateData.discount = discount;
      updateData.vatAmount = vatAmount;
      updateData.grandTotal = grandTotal;
      updateData.remainingAmount = grandTotal - (currentPurchase.paidAmount || 0);
    }

    if (body.items) {
      updateData.items = body.items;
    }

    currentPurchase.set({
      ...updateData,
      updatedBy: user.id,
    });

    await currentPurchase.save();

    // Handle status change for Journal entries
    const finalStatus = currentPurchase.status;

    if (oldStatus !== newStatus) {
      if (newStatus === 'Received') {
        // Create new journal for Received state
        await createJournalForPurchase(
          currentPurchase.toObject(),
          user.id,
          user.username || user.name
        );
      } else if (oldStatus === 'Received') {
        // Void old journal if moving away from Received
        await voidJournalsForReference(
          currentPurchase._id,
          user.id,
          user.username,
          `Purchase status changed from ${oldStatus} to ${newStatus}`
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

    // Revert stock logic
    if (purchaseToDelete.status === 'Received' || purchaseToDelete.status === 'Partially Received') {
       for (const item of purchaseToDelete.items) {
          const qtyToRemove = getReceivedQuantity(item, purchaseToDelete.status);
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