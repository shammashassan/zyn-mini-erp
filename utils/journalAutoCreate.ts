// utils/journalAutoCreate.ts
// AUDIT-FIXED: All 7 bugs resolved — see inline comments prefixed with [FIX]

import Journal from '@/models/Journal';
import Item from '@/models/Item'; // [FIX Bug 4] Import Item for COGS lookup
import generateInvoiceNumber from './invoiceNumber';
import { voidJournalsForReference } from './journalManager';
import mongoose from 'mongoose';

interface JournalEntryData {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [FIX Bug 4] Calculate total COGS by summing costPrice × quantity for each
 * line item that references a known Item. Returns 0 if no items have cost data.
 */
async function calculateCOGSForItems(
  items: Array<{ itemId?: mongoose.Types.ObjectId | string; quantity?: number }>
): Promise<number> {
  let totalCOGS = 0;
  for (const lineItem of items) {
    if (!lineItem.itemId) continue;
    const item = await Item.findById(lineItem.itemId);
    if (!item || !item.costPrice) continue;
    totalCOGS += item.costPrice * (lineItem.quantity || 0);
  }
  return Math.round(totalCOGS * 100) / 100; // round to 2dp
}

/**
 * Helper: Extract party and item info from invoice WITH ID lookup
 */
async function extractInvoicePartyAndItemInfo(invoice: any) {
  const result: {
    partyType?: 'Customer' | 'Supplier' | 'Payee' | 'Vendor';
    partyId?: mongoose.Types.ObjectId;
    contactId?: mongoose.Types.ObjectId;
    partyName?: string;
    itemType?: 'Material' | 'Product';
    itemName?: string;
  } = {};

  if (invoice.partyId) {
    result.partyType = 'Customer';
    // [FIX Bug 7] Store raw ObjectId, never toString() before passing to Journal
    result.partyId = invoice.partyId?._id ?? invoice.partyId;
    if (invoice.contactId) {
      result.contactId = invoice.contactId?._id ?? invoice.contactId;
    }

    if (invoice.partySnapshot?.displayName) {
      result.partyName = invoice.partySnapshot.displayName;
    } else if (typeof invoice.partyId === 'object' && invoice.partyId !== null) {
      result.partyName =
        invoice.partyId.company || invoice.partyId.name || 'Unknown Customer';
    }
  }

  if (invoice.items && invoice.items.length > 0) {
    const firstItem = invoice.items[0];
    if (firstItem.description) {
      result.itemType = 'Product';
      result.itemName = firstItem.description;
    }
  }

  return result;
}

/**
 * Helper: Extract party and item info from voucher
 */
async function extractVoucherPartyAndItemInfo(voucher: any) {
  const result: {
    partyType?: 'Customer' | 'Supplier' | 'Payee' | 'Vendor';
    partyId?: mongoose.Types.ObjectId; // [FIX Bug 7] Use ObjectId, not string
    contactId?: mongoose.Types.ObjectId;
    partyName?: string;
    itemType?: 'Material' | 'Product';
    itemName?: string;
  } = {};

  // [FIX Bug 7] Always store raw ObjectIds — Mongoose handles the cast
  if (voucher.partyId) {
    result.partyId = voucher.partyId?._id ?? voucher.partyId;
  }
  if (voucher.contactId) {
    result.contactId = voucher.contactId?._id ?? voucher.contactId;
  }

  if (voucher.voucherType === 'receipt') {
    if (voucher.vendorName) {
      result.partyType = 'Vendor';
      result.partyName = voucher.vendorName;
    } else if (voucher.payeeName || voucher.payeeId) {
      result.partyType = 'Payee';
      result.partyName = voucher.payeeName;
      // [FIX Bug 7] Keep as ObjectId, not .toString()
      if (voucher.payeeId) {
        result.partyId = voucher.payeeId?._id ?? voucher.payeeId;
      }
    } else {
      result.partyType = 'Customer';
      if (voucher.partySnapshot) {
        result.partyName =
          voucher.partySnapshot.displayName || voucher.partySnapshot.name;
        if (voucher.partySnapshot.roles) {
          if (
            voucher.partySnapshot.roles.includes('vendor') &&
            !voucher.partySnapshot.roles.includes('customer')
          ) {
            result.partyType = 'Vendor';
          } else if (
            voucher.partySnapshot.roles.includes('supplier') &&
            !voucher.partySnapshot.roles.includes('customer')
          ) {
            result.partyType = 'Supplier';
          }
        }
      } else if (voucher.partyId && typeof voucher.partyId === 'object') {
        const party = voucher.partyId;
        result.partyName = party.company || party.name || 'Unknown Party';
        if (party.roles) {
          if (party.roles.includes('vendor') && !party.roles.includes('customer')) {
            result.partyType = 'Vendor';
          } else if (
            party.roles.includes('supplier') &&
            !party.roles.includes('customer')
          ) {
            result.partyType = 'Supplier';
          }
        }
      }
    }
  } else if (voucher.voucherType === 'payment') {
    if (voucher.payeeName || voucher.payeeId) {
      result.partyType = 'Payee';
      result.partyName = voucher.partySnapshot?.name || voucher.payeeName;
      // [FIX Bug 7] Keep as ObjectId
      if (voucher.payeeId) {
        result.partyId = voucher.payeeId?._id ?? voucher.payeeId;
      }
    } else if (voucher.partySnapshot?.displayName && !voucher.vendorName) {
      result.partyType = 'Supplier';
      result.partyName = voucher.partySnapshot.displayName;
    } else if (voucher.vendorName) {
      result.partyType = 'Vendor';
      result.partyName = voucher.vendorName;
    } else if (voucher.partyId && typeof voucher.partyId === 'object') {
      result.partyType = 'Supplier';
      result.partyName =
        voucher.partyId.company || voucher.partyId.name || 'Unknown Supplier';
    }
  }

  if (voucher.items && voucher.items.length > 0) {
    const firstItem = voucher.items[0];
    if (firstItem.description) {
      result.itemType = 'Product';
      result.itemName = firstItem.description;
    }
  }

  return result;
}

/**
 * Helper: Extract party and item info from purchase WITH ID lookup
 */
async function extractPurchasePartyAndItemInfo(purchase: any) {
  const result: {
    partyType?: 'Customer' | 'Supplier' | 'Payee';
    partyId?: mongoose.Types.ObjectId;
    contactId?: mongoose.Types.ObjectId;
    partyName?: string;
    itemType?: 'Material' | 'Product';
    itemName?: string;
  } = {};

  result.partyType = 'Supplier';

  if (purchase.partyId) {
    result.partyId = purchase.partyId?._id ?? purchase.partyId;
  }
  if (purchase.contactId) {
    result.contactId = purchase.contactId?._id ?? purchase.contactId;
  }

  if (purchase.partySnapshot?.displayName) {
    result.partyName = purchase.partySnapshot.displayName;
  } else if (purchase.partyId && typeof purchase.partyId === 'object') {
    result.partyName =
      purchase.partyId.company || purchase.partyId.name || 'Unknown Supplier';
  }

  if (purchase.items && purchase.items.length > 0) {
    const firstItem = purchase.items[0];
    if (firstItem.description) {
      result.itemType = 'Material';
      result.itemName = firstItem.description;
    }
  }

  return result;
}

/**
 * Helper: Extract item info from expense
 */
async function extractExpenseItemInfo(expense: any) {
  const result: {
    partyType?: 'Payee' | 'Supplier' | 'Vendor';
    partyId?: mongoose.Types.ObjectId;
    partyName?: string;
    itemType?: 'Material' | 'Product';
    itemName?: string;
  } = {};

  if (expense.payeeId) {
    if (typeof expense.payeeId === 'object' && expense.payeeId.name) {
      result.partyType = 'Payee';
      // [FIX Bug 7] Keep ObjectId
      result.partyId = expense.payeeId._id ?? expense.payeeId;
      result.partyName = expense.payeeId.name;
    } else {
      try {
        const Payee = (await import('@/models/Payee')).default;
        const payee = await Payee.findById(expense.payeeId);
        if (payee) {
          result.partyType = 'Payee';
          result.partyId = payee._id as mongoose.Types.ObjectId;
          result.partyName = payee.name;
        }
      } catch (error) {
        console.error('Error looking up payee:', error);
      }
    }
  } else if (expense.vendor) {
    result.partyType = 'Vendor';
    result.partyName = expense.vendor;
  }

  if (expense.description) {
    result.itemType = 'Product';
    result.itemName = expense.description.substring(0, 50);
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-create journal entry for Invoice with proper discount and COGS handling.
 *
 * Entry layout:
 *   Dr. Accounts Receivable  = grandTotal
 *   Dr. Sales Discount       = discount (if any)
 *   Cr. Sales Revenue        = totalAmount (gross)
 *   Cr. VAT Payable          = vatAmount (if any)
 *   Dr. Cost of Goods Sold   = COGS (if items have cost data)
 *   Cr. Inventory            = COGS (if items have cost data)
 */
export async function createJournalForInvoice(
  invoice: any,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    if (invoice.status !== 'approved') {
      return null;
    }

    const entries: JournalEntryData[] = [];
    const { partyType, partyId, contactId, partyName, itemType, itemName } =
      await extractInvoicePartyAndItemInfo(invoice);
    const narration = `Sales invoice for ${partyName || 'Unknown Customer'}`;

    // Dr. Accounts Receivable = grandTotal
    entries.push({
      accountCode: 'A1100',
      accountName: 'Accounts Receivable',
      debit: invoice.grandTotal,
      credit: 0,
    });

    // Dr. Sales Discount (if any)
    if (invoice.discount > 0) {
      entries.push({
        accountCode: 'I1004',
        accountName: 'Sales Discount',
        debit: invoice.discount,
        credit: 0,
      });
    }

    // Cr. Sales Revenue (gross amount)
    entries.push({
      accountCode: 'I1001',
      accountName: 'Sales Revenue',
      debit: 0,
      credit: invoice.totalAmount,
    });

    // Cr. VAT Payable
    if (invoice.vatAmount > 0) {
      entries.push({
        accountCode: 'L1002',
        accountName: 'VAT Payable',
        debit: 0,
        credit: invoice.vatAmount,
      });
    }

    // [FIX Bug 4] COGS entry — only when items carry itemId references with cost data.
    // Dr. COGS / Cr. Inventory balances independently; the total journal remains balanced.
    const cogsAmount = await calculateCOGSForItems(invoice.items || []);
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
      console.log(`   📦 COGS of ${cogsAmount.toFixed(2)} recorded for Invoice ${invoice.invoiceNumber}`);
    }

    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Invoice journal not balanced! Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}`
      );
    }

    const journalNumber = await generateInvoiceNumber('journal');

    const journal = new Journal({
      journalNumber,
      entryDate: invoice.createdAt || new Date(),
      referenceType: 'Invoice',
      // [FIX Bug 3] Always store referenceId as string so queries match correctly
      referenceId: invoice._id?.toString(),
      referenceNumber: invoice.invoiceNumber,

      partyType,
      partyId,
      contactId,
      partyName,
      itemType,
      itemName,

      narration,
      entries,
      totalDebit,
      totalCredit,
      status: 'posted',
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      actionHistory: [
        {
          action: 'Auto-created from Invoice',
          userId,
          username,
          timestamp: new Date(),
        },
      ],
    });

    await journal.save();
    console.log(
      `✅ Journal entry ${journalNumber} created for Invoice ${invoice.invoiceNumber}`
    );
    if (invoice.discount > 0) {
      console.log(
        `   💰 Discount of ${invoice.discount} recorded in Sales Discount account`
      );
    }
    return journal;
  } catch (error) {
    console.error('Error creating journal for invoice:', error);
    return null;
  }
}

/**
 * Handle journal for invoice status change.
 *
 * [FIX Bug 2] Only void the journal when transitioning TO 'pending' or 'cancelled'.
 * Transitions to 'paid', 'partial', and 'overdue' are payment-progression states —
 * the AR and Sales Revenue entries must remain; cash is booked by Receipt Vouchers.
 */
export async function handleInvoiceStatusChange(
  invoice: any,
  oldStatus: string,
  newStatus: string,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    console.log(
      `📄 Handling invoice status change: ${oldStatus} → ${newStatus} for ${invoice.invoiceNumber}`
    );

    // [FIX Bug 2] Only void on explicit reversal/cancellation — never on payment progression
    const REVERSAL_STATUSES = ['pending', 'cancelled'];

    if (oldStatus === 'approved' && REVERSAL_STATUSES.includes(newStatus)) {
      console.log(`🔴 Voiding journal — invoice moved to '${newStatus}'`);
      // [FIX Bug 3] Pass string form of _id
      await voidJournalsForReference(
        invoice._id.toString(),
        userId,
        username,
        `Invoice status changed from approved to ${newStatus}`
      );
      return;
    }

    // Transitions: approved → paid / partial / overdue → NO journal action here.
    // The Receipt Voucher flow handles Dr. Cash / Cr. AR when payment arrives.
    if (
      oldStatus === 'approved' &&
      ['paid', 'partial', 'overdue'].includes(newStatus)
    ) {
      console.log(
        `ℹ️  No journal action for approved → ${newStatus} (handled by Receipt Vouchers)`
      );
      return;
    }

    // Re-approve from pending/cancelled
    if (
      newStatus === 'approved' &&
      ['pending', 'cancelled'].includes(oldStatus)
    ) {
      await createJournalForInvoice(invoice, userId, username);
      return;
    }
  } catch (error) {
    console.error('Error handling invoice status change:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VOUCHER (Receipt / Payment)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-create journal entry for Voucher (Receipt or Payment).
 *
 * Receipt:
 *   Dr. Cash/Bank              = grandTotal
 *   Cr. Accounts Receivable    = grandTotal
 *
 * Payment:
 *   Dr. Accounts Payable       = grandTotal  (clears AP booked on Purchase/Expense approval)
 *   Cr. Cash/Bank              = grandTotal
 *
 * [FIX Bug 5] Standalone vendor payments (no prior AP booking) are identified by
 * checking connectedDocuments. If no purchase/expense is linked, we debit a
 * Miscellaneous Expense account instead of AP to avoid a phantom AP debit.
 */
export async function createJournalForVoucher(
  voucher: any,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    const entries: JournalEntryData[] = [];
    let narration = '';
    let referenceType = 'Manual';
    const amountToRecord = voucher.grandTotal;

    const { partyType, partyId, contactId, partyName, itemType, itemName } =
      await extractVoucherPartyAndItemInfo(voucher);

    const paymentAccount =
      voucher.paymentMethod === 'Cash' ? 'A1001' : 'A1002';
    const paymentAccountName =
      voucher.paymentMethod === 'Cash' ? 'Cash in Hand' : 'Cash at Bank';

    if (voucher.voucherType === 'receipt') {
      referenceType = 'Receipt';
      narration = `Payment received from ${partyName || partyType || 'Customer'} via ${voucher.paymentMethod}`;

      entries.push({
        accountCode: paymentAccount,
        accountName: paymentAccountName,
        debit: amountToRecord,
        credit: 0,
      });

      entries.push({
        accountCode: 'A1100',
        accountName: 'Accounts Receivable',
        debit: 0,
        credit: amountToRecord,
      });
    } else if (voucher.voucherType === 'payment') {
      referenceType = 'Payment';

      const paidTo =
        partyName || voucher.payeeName || voucher.vendorName || 'Payee';
      narration = `Payment made to ${paidTo} via ${voucher.paymentMethod}`;

      // [FIX Bug 5] Determine debit account based on whether a prior AP liability exists.
      // If the voucher is linked to purchases or expenses (which have already booked AP),
      // debit AP to close it. If it's a standalone vendor/payee payment with no prior
      // AP booking, debit Miscellaneous Expense to avoid creating a phantom AP balance.
      const hasLinkedAPDocument =
        (voucher.connectedDocuments?.purchaseIds?.length ?? 0) > 0 ||
        (voucher.connectedDocuments?.expenseIds?.length ?? 0) > 0;

      if (hasLinkedAPDocument) {
        // Normal case: prior AP was booked when purchase was received / expense was approved
        entries.push({
          accountCode: 'L1001',
          accountName: 'Accounts Payable',
          debit: voucher.grandTotal,
          credit: 0,
        });
      } else {
        // Standalone payment (direct vendor / payee with no prior AP entry)
        // Debit expense directly so the P&L captures the cost
        console.log(
          `ℹ️  Standalone payment to ${paidTo} — debiting Miscellaneous Expense (no prior AP)`
        );
        entries.push({
          accountCode: 'X2014',
          accountName: 'Miscellaneous Expense',
          debit: voucher.grandTotal,
          credit: 0,
        });
      }

      entries.push({
        accountCode: paymentAccount,
        accountName: paymentAccountName,
        debit: 0,
        credit: voucher.grandTotal,
      });
    }

    if (entries.length === 0) {
      return null;
    }

    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Voucher journal not balanced! Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}`
      );
    }

    const journalNumber = await generateInvoiceNumber('journal');

    const journal = new Journal({
      journalNumber,
      entryDate: voucher.createdAt || new Date(),
      referenceType,
      // [FIX Bug 3] Always string
      referenceId: voucher._id?.toString(),
      referenceNumber: voucher.invoiceNumber,

      partyType,
      partyId,
      contactId,
      partyName,
      itemType,
      itemName,

      narration,
      entries,
      totalDebit,
      totalCredit,
      status: 'posted',
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      actionHistory: [
        {
          action: `Auto-created from ${referenceType}`,
          userId,
          username,
          timestamp: new Date(),
        },
      ],
    });

    await journal.save();
    console.log(
      `✅ Journal entry ${journalNumber} created for ${referenceType} ${voucher.invoiceNumber}`
    );
    console.log(`   Party: ${partyType} - ${partyName || 'N/A'}`);
    return journal;
  } catch (error) {
    console.error('Error creating journal for voucher:', error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RETURN NOTES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-create journal entry for Sales Return (when approved).
 *
 *   Dr. Sales Returns    = subtotal (totalAmount - discount)
 *   Dr. VAT Payable      = vatAmount  (reduces VAT liability)
 *   Cr. Accounts Receivable = grandTotal
 *
 * [FIX Bug 6] Explicit subtotal calculation using totalAmount and discount
 * rather than deriving from grandTotal, to be resilient to missing grandTotal.
 */
export async function createJournalForSalesReturn(
  returnNote: any,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    if (returnNote.status !== 'approved') return null;

    const entries: JournalEntryData[] = [];

    const totalAmount = Number(returnNote.totalAmount) || 0;
    const discount = Number(returnNote.discount) || 0;
    const vatAmount = Number(returnNote.vatAmount) || 0;
    // [FIX Bug 6] Compute subtotal from totalAmount - discount, not from grandTotal - vatAmount
    const subtotal = totalAmount - discount;
    const grandTotal = subtotal + vatAmount;

    // Sanity check: if grandTotal was persisted, compare it
    if (returnNote.grandTotal && Math.abs(grandTotal - Number(returnNote.grandTotal)) > 0.01) {
      console.warn(
        `⚠️  Sales Return ${returnNote.returnNumber} grandTotal mismatch: ` +
        `computed ${grandTotal.toFixed(2)} vs stored ${Number(returnNote.grandTotal).toFixed(2)}. ` +
        `Using computed value.`
      );
    }

    const partyName =
      returnNote.partySnapshot?.displayName || 'Unknown Customer';
    // [FIX Bug 7] Raw ObjectId — no .toString()
    const partyId = returnNote.partyId?._id ?? returnNote.partyId;
    const contactId = returnNote.contactId?._id ?? returnNote.contactId;

    const narration = `Sales Return ${returnNote.returnNumber} - ${returnNote.items?.length || 0} item(s) returned`;

    // Dr. Sales Returns = subtotal
    entries.push({
      accountCode: 'I1003',
      accountName: 'Sales Returns',
      debit: subtotal,
      credit: 0,
    });

    // Dr. VAT Payable = vatAmount (reduces VAT liability)
    if (vatAmount > 0) {
      entries.push({
        accountCode: 'L1002',
        accountName: 'VAT Payable',
        debit: vatAmount,
        credit: 0,
      });
    }

    // Cr. Accounts Receivable = grandTotal
    entries.push({
      accountCode: 'A1100',
      accountName: 'Accounts Receivable',
      debit: 0,
      credit: grandTotal,
    });

    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Sales Return journal not balanced! Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}`
      );
    }

    const journalNumber = await generateInvoiceNumber('journal');

    const journal = new Journal({
      journalNumber,
      entryDate: returnNote.returnDate || new Date(),
      referenceType: 'SalesReturn',
      // [FIX Bug 3] String referenceId
      referenceId: returnNote._id?.toString(),
      referenceNumber: returnNote.returnNumber,
      partyType: 'Customer',
      partyId,
      contactId,
      partyName,
      itemType: 'Product',
      itemName: returnNote.items?.[0]?.description,
      narration,
      entries,
      totalDebit,
      totalCredit,
      status: 'posted',
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      actionHistory: [
        {
          action: 'Auto-created from Sales Return (Approved)',
          userId,
          username,
          timestamp: new Date(),
        },
      ],
    });

    await journal.save();
    console.log(
      `✅ Journal ${journalNumber} created for Sales Return ${returnNote.returnNumber}`
    );
    return journal;
  } catch (error) {
    console.error('❌ Error creating journal for sales return:', error);
    return null;
  }
}

/**
 * Auto-create journal entry for Purchase Return (when approved).
 *
 *   Dr. Accounts Payable  = grandTotal
 *   Cr. Inventory         = subtotal (grandTotal - vatAmount)
 *   Cr. VAT Receivable    = vatAmount
 */
export async function createJournalForPurchaseReturn(
  returnNote: any,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    if (returnNote.status !== 'approved') return null;

    const entries: JournalEntryData[] = [];

    const totalAmount = Number(returnNote.totalAmount) || 0;
    const discount = Number(returnNote.discount) || 0;
    const vatAmount = Number(returnNote.vatAmount) || 0;
    const subtotal = totalAmount - discount;
    const grandTotal = subtotal + vatAmount;

    if (returnNote.grandTotal && Math.abs(grandTotal - Number(returnNote.grandTotal)) > 0.01) {
      console.warn(
        `⚠️  Purchase Return ${returnNote.returnNumber} grandTotal mismatch: ` +
        `computed ${grandTotal.toFixed(2)} vs stored ${Number(returnNote.grandTotal).toFixed(2)}. ` +
        `Using computed value.`
      );
    }

    const partyName =
      returnNote.partySnapshot?.displayName || 'Unknown Supplier';
    // [FIX Bug 7] Raw ObjectId
    const partyId = returnNote.partyId?._id ?? returnNote.partyId;
    const contactId = returnNote.contactId?._id ?? returnNote.contactId;

    const narration = `Purchase Return ${returnNote.returnNumber} - ${returnNote.items?.length || 0} item(s) returned`;

    // Dr. Accounts Payable = grandTotal
    entries.push({
      accountCode: 'L1001',
      accountName: 'Accounts Payable',
      debit: grandTotal,
      credit: 0,
    });

    // Cr. Inventory = subtotal
    entries.push({
      accountCode: 'A1200',
      accountName: 'Inventory',
      debit: 0,
      credit: subtotal,
    });

    // Cr. VAT Receivable = vatAmount
    if (vatAmount > 0) {
      entries.push({
        accountCode: 'A1300',
        accountName: 'VAT Receivable',
        debit: 0,
        credit: vatAmount,
      });
    }

    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Purchase Return journal not balanced! Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}`
      );
    }

    const journalNumber = await generateInvoiceNumber('journal');

    const journal = new Journal({
      journalNumber,
      entryDate: returnNote.returnDate || new Date(),
      referenceType: 'PurchaseReturn',
      // [FIX Bug 3] String referenceId
      referenceId: returnNote._id?.toString(),
      referenceNumber: returnNote.returnNumber,
      partyType: 'Supplier',
      partyId,
      contactId,
      partyName,
      itemType: 'Material',
      itemName: returnNote.items?.[0]?.description,
      narration,
      entries,
      totalDebit,
      totalCredit,
      status: 'posted',
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      actionHistory: [
        {
          action: 'Auto-created from Purchase Return (Approved)',
          userId,
          username,
          timestamp: new Date(),
        },
      ],
    });

    await journal.save();
    console.log(
      `✅ Journal ${journalNumber} created for Purchase Return ${returnNote.returnNumber}`
    );
    return journal;
  } catch (error) {
    console.error('❌ Error creating journal for purchase return:', error);
    return null;
  }
}

/**
 * Handle journal for return note status change.
 */
export async function handleReturnNoteStatusChange(
  returnNote: any,
  oldStatus: string,
  newStatus: string,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    const isSales = returnNote.returnType === 'salesReturn';

    if (oldStatus === 'approved' && newStatus !== 'approved') {
      // [FIX Bug 3] String referenceId
      await voidJournalsForReference(
        returnNote._id.toString(),
        userId,
        username,
        `Return note status changed from ${oldStatus} to ${newStatus}`
      );
      return;
    }

    if (oldStatus !== 'approved' && newStatus === 'approved') {
      if (isSales) {
        await createJournalForSalesReturn(returnNote, userId, username);
      } else {
        await createJournalForPurchaseReturn(returnNote, userId, username);
      }
    }
  } catch (error) {
    console.error('Error handling return note status change:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PURCHASE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-create journal entry for Purchase when inventoryStatus is 'received'.
 *
 *   Dr. Inventory         = subtotal (grossTotal - discount)
 *   Dr. VAT Receivable    = vatAmount (if any)
 *   Cr. Accounts Payable  = grandTotal
 */
export async function createJournalForPurchase(
  purchase: any,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    if (purchase.inventoryStatus !== 'received') {
      console.log(
        `⏭️  Skipping journal — inventoryStatus is '${purchase.inventoryStatus}', not 'received'`
      );
      return null;
    }

    const entries: JournalEntryData[] = [];
    const { partyType, partyId, partyName, itemType, itemName } =
      await extractPurchasePartyAndItemInfo(purchase);

    const grossTotal = Number(purchase.totalAmount) || 0;
    const discount = Number(purchase.discount) || 0;
    const subtotal = grossTotal - discount;
    const vatAmount = Number(purchase.vatAmount) || 0;
    const grandTotal = Number(purchase.grandTotal) || subtotal + vatAmount;

    const expectedGrandTotal = subtotal + vatAmount;
    if (Math.abs(grandTotal - expectedGrandTotal) > 0.01) {
      console.warn(
        `⚠️  Purchase grandTotal mismatch: stored ${grandTotal.toFixed(2)}, computed ${expectedGrandTotal.toFixed(2)}`
      );
    }

    const narration =
      discount > 0
        ? `Purchase from ${partyName || 'Supplier'} - ${purchase.items.length} item(s) (Discount: ${discount.toFixed(2)})`
        : `Purchase from ${partyName || 'Supplier'} - ${purchase.items.length} item(s)`;

    // Dr. Inventory = subtotal (after discount)
    entries.push({
      accountCode: 'A1200',
      accountName: 'Inventory',
      debit: subtotal,
      credit: 0,
    });

    // Dr. VAT Receivable
    if (vatAmount > 0) {
      entries.push({
        accountCode: 'A1300',
        accountName: 'VAT Receivable',
        debit: vatAmount,
        credit: 0,
      });
    }

    // Cr. Accounts Payable = grandTotal
    entries.push({
      accountCode: 'L1001',
      accountName: 'Accounts Payable',
      debit: 0,
      credit: grandTotal,
    });

    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Purchase journal not balanced! Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}`
      );
    }

    const journalNumber = await generateInvoiceNumber('journal');

    const journal = new Journal({
      journalNumber,
      entryDate: purchase.date || new Date(),
      referenceType: 'Purchase',
      // [FIX Bug 3] String referenceId
      referenceId: purchase._id?.toString(),
      referenceNumber:
        purchase.referenceNumber ||
        `Purchase-${purchase._id.toString().slice(-6)}`,

      partyType,
      partyId,
      partyName,
      itemType,
      itemName,

      narration,
      entries,
      totalDebit,
      totalCredit,
      status: 'posted',
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      actionHistory: [
        {
          action: 'Auto-created from Purchase (Inventory Received)',
          userId,
          username,
          timestamp: new Date(),
        },
      ],
    });

    await journal.save();
    console.log(
      `✅ Journal entry ${journalNumber} created for purchase ${purchase.referenceNumber}`
    );
    if (discount > 0) {
      console.log(
        `   💰 Discount of ${discount.toFixed(2)} absorbed into inventory cost`
      );
    }
    return journal;
  } catch (error) {
    console.error('❌ Error creating journal for purchase:', error);
    return null;
  }
}

/**
 * Handle journal for purchase inventory status change.
 */
export async function handlePurchaseInventoryStatusChange(
  purchase: any,
  oldInventoryStatus: string,
  newInventoryStatus: string,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    console.log(
      `📝 Purchase inventory status: ${oldInventoryStatus} → ${newInventoryStatus}`
    );

    if (oldInventoryStatus === 'received' && newInventoryStatus !== 'received') {
      console.log('🔴 Voiding journal — inventory status changed from received');
      // [FIX Bug 3] String referenceId
      await voidJournalsForReference(
        purchase._id.toString(),
        userId,
        username,
        `Inventory status changed from ${oldInventoryStatus} to ${newInventoryStatus}`
      );
      return;
    }

    if (oldInventoryStatus !== 'received' && newInventoryStatus === 'received') {
      console.log('✅ Creating journal — inventory status changed to received');
      await createJournalForPurchase(purchase, userId, username);
      return;
    }
  } catch (error) {
    console.error('Error handling purchase inventory status change:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-create journal entry for Expense (accrual basis).
 *
 * [FIX Bug 1] BEFORE: Code referenced expense.paymentMethod (doesn't exist) and
 * credited Cash directly, double-counting cash when the Payment Voucher also credits Cash.
 *
 * AFTER (correct accrual):
 *   Dr. Expense Account   = expense.amount
 *   Cr. Accounts Payable  = expense.amount
 *
 * The matching Payment Voucher then closes the liability:
 *   Dr. Accounts Payable  = amount
 *   Cr. Cash/Bank         = amount
 */
export async function createJournalForExpense(
  expense: any,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    const entries: JournalEntryData[] = [];
    const { partyType, partyId, partyName, itemType, itemName } =
      await extractExpenseItemInfo(expense);

    const narration = `${expense.category} Expense - ${expense.description}`;

    const expenseAccountMap: Record<string, { code: string; name: string }> = {
      'Office Supplies': { code: 'X2006', name: 'Office Supplies' },
      'Travel': { code: 'X2004', name: 'Travel Expense' },
      'Marketing': { code: 'X2005', name: 'Marketing Expense' },
      'Utilities': { code: 'X2003', name: 'Utilities Expense' },
      'Software': { code: 'X2011', name: 'Software & Technology Expense' },
      'Equipment': { code: 'A2002', name: 'Equipment' },
      'Meals': { code: 'X2012', name: 'Meal Expense' },
      'Professional Services': { code: 'X2008', name: 'Professional Fees' },
      'Rent': { code: 'X2002', name: 'Rent Expense' },
      'Salary': { code: 'X2001', name: 'Salary Expense' },
      'Insurance': { code: 'X2009', name: 'Insurance Expense' },
      'Entertainment': { code: 'X2015', name: 'Entertainment Expense' },
      'Miscellaneous': { code: 'X2014', name: 'Miscellaneous Expense' },
    };

    const expenseAccount =
      expenseAccountMap[expense.category] || expenseAccountMap['Miscellaneous'];

    // Dr. Expense Account
    entries.push({
      accountCode: expenseAccount.code,
      accountName: expenseAccount.name,
      debit: expense.amount,
      credit: 0,
    });

    // [FIX Bug 1] Cr. Accounts Payable — NOT Cash.
    // Cash only moves when a Payment Voucher is allocated against this expense.
    // This preserves the accrual basis and prevents double-counting the cash outflow.
    entries.push({
      accountCode: 'L1001',
      accountName: 'Accounts Payable',
      debit: 0,
      credit: expense.amount,
    });

    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Expense journal not balanced! Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}`
      );
    }

    const journalNumber = await generateInvoiceNumber('journal');

    const journal = new Journal({
      journalNumber,
      entryDate: expense.date || new Date(),
      referenceType: 'Expense',
      // [FIX Bug 3] String referenceId
      referenceId: expense._id?.toString(),
      referenceNumber:
        expense.referenceNumber || `EXP-${expense._id.toString().slice(-6)}`,

      partyType,
      partyId,
      partyName,
      itemType,
      itemName,

      narration,
      entries,
      totalDebit,
      totalCredit,
      status: 'posted',
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      actionHistory: [
        {
          action: 'Auto-created from Expense',
          userId,
          username,
          timestamp: new Date(),
        },
      ],
    });

    await journal.save();
    console.log(`✅ Journal entry ${journalNumber} created for expense`);
    if (partyType && partyName) {
      console.log(`   Party: ${partyType} - ${partyName}`);
    }
    console.log(
      `   📋 Accrual entry: Dr ${expenseAccount.name} / Cr Accounts Payable`
    );
    return journal;
  } catch (error) {
    console.error('Error creating journal for expense:', error);
    return null;
  }
}

/**
 * Handle journal for expense status change.
 */
export async function handleExpenseStatusChange(
  expense: any,
  oldStatus: string,
  newStatus: string,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    console.log(`📄 Expense Status Change: ${oldStatus} -> ${newStatus}`);

    if (oldStatus === 'approved' && newStatus !== 'approved') {
      console.log('🛑 Voiding journal for un-approved expense...');
      // [FIX Bug 3] String referenceId
      await voidJournalsForReference(
        expense._id.toString(),
        userId,
        username,
        `Expense status changed from ${oldStatus} to ${newStatus}`
      );
    }

    if (newStatus === 'approved' && oldStatus !== 'approved') {
      console.log('✅ Creating journal for approved expense...');
      await createJournalForExpense(expense, userId, username);
    }
  } catch (error) {
    console.error('Error handling expense status change:', error);
  }
}