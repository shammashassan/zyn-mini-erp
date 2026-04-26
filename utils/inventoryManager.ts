// utils/inventoryManager.ts - UPDATED: Uses unified Item model (replaces Product/Material)
// POS stock functions (deductStockForPOSSale, reverseStockForPOSSale,
// reapplyStockForPOSSale) moved here from posManager.ts.

import mongoose from 'mongoose';
import Item from '@/models/Item';
import StockAdjustment from '@/models/StockAdjustment';

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE / SALES helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deduct stock for an invoice based on item BOMs.
 * Items that are "product" type may have a BOM referencing "material" items.
 * @throws Error if insufficient stock or item has no BOM
 */
export async function deductStockForInvoice(
    invoiceId: mongoose.Types.ObjectId,
    lineItems: Array<{ itemId?: string; quantity?: number; description?: string; returnQuantity?: number }>
) {
    const operations: Array<{
        itemId: string;
        itemName: string;
        requiredQty: number;
        currentStock: number;
    }> = [];

    // Phase 1 — calculate all material requirements via BOM
    for (const lineItem of lineItems) {
        const lineItemId = lineItem.itemId;
        const lineQty = lineItem.quantity ?? lineItem.returnQuantity ?? 0;

        if (!lineItemId) continue;

        const item = await Item.findById(lineItemId);
        if (!item) throw new Error(`Item ${lineItemId} not found`);

        // Only "product" items affect stock via BOM
        if (!item.types.includes('product')) continue;

        // Products without BOM skip stock deduction
        if (!item.bom || item.bom.length === 0) continue;

        for (const bomComponent of item.bom) {
            const requiredQty = bomComponent.quantity * lineQty;
            const materialItem = await Item.findById(bomComponent.itemId);
            if (!materialItem) {
                throw new Error(`BOM item ${bomComponent.itemId} not found`);
            }

            const existing = operations.find(
                (op) => op.itemId === materialItem._id.toString()
            );
            if (existing) {
                existing.requiredQty += requiredQty;
            } else {
                operations.push({
                    itemId: materialItem._id.toString(),
                    itemName: materialItem.name,
                    requiredQty,
                    currentStock: materialItem.stock,
                });
            }
        }
    }

    // Phase 2 — validate sufficient stock
    for (const op of operations) {
        if (op.currentStock < op.requiredQty) {
            throw new Error(
                `Insufficient stock for "${op.itemName}". Required: ${op.requiredQty}, Available: ${op.currentStock}`
            );
        }
    }

    // Phase 3 — execute deductions
    for (const op of operations) {
        const item = await Item.findById(op.itemId);
        if (!item) continue;

        const oldStock = item.stock;
        const newStock = oldStock - op.requiredQty;

        await Item.findByIdAndUpdate(op.itemId, { stock: newStock });

        await StockAdjustment.create({
            itemId: op.itemId,
            itemName: op.itemName,
            adjustmentType: 'decrement',
            value: op.requiredQty,
            oldStock,
            newStock,
            oldCostPrice: item.costPrice,
            newCostPrice: item.costPrice,
            adjustmentReason: 'Invoice approved — stock deducted',
            referenceId: invoiceId,
            referenceModel: 'Invoice',
            createdAt: new Date(),
        });
    }

    return operations;
}

/**
 * Reverse stock deduction for a sales return (adds stock back via BOM).
 */
export async function reverseStockForSalesReturn(
    returnNoteId: mongoose.Types.ObjectId,
    lineItems: Array<{ itemId?: string; returnQuantity: number }>
) {
    const operations: Array<{
        itemId: string;
        itemName: string;
        returnedQty: number;
    }> = [];

    for (const lineItem of lineItems) {
        if (!lineItem.itemId) continue;

        const item = await Item.findById(lineItem.itemId);
        if (!item) throw new Error(`Item ${lineItem.itemId} not found`);

        if (!item.types.includes('product') || !item.bom || item.bom.length === 0) continue;

        for (const bomComponent of item.bom) {
            const returnedQty = bomComponent.quantity * lineItem.returnQuantity;
            const materialItem = await Item.findById(bomComponent.itemId);
            if (!materialItem) throw new Error(`BOM item ${bomComponent.itemId} not found`);

            const existing = operations.find(
                (op) => op.itemId === materialItem._id.toString()
            );
            if (existing) {
                existing.returnedQty += returnedQty;
            } else {
                operations.push({
                    itemId: materialItem._id.toString(),
                    itemName: materialItem.name,
                    returnedQty,
                });
            }
        }
    }

    for (const op of operations) {
        const item = await Item.findById(op.itemId);
        if (!item) continue;

        const oldStock = item.stock;
        const newStock = oldStock + op.returnedQty;

        await Item.findByIdAndUpdate(op.itemId, { stock: newStock });

        await StockAdjustment.create({
            itemId: op.itemId,
            itemName: op.itemName,
            adjustmentType: 'increment',
            value: op.returnedQty,
            oldStock,
            newStock,
            oldCostPrice: item.costPrice,
            newCostPrice: item.costPrice,
            adjustmentReason: 'Sales return approved — stock restored',
            referenceId: returnNoteId,
            referenceModel: 'ReturnNote',
            createdAt: new Date(),
        });
    }

    return operations;
}

/**
 * Reverse stock deduction for an invoice (when cancelled or deleted).
 */
export async function reverseStockForInvoice(
    invoiceId: mongoose.Types.ObjectId,
    lineItems: Array<{ itemId?: string; quantity: number }>
) {
    const operations: Array<{
        itemId: string;
        itemName: string;
        restoredQty: number;
    }> = [];

    for (const lineItem of lineItems) {
        if (!lineItem.itemId) continue;

        const item = await Item.findById(lineItem.itemId);
        if (!item) throw new Error(`Item ${lineItem.itemId} not found`);

        if (!item.types.includes('product') || !item.bom || item.bom.length === 0) continue;

        for (const bomComponent of item.bom) {
            const restoredQty = bomComponent.quantity * lineItem.quantity;
            const materialItem = await Item.findById(bomComponent.itemId);
            if (!materialItem) throw new Error(`BOM item ${bomComponent.itemId} not found`);

            const existing = operations.find(
                (op) => op.itemId === materialItem._id.toString()
            );
            if (existing) {
                existing.restoredQty += restoredQty;
            } else {
                operations.push({
                    itemId: materialItem._id.toString(),
                    itemName: materialItem.name,
                    restoredQty,
                });
            }
        }
    }

    for (const op of operations) {
        const item = await Item.findById(op.itemId);
        if (!item) continue;

        const oldStock = item.stock;
        const newStock = oldStock + op.restoredQty;

        await Item.findByIdAndUpdate(op.itemId, { stock: newStock });

        await StockAdjustment.create({
            itemId: op.itemId,
            itemName: op.itemName,
            adjustmentType: 'increment',
            value: op.restoredQty,
            oldStock,
            newStock,
            oldCostPrice: item.costPrice,
            newCostPrice: item.costPrice,
            adjustmentReason: 'Invoice cancelled/deleted — stock restored',
            referenceId: invoiceId,
            referenceModel: 'Invoice',
            createdAt: new Date(),
        });
    }

    return operations;
}

// ─────────────────────────────────────────────────────────────────────────────
// PURCHASE helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add stock when a purchase is received (fully or partially).
 */
export async function addStockForPurchase(
    purchaseId: mongoose.Types.ObjectId,
    lineItems: Array<{ itemId: string; itemName: string; quantity: number }>,
    reason: string
) {
    for (const lineItem of lineItems) {
        if (lineItem.quantity <= 0) continue;

        const item = await Item.findById(lineItem.itemId);
        if (!item) throw new Error(`Item ${lineItem.itemId} not found`);

        const oldStock = item.stock;
        const newStock = oldStock + lineItem.quantity;

        await Item.findByIdAndUpdate(lineItem.itemId, { stock: newStock });

        await StockAdjustment.create({
            itemId: lineItem.itemId,
            itemName: lineItem.itemName,
            adjustmentType: 'increment',
            value: lineItem.quantity,
            oldStock,
            newStock,
            oldCostPrice: item.costPrice,
            newCostPrice: item.costPrice,
            adjustmentReason: reason,
            referenceId: purchaseId,
            referenceModel: 'Purchase',
            createdAt: new Date(),
        });
    }
}

/**
 * Remove stock when a purchase is reversed (status back to pending or on delete).
 */
export async function removeStockForPurchase(
    purchaseId: mongoose.Types.ObjectId,
    lineItems: Array<{ itemId: string; itemName: string; quantity: number }>,
    reason: string
) {
    for (const lineItem of lineItems) {
        if (lineItem.quantity <= 0) continue;

        const item = await Item.findById(lineItem.itemId);
        if (!item) throw new Error(`Item ${lineItem.itemId} not found`);

        const oldStock = item.stock;
        const newStock = oldStock - lineItem.quantity;

        await Item.findByIdAndUpdate(lineItem.itemId, { stock: newStock });

        await StockAdjustment.create({
            itemId: lineItem.itemId,
            itemName: lineItem.itemName,
            adjustmentType: 'decrement',
            value: lineItem.quantity,
            oldStock,
            newStock,
            oldCostPrice: item.costPrice,
            newCostPrice: item.costPrice,
            adjustmentReason: reason,
            referenceId: purchaseId,
            referenceModel: 'Purchase',
            createdAt: new Date(),
        });
    }
}

/**
 * Remove stock when a purchase return is approved (items going back to supplier).
 */
export async function removeStockForPurchaseReturn(
    returnNoteId: mongoose.Types.ObjectId,
    lineItems: Array<{ itemId: string; itemName: string; returnQuantity: number }>,
    returnNumber: string
) {
    for (const lineItem of lineItems) {
        const item = await Item.findById(lineItem.itemId);
        if (!item) continue;

        const oldStock = item.stock;
        const newStock = oldStock - lineItem.returnQuantity;

        await Item.findByIdAndUpdate(lineItem.itemId, { stock: newStock });

        await StockAdjustment.create({
            itemId: lineItem.itemId,
            itemName: lineItem.itemName,
            adjustmentType: 'decrement',
            value: lineItem.returnQuantity,
            oldStock,
            newStock,
            oldCostPrice: item.costPrice,
            newCostPrice: item.costPrice,
            adjustmentReason: `Return Note ${returnNumber} approved`,
            referenceId: returnNoteId,
            referenceModel: 'ReturnNote',
            createdAt: new Date(),
        });
    }
}

/**
 * Add stock back when a purchase return is reversed/deleted.
 */
export async function addStockForPurchaseReturn(
    returnNoteId: mongoose.Types.ObjectId,
    lineItems: Array<{ itemId: string; itemName: string; returnQuantity: number }>,
    returnNumber: string
) {
    for (const lineItem of lineItems) {
        const item = await Item.findById(lineItem.itemId);
        if (!item) continue;

        const oldStock = item.stock;
        const newStock = oldStock + lineItem.returnQuantity;

        await Item.findByIdAndUpdate(lineItem.itemId, { stock: newStock });

        await StockAdjustment.create({
            itemId: lineItem.itemId,
            itemName: lineItem.itemName,
            adjustmentType: 'increment',
            value: lineItem.returnQuantity,
            oldStock,
            newStock,
            oldCostPrice: item.costPrice,
            newCostPrice: item.costPrice,
            adjustmentReason: `Return Note ${returnNumber} reversed`,
            referenceId: returnNoteId,
            referenceModel: 'ReturnNote',
            createdAt: new Date(),
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Unit-lock helpers
// ─────────────────────────────────────────────────────────────────────────────

export async function canChangeItemUnit(itemId: string): Promise<boolean> {
    const item = await Item.findById(itemId);
    if (!item) throw new Error('Item not found');
    return !item.baseUnitLocked;
}

export async function lockItemUnit(itemId: string) {
    await Item.findByIdAndUpdate(itemId, { baseUnitLocked: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// POS SALE stock helpers (moved from posManager.ts)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deduct stock for a POS sale via BOM — mirrors deductStockForInvoice.
 * Returns the MongoDB _ids of all StockAdjustment records created, plus the
 * total COGS amount computed from BOM component costPrices (passed to the journal).
 */
export async function deductStockForPOSSale(
    saleId: mongoose.Types.ObjectId,
    lineItems: Array<{ itemId?: string; quantity?: number; description?: string }>
): Promise<{ adjustmentIds: mongoose.Types.ObjectId[]; cogsAmount: number }> {
    const operations: Array<{
        itemId: string;
        itemName: string;
        requiredQty: number;
        currentStock: number;
        costPrice: number;
    }> = [];

    // Phase 1 — calculate all material requirements via BOM
    for (const lineItem of lineItems) {
        const lineItemId = lineItem.itemId;
        const lineQty = lineItem.quantity ?? 0;
        if (!lineItemId) continue;

        const item = await Item.findById(lineItemId);
        if (!item) throw new Error(`Item "${lineItem.description || lineItemId}" not found`);

        if (!item.types.includes('product')) continue;
        if (!item.bom || item.bom.length === 0) continue;

        for (const bomComponent of item.bom) {
            const requiredQty = bomComponent.quantity * lineQty;
            const materialItem = await Item.findById(bomComponent.itemId);
            if (!materialItem) throw new Error(`BOM component item ${bomComponent.itemId} not found`);

            const existing = operations.find(op => op.itemId === materialItem._id.toString());
            if (existing) {
                existing.requiredQty += requiredQty;
            } else {
                operations.push({
                    itemId: materialItem._id.toString(),
                    itemName: materialItem.name,
                    requiredQty,
                    currentStock: materialItem.stock,
                    costPrice: materialItem.costPrice || 0,
                });
            }
        }
    }

    // Phase 2 — validate stock availability
    for (const op of operations) {
        if (op.currentStock < op.requiredQty) {
            throw new Error(
                `Insufficient stock for "${op.itemName}". Required: ${op.requiredQty}, Available: ${op.currentStock}`
            );
        }
    }

    // Phase 3 — execute deductions, collect adjustment IDs, compute total COGS
    const adjustmentIds: mongoose.Types.ObjectId[] = [];
    let cogsAmount = 0;

    for (const op of operations) {
        const item = await Item.findById(op.itemId);
        if (!item) continue;

        const oldStock = item.stock;
        const newStock = oldStock - op.requiredQty;

        await Item.findByIdAndUpdate(op.itemId, { stock: newStock });

        cogsAmount += op.costPrice * op.requiredQty;

        const adj = await StockAdjustment.create({
            itemId: op.itemId,
            itemName: op.itemName,
            adjustmentType: 'decrement',
            value: op.requiredQty,
            oldStock,
            newStock,
            oldCostPrice: item.costPrice,
            newCostPrice: item.costPrice,
            adjustmentReason: 'POS sale — stock deducted',
            referenceId: saleId,
            referenceModel: 'Invoice',
            createdAt: new Date(),
        });

        adjustmentIds.push(adj._id);
    }

    cogsAmount = Math.round(cogsAmount * 100) / 100;

    return { adjustmentIds, cogsAmount };
}

/**
 * Reverse stock deductions for a POS sale (used on soft-delete).
 * Pass the stockAdjustmentIds stored on the POSSale document.
 */
export async function reverseStockForPOSSale(
    adjustmentIds: mongoose.Types.ObjectId[]
): Promise<void> {
    for (const adjId of adjustmentIds) {
        const adj = await StockAdjustment.findById(adjId).setOptions({ includeDeleted: true });
        if (!adj) continue;

        const item = await Item.findById(adj.itemId);
        if (!item) continue;

        const oldStock = item.stock;
        const restored = adj.adjustmentType === 'decrement' ? adj.value : -adj.value;
        const newStock = oldStock + restored;

        await Item.findByIdAndUpdate(adj.itemId, { stock: newStock });

        // Soft-delete the original adjustment record
        await StockAdjustment.findByIdAndUpdate(adjId, {
            isDeleted: true,
            deletedAt: new Date(),
        });
    }
}

/**
 * Re-apply stock deductions when restoring a soft-deleted POS sale.
 * Reads the original adjustments (soft-deleted) and reapplies them.
 * Returns new adjustment IDs and recomputed COGS.
 */
export async function reapplyStockForPOSSale(
    saleId: mongoose.Types.ObjectId,
    adjustmentIds: mongoose.Types.ObjectId[]
): Promise<{ newIds: mongoose.Types.ObjectId[]; cogsAmount: number }> {
    const newIds: mongoose.Types.ObjectId[] = [];
    let cogsAmount = 0;

    for (const adjId of adjustmentIds) {
        const adj = await StockAdjustment.findById(adjId).setOptions({ includeDeleted: true });
        if (!adj) continue;

        const item = await Item.findById(adj.itemId);
        if (!item) continue;

        const oldStock = item.stock;
        const newStock = adj.adjustmentType === 'decrement'
            ? oldStock - adj.value
            : oldStock + adj.value;

        if (newStock < 0) {
            throw new Error(`Insufficient stock for "${item.name}" to restore sale`);
        }

        await Item.findByIdAndUpdate(adj.itemId, { stock: newStock });

        // Recompute COGS from current costPrice
        if (adj.adjustmentType === 'decrement') {
            cogsAmount += (item.costPrice || 0) * adj.value;
        }

        const newAdj = await StockAdjustment.create({
            itemId: adj.itemId,
            itemName: adj.itemName,
            adjustmentType: adj.adjustmentType,
            value: adj.value,
            oldStock,
            newStock,
            oldCostPrice: item.costPrice,
            newCostPrice: item.costPrice,
            adjustmentReason: 'POS sale restored — stock re-deducted',
            referenceId: saleId,
            referenceModel: 'Invoice',
            createdAt: new Date(),
        });

        newIds.push(newAdj._id);
    }

    cogsAmount = Math.round(cogsAmount * 100) / 100;

    return { newIds, cogsAmount };
}

/**
 * Add stock back when a POS Return is created (immediate approval).
 * Mirrors reverseStockForSalesReturn but without specific return notes ID.
 */
export async function addStockForPOSReturn(
    returnNoteId: mongoose.Types.ObjectId,
    lineItems: Array<{ itemId?: string; returnQuantity: number }>
) {
    const operations: Array<{
        itemId: string;
        itemName: string;
        returnedQty: number;
    }> = [];

    for (const lineItem of lineItems) {
        if (!lineItem.itemId) continue;

        const item = await Item.findById(lineItem.itemId);
        if (!item) throw new Error(`Item ${lineItem.itemId} not found`);

        if (!item.types.includes('product') || !item.bom || item.bom.length === 0) continue;

        for (const bomComponent of item.bom) {
            const returnedQty = bomComponent.quantity * lineItem.returnQuantity;
            const materialItem = await Item.findById(bomComponent.itemId);
            if (!materialItem) throw new Error(`BOM item ${bomComponent.itemId} not found`);

            const existing = operations.find(
                (op) => op.itemId === materialItem._id.toString()
            );
            if (existing) {
                existing.returnedQty += returnedQty;
            } else {
                operations.push({
                    itemId: materialItem._id.toString(),
                    itemName: materialItem.name,
                    returnedQty,
                });
            }
        }
    }

    for (const op of operations) {
        const item = await Item.findById(op.itemId);
        if (!item) continue;

        const oldStock = item.stock;
        const newStock = oldStock + op.returnedQty;

        await Item.findByIdAndUpdate(op.itemId, { stock: newStock });

        await StockAdjustment.create({
            itemId: op.itemId,
            itemName: op.itemName,
            adjustmentType: 'increment',
            value: op.returnedQty,
            oldStock,
            newStock,
            oldCostPrice: item.costPrice,
            newCostPrice: item.costPrice,
            adjustmentReason: 'POS return created — stock restored',
            referenceId: returnNoteId,
            referenceModel: 'ReturnNote',
            createdAt: new Date(),
        });
    }

    return operations;
}