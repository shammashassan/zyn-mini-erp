// utils/posManager.ts
// Handles stock deduction, journal creation, and reversal for POS sales.
// [FIX Bug 3] All referenceId fields now use .toString() for consistent String storage.
// [FIX Bug 4] createJournalForPOSSale now appends COGS entries (Dr. COGS / Cr. Inventory).

import mongoose from 'mongoose';
import Item from '@/models/Item';
import StockAdjustment from '@/models/StockAdjustment';
import Journal from '@/models/Journal';
import generateInvoiceNumber from './invoiceNumber';

// ─────────────────────────────────────────────────────────────────────────────
// STOCK DEDUCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deduct stock for a POS sale via BOM — mirrors inventoryManager.deductStockForInvoice.
 * Returns the MongoDB _ids of all StockAdjustment records created, plus the total
 * COGS amount computed from BOM component costPrices (used for the journal entry).
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
        costPrice: number; // [FIX Bug 4] Track costPrice for COGS
    }> = [];

    // Phase 1 — calculate all material requirements via BOM
    for (const lineItem of lineItems) {
        const lineItemId = lineItem.itemId;
        const lineQty = lineItem.quantity ?? 0;
        if (!lineItemId) continue;

        const item = await Item.findById(lineItemId);
        if (!item) throw new Error(`Item "${lineItem.description || lineItemId}" not found`);

        // Only product-type items affect stock via BOM
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
                    costPrice: materialItem.costPrice || 0, // [FIX Bug 4]
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

    // Phase 3 — execute deductions and collect adjustment IDs + compute total COGS
    const adjustmentIds: mongoose.Types.ObjectId[] = [];
    let cogsAmount = 0; // [FIX Bug 4]

    for (const op of operations) {
        const item = await Item.findById(op.itemId);
        if (!item) continue;

        const oldStock = item.stock;
        const newStock = oldStock - op.requiredQty;

        await Item.findByIdAndUpdate(op.itemId, { stock: newStock });

        // [FIX Bug 4] Accumulate COGS: cost of components consumed
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

        // [FIX Bug 4] Recompute COGS from current costPrice
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

// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL CREATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-create journal entry for a POS sale.
 *
 * Revenue entries:
 *   Dr. Cash/Bank          = grandTotal
 *   Dr. Sales Discount     = discount (if any)
 *   Cr. Sales Revenue      = totalAmount
 *   Cr. VAT Payable        = vatAmount (if any)
 *
 * [FIX Bug 4] COGS entries (only when cogsAmount > 0):
 *   Dr. Cost of Goods Sold = cogsAmount
 *   Cr. Inventory          = cogsAmount
 *
 * The revenue block and the COGS block each balance independently,
 * so totalDebit === totalCredit for the combined journal.
 *
 * @param sale         The saved POSSale document
 * @param cogsAmount   Total COGS computed by deductStockForPOSSale (pass 0 if unknown)
 */
export async function createJournalForPOSSale(
    sale: any,
    userId: string | null = null,
    username: string | null = null,
    cogsAmount: number = 0  // [FIX Bug 4] New parameter
): Promise<any> {
    try {
        const entries: Array<{
            accountCode: string;
            accountName: string;
            debit: number;
            credit: number;
        }> = [];

        const paymentAccount = sale.paymentMethod === 'Cash' ? 'A1001' : 'A1002';
        const paymentAccountName =
            sale.paymentMethod === 'Cash' ? 'Cash in Hand' : 'Cash at Bank';

        // Dr. Cash/Bank = grandTotal
        entries.push({
            accountCode: paymentAccount,
            accountName: paymentAccountName,
            debit: sale.grandTotal,
            credit: 0,
        });

        // Dr. Sales Discount (if any)
        if (sale.discount > 0) {
            entries.push({
                accountCode: 'I1004',
                accountName: 'Sales Discount',
                debit: sale.discount,
                credit: 0,
            });
        }

        // Cr. Sales Revenue = totalAmount (gross before discount)
        entries.push({
            accountCode: 'I1001',
            accountName: 'Sales Revenue',
            debit: 0,
            credit: sale.totalAmount,
        });

        // Cr. VAT Payable
        if (sale.vatAmount > 0) {
            entries.push({
                accountCode: 'L1002',
                accountName: 'VAT Payable',
                debit: 0,
                credit: sale.vatAmount,
            });
        }

        // [FIX Bug 4] COGS entries — records the cost of goods consumed by this sale.
        // These balance independently: Dr COGS / Cr Inventory.
        // Without this, Inventory remains inflated and gross profit is overstated.
        if (cogsAmount > 0) {
            entries.push({
                accountCode: 'X1001',
                accountName: 'Cost of Goods Sold',
                debit: cogsAmount,
                credit: 0,
            });
            entries.push({
                accountCode: 'A1200',
                accountName: 'Inventory',
                debit: 0,
                credit: cogsAmount,
            });
        }

        const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
        const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error(
                `POS journal not balanced! Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}`
            );
        }

        const journalNumber = await generateInvoiceNumber('journal');

        const journal = new Journal({
            journalNumber,
            entryDate: sale.createdAt || new Date(),
            referenceType: 'POSSale',
            // [FIX Bug 3] Store referenceId as string consistently
            referenceId: sale._id?.toString(),
            referenceNumber: sale.saleNumber,
            partyType: sale.customerType === 'party' ? 'Customer' : undefined,
            partyId: sale.partyId,
            partyName: sale.customerName,
            narration: `POS Sale ${sale.saleNumber} — ${sale.customerName} via ${sale.paymentMethod}`,
            entries,
            totalDebit,
            totalCredit,
            status: 'posted',
            createdBy: userId,
            postedBy: userId,
            postedAt: new Date(),
            actionHistory: [
                {
                    action: 'Auto-created from POS Sale',
                    userId,
                    username,
                    timestamp: new Date(),
                },
            ],
        });

        await journal.save();
        console.log(
            `✅ POS Journal ${journalNumber} created for sale ${sale.saleNumber}`
        );
        if (cogsAmount > 0) {
            console.log(
                `   📦 COGS of ${cogsAmount.toFixed(2)} recorded (Dr. COGS / Cr. Inventory)`
            );
        }
        return journal;
    } catch (error) {
        console.error('Error creating POS journal:', error);
        return null;
    }
}

/**
 * Void the journal for a POS sale (used on soft-delete).
 */
export async function voidJournalForPOSSale(
    journalId: mongoose.Types.ObjectId,
    userId: string | null,
    username: string | null
): Promise<void> {
    try {
        const journal = await Journal.findById(journalId);
        if (!journal || journal.status !== 'posted') return;

        journal.status = 'void';
        journal.updatedBy = userId as any;
        journal.addAuditEntry('Voided — POS sale deleted', userId, username, [
            { field: 'status', oldValue: 'posted', newValue: 'void' },
        ]);
        await journal.save({ validateBeforeSave: false });
        console.log(`✅ Voided POS journal ${journal.journalNumber}`);
    } catch (error) {
        console.error('Error voiding POS journal:', error);
    }
}

/**
 * Recreate journal when restoring a soft-deleted POS sale.
 * Pass the recomputed cogsAmount from reapplyStockForPOSSale.
 */
export async function recreateJournalForPOSSale(
    sale: any,
    userId: string | null,
    username: string | null,
    cogsAmount: number = 0 // [FIX Bug 4]
): Promise<any> {
    return createJournalForPOSSale(sale, userId, username, cogsAmount);
}