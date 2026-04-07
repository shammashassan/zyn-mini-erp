// utils/posManager.ts
// Handles stock deduction, journal creation, and reversal for POS sales.

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
 * Returns the MongoDB _ids of all StockAdjustment records created.
 */
export async function deductStockForPOSSale(
    saleId: mongoose.Types.ObjectId,
    lineItems: Array<{ itemId?: string; quantity?: number; description?: string }>
): Promise<mongoose.Types.ObjectId[]> {
    const operations: Array<{
        itemId: string;
        itemName: string;
        requiredQty: number;
        currentStock: number;
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

    // Phase 3 — execute deductions and collect adjustment IDs
    const adjustmentIds: mongoose.Types.ObjectId[] = [];

    for (const op of operations) {
        const item = await Item.findById(op.itemId);
        if (!item) continue;

        const oldStock = item.stock;
        const newStock = oldStock - op.requiredQty;

        await Item.findByIdAndUpdate(op.itemId, { stock: newStock });

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
            referenceModel: 'Invoice', // closest available enum value
            createdAt: new Date(),
        });

        adjustmentIds.push(adj._id);
    }

    return adjustmentIds;
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
 * Returns new adjustment IDs.
 */
export async function reapplyStockForPOSSale(
    saleId: mongoose.Types.ObjectId,
    adjustmentIds: mongoose.Types.ObjectId[]
): Promise<mongoose.Types.ObjectId[]> {
    const newIds: mongoose.Types.ObjectId[] = [];

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

    return newIds;
}

// ─────────────────────────────────────────────────────────────────────────────
// JOURNAL CREATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-create journal entry for a POS sale.
 * Dr. Cash/Bank = grandTotal
 * Dr. Sales Discount = discount (if any)
 * Cr. Sales Revenue = totalAmount
 * Cr. VAT Payable = vatAmount (if any)
 */
export async function createJournalForPOSSale(
    sale: any,
    userId: string | null = null,
    username: string | null = null
): Promise<any> {
    try {
        const entries: Array<{ accountCode: string; accountName: string; debit: number; credit: number }> = [];

        const paymentAccount = sale.paymentMethod === 'Cash' ? 'A1001' : 'A1002';
        const paymentAccountName = sale.paymentMethod === 'Cash' ? 'Cash in Hand' : 'Cash at Bank';

        // Dr. Cash/Bank = grandTotal
        entries.push({ accountCode: paymentAccount, accountName: paymentAccountName, debit: sale.grandTotal, credit: 0 });

        // Dr. Sales Discount (if any)
        if (sale.discount > 0) {
            entries.push({ accountCode: 'I1004', accountName: 'Sales Discount', debit: sale.discount, credit: 0 });
        }

        // Cr. Sales Revenue = totalAmount (gross)
        entries.push({ accountCode: 'I1001', accountName: 'Sales Revenue', debit: 0, credit: sale.totalAmount });

        // Cr. VAT Payable
        if (sale.vatAmount > 0) {
            entries.push({ accountCode: 'L1002', accountName: 'VAT Payable', debit: 0, credit: sale.vatAmount });
        }

        const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
        const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

        const journalNumber = await generateInvoiceNumber('journal');

        const journal = new Journal({
            journalNumber,
            entryDate: sale.createdAt || new Date(),
            referenceType: 'General',
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
            actionHistory: [{
                action: 'Auto-created from POS Sale',
                userId,
                username,
                timestamp: new Date(),
            }],
        });

        await journal.save();
        console.log(`✅ POS Journal ${journalNumber} created for sale ${sale.saleNumber}`);
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
 */
export async function recreateJournalForPOSSale(
    sale: any,
    userId: string | null,
    username: string | null
): Promise<any> {
    return createJournalForPOSSale(sale, userId, username);
}