// utils/inventoryManager.ts - UPDATED: Uses unified Item model (replaces Product/Material)

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