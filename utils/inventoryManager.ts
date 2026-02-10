// utils/inventoryManager.ts

import mongoose from 'mongoose';
import Material from '@/models/Material';
import Product from '@/models/Product';
import StockAdjustment from '@/models/StockAdjustment';

/**
 * Deduct stock for an invoice based on product BOMs
 * @throws Error if insufficient stock or product has no BOM
 */
export async function deductStockForInvoice(
    invoiceId: mongoose.Types.ObjectId,
    items: Array<{ productId?: string; quantity?: number; productName?: string; returnQuantity?: number }>
) {
    const operations: Array<{
        materialId: string;
        materialName: string;
        requiredQty: number;
        currentStock: number;
    }> = [];

    // Phase 1: Calculate all material requirements
    for (const item of items) {
        // Handle both invoice items and sales return items
        const itemProductId = item.productId;
        const itemQuantity = item.quantity || item.returnQuantity || 0;

        if (!itemProductId) {
            continue;
        }

        const product = await Product.findById(itemProductId);
        if (!product) {
            throw new Error(`Product ${itemProductId} not found`);
        }

        // For products without BOM, skip stock deduction
        if (!product.bom || product.bom.length === 0) {
            continue;
        }

        for (const bomItem of product.bom) {
            const requiredQty = bomItem.quantity * itemQuantity;

            const material = await Material.findById(bomItem.materialId);
            if (!material) {
                throw new Error(`Material ${bomItem.materialId} not found in BOM`);
            }

            // Find or create operation for this material
            const existingOp = operations.find(
                (op) => op.materialId === material._id.toString()
            );

            if (existingOp) {
                existingOp.requiredQty += requiredQty;
            } else {
                operations.push({
                    materialId: material._id.toString(),
                    materialName: material.name,
                    requiredQty,
                    currentStock: material.stock,
                });
            }
        }
    }

    // Phase 2: Validate all materials have sufficient stock
    for (const op of operations) {
        if (op.currentStock < op.requiredQty) {
            throw new Error(
                `Insufficient stock for material "${op.materialName}". Required: ${op.requiredQty}, Available: ${op.currentStock}`
            );
        }
    }

    // Phase 3: Execute stock deductions
    for (const op of operations) {
        const material = await Material.findById(op.materialId);
        if (!material) continue;

        const oldStock = material.stock;
        const newStock = oldStock - op.requiredQty;

        await Material.findByIdAndUpdate(op.materialId, { stock: newStock });

        // Create stock adjustment record
        await StockAdjustment.create({
            materialId: op.materialId,
            materialName: op.materialName,
            adjustmentType: 'decrement',
            value: op.requiredQty,
            oldStock,
            newStock,
            oldUnitCost: material.unitCost,
            newUnitCost: material.unitCost,
            adjustmentReason: `Invoice approved - stock deducted`,
            referenceId: invoiceId,
            referenceModel: 'Invoice',
            createdAt: new Date(),
        });
    }

    return operations;
}

/**
 * Reverse stock deduction for a sales return
 */
export async function reverseStockForSalesReturn(
    returnNoteId: mongoose.Types.ObjectId,
    items: Array<{ productId?: string; returnQuantity: number }>
) {
    const operations: Array<{
        materialId: string;
        materialName: string;
        returnedQty: number;
    }> = [];

    // Phase 1: Calculate all material returns
    for (const item of items) {
        if (!item.productId) continue;

        const product = await Product.findById(item.productId);
        if (!product) {
            throw new Error(`Product ${item.productId} not found`);
        }

        // For products without BOM, skip stock reversal
        if (!product.bom || product.bom.length === 0) {
            continue;
        }

        for (const bomItem of product.bom) {
            const returnedQty = bomItem.quantity * item.returnQuantity;

            const material = await Material.findById(bomItem.materialId);
            if (!material) {
                throw new Error(`Material ${bomItem.materialId} not found in BOM`);
            }

            // Find or create operation for this material
            const existingOp = operations.find(
                (op) => op.materialId === material._id.toString()
            );

            if (existingOp) {
                existingOp.returnedQty += returnedQty;
            } else {
                operations.push({
                    materialId: material._id.toString(),
                    materialName: material.name,
                    returnedQty,
                });
            }
        }
    }

    // Phase 2: Execute stock increments
    for (const op of operations) {
        const material = await Material.findById(op.materialId);
        if (!material) continue;

        const oldStock = material.stock;
        const newStock = oldStock + op.returnedQty;

        await Material.findByIdAndUpdate(op.materialId, { stock: newStock });

        // Create stock adjustment record
        await StockAdjustment.create({
            materialId: op.materialId,
            materialName: op.materialName,
            adjustmentType: 'increment',
            value: op.returnedQty,
            oldStock,
            newStock,
            oldUnitCost: material.unitCost,
            newUnitCost: material.unitCost,
            adjustmentReason: `Sales return approved - stock restored`,
            referenceId: returnNoteId,
            referenceModel: 'ReturnNote',
            createdAt: new Date(),
        });
    }

    return operations;
}

/**
 * Reverse stock deduction for an invoice (when cancelled or deleted)
 */
export async function reverseStockForInvoice(
    invoiceId: mongoose.Types.ObjectId,
    items: Array<{ productId?: string; quantity: number }>
) {
    const operations: Array<{
        materialId: string;
        materialName: string;
        restoredQty: number;
    }> = [];

    // Phase 1: Calculate all material restorations
    for (const item of items) {
        if (!item.productId) continue;

        const product = await Product.findById(item.productId);
        if (!product) {
            throw new Error(`Product ${item.productId} not found`);
        }

        // For products without BOM, skip stock restoration
        if (!product.bom || product.bom.length === 0) {
            continue;
        }

        for (const bomItem of product.bom) {
            const restoredQty = bomItem.quantity * item.quantity;

            const material = await Material.findById(bomItem.materialId);
            if (!material) {
                throw new Error(`Material ${bomItem.materialId} not found in BOM`);
            }

            // Find or create operation for this material
            const existingOp = operations.find(
                (op) => op.materialId === material._id.toString()
            );

            if (existingOp) {
                existingOp.restoredQty += restoredQty;
            } else {
                operations.push({
                    materialId: material._id.toString(),
                    materialName: material.name,
                    restoredQty,
                });
            }
        }
    }

    // Phase 2: Execute stock increments
    for (const op of operations) {
        const material = await Material.findById(op.materialId);
        if (!material) continue;

        const oldStock = material.stock;
        const newStock = oldStock + op.restoredQty;

        await Material.findByIdAndUpdate(op.materialId, { stock: newStock });

        // Create stock adjustment record
        await StockAdjustment.create({
            materialId: op.materialId,
            materialName: op.materialName,
            adjustmentType: 'increment',
            value: op.restoredQty,
            oldStock,
            newStock,
            oldUnitCost: material.unitCost,
            newUnitCost: material.unitCost,
            adjustmentReason: `Invoice cancelled/deleted - stock restored`,
            referenceId: invoiceId,
            referenceModel: 'Invoice',
            createdAt: new Date(),
        });
    }

    return operations;
}

/**
 * Check if a material's unit can be changed
 */
export async function canChangeMaterialUnit(
    materialId: string
): Promise<boolean> {
    const material = await Material.findById(materialId);
    if (!material) {
        throw new Error('Material not found');
    }

    // Unit is locked if baseUnitLocked is true
    return !material.baseUnitLocked;
}

/**
 * Lock material unit after first stock movement
 */
export async function lockMaterialUnit(materialId: string) {
    await Material.findByIdAndUpdate(materialId, { baseUnitLocked: true });
}

/**
 * Add stock for a purchase (when received or partially received)
 */
export async function addStockForPurchase(
    purchaseId: mongoose.Types.ObjectId,
    items: Array<{ materialId: string; materialName: string; quantity: number }>,
    reason: string
) {
    for (const item of items) {
        if (item.quantity <= 0) continue;

        const material = await Material.findById(item.materialId);
        if (!material) {
            throw new Error(`Material ${item.materialId} not found`);
        }

        const oldStock = material.stock;
        const newStock = oldStock + item.quantity;

        await Material.findByIdAndUpdate(item.materialId, { stock: newStock });

        // Create stock adjustment record
        await StockAdjustment.create({
            materialId: item.materialId,
            materialName: item.materialName,
            adjustmentType: 'increment',
            value: item.quantity,
            oldStock,
            newStock,
            oldUnitCost: material.unitCost,
            newUnitCost: material.unitCost,
            adjustmentReason: reason,
            referenceId: purchaseId,
            referenceModel: 'Purchase',
            createdAt: new Date(),
        });
    }
}

/**
 * Remove stock for a purchase (when status changes from received to pending, or on delete)
 */
export async function removeStockForPurchase(
    purchaseId: mongoose.Types.ObjectId,
    items: Array<{ materialId: string; materialName: string; quantity: number }>,
    reason: string
) {
    for (const item of items) {
        if (item.quantity <= 0) continue;

        const material = await Material.findById(item.materialId);
        if (!material) {
            throw new Error(`Material ${item.materialId} not found`);
        }

        const oldStock = material.stock;
        const newStock = oldStock - item.quantity;

        await Material.findByIdAndUpdate(item.materialId, { stock: newStock });

        // Create stock adjustment record
        await StockAdjustment.create({
            materialId: item.materialId,
            materialName: item.materialName,
            adjustmentType: 'decrement',
            value: item.quantity,
            oldStock,
            newStock,
            oldUnitCost: material.unitCost,
            newUnitCost: material.unitCost,
            adjustmentReason: reason,
            referenceId: purchaseId,
            referenceModel: 'Purchase',
            createdAt: new Date(),
        });
    }
}

/**
 * Remove stock for a purchase return (when approved)
 */
export async function removeStockForPurchaseReturn(
    returnNoteId: mongoose.Types.ObjectId,
    items: Array<{ materialId: string; materialName: string; returnQuantity: number }>,
    returnNumber: string
) {
    for (const item of items) {
        const material = await Material.findById(item.materialId);
        if (!material) continue;

        const oldStock = material.stock;
        const newStock = oldStock - item.returnQuantity;

        await Material.findByIdAndUpdate(item.materialId, { stock: newStock });

        // Create stock adjustment record
        await StockAdjustment.create({
            materialId: item.materialId,
            materialName: item.materialName,
            adjustmentType: 'decrement',
            value: item.returnQuantity,
            oldStock,
            newStock,
            oldUnitCost: material.unitCost,
            newUnitCost: material.unitCost,
            adjustmentReason: `Return Note ${returnNumber} approved`,
            referenceId: returnNoteId,
            referenceModel: 'ReturnNote',
            createdAt: new Date(),
        });
    }
}

/**
 * Add stock back for a purchase return (when reversed/deleted)
 */
export async function addStockForPurchaseReturn(
    returnNoteId: mongoose.Types.ObjectId,
    items: Array<{ materialId: string; materialName: string; returnQuantity: number }>,
    returnNumber: string
) {
    for (const item of items) {
        const material = await Material.findById(item.materialId);
        if (!material) continue;

        const oldStock = material.stock;
        const newStock = oldStock + item.returnQuantity;

        await Material.findByIdAndUpdate(item.materialId, { stock: newStock });

        // Create stock adjustment record
        await StockAdjustment.create({
            materialId: item.materialId,
            materialName: item.materialName,
            adjustmentType: 'increment',
            value: item.returnQuantity,
            oldStock,
            newStock,
            oldUnitCost: material.unitCost,
            newUnitCost: material.unitCost,
            adjustmentReason: `Return Note ${returnNumber} reversed`,
            referenceId: returnNoteId,
            referenceModel: 'ReturnNote',
            createdAt: new Date(),
        });
    }
}
