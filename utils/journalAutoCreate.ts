// utils/journalAutoCreate.ts - UPDATED: Purchase with Discount

import Journal from '@/models/Journal';
import generateInvoiceNumber from './invoiceNumber';
import { voidJournalsForReference } from './journalManager';

interface JournalEntryData {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

/**
 * Helper: Extract party and item info from invoice WITH ID lookup
 */
async function extractInvoicePartyAndItemInfo(invoice: any) {
  const result: {
    partyType?: 'Customer' | 'Supplier' | 'Payee' | 'Vendor';
    partyId?: string;
    contactId?: string;
    partyName?: string;
    itemType?: 'Material' | 'Product';
    itemName?: string;
  } = {};

  if (invoice.partyId) {
    result.partyType = 'Customer';
    result.partyId = invoice.partyId;
    if (invoice.contactId) result.contactId = invoice.contactId;

    // Extract party name from snapshot or populated object
    if (invoice.partySnapshot?.displayName) {
      result.partyName = invoice.partySnapshot.displayName;
    } else if (typeof invoice.partyId === 'object') {
      result.partyName = invoice.partyId.company || invoice.partyId.name || 'Unknown Customer';
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
    partyId?: string;
    contactId?: string;
    partyName?: string;
    itemType?: 'Material' | 'Product';
    itemName?: string;
  } = {};

  // Extract partyId and contactId first
  if (voucher.partyId) result.partyId = voucher.partyId;
  if (voucher.contactId) result.contactId = voucher.contactId;

  // Determine partyType and partyName based on voucher type and available data
  if (voucher.voucherType === 'receipt') {
    // Check for explicit Vendor Name first (Manual Vendor)
    if (voucher.vendorName) {
      result.partyType = 'Vendor';
      result.partyName = voucher.vendorName;
    }
    // Check for Payee (Payee Name or ID)
    else if (voucher.payeeName || voucher.payeeId) {
      result.partyType = 'Payee';
      result.partyName = voucher.payeeName;
      if (voucher.payeeId) {
        result.partyId = voucher.payeeId.toString();
      }
    }
    else {
      // Default to Customer, but check party roles if available
      result.partyType = 'Customer';

      if (voucher.partySnapshot) {
        result.partyName = voucher.partySnapshot.displayName || voucher.partySnapshot.name;
        // Check if this party is purely a vendor or supplier
        if (voucher.partySnapshot.roles) {
          if (voucher.partySnapshot.roles.includes('vendor') && !voucher.partySnapshot.roles.includes('customer')) {
            result.partyType = 'Vendor';
          } else if (voucher.partySnapshot.roles.includes('supplier') && !voucher.partySnapshot.roles.includes('customer')) {
            result.partyType = 'Supplier';
          }
        }
      } else if (voucher.partyId && typeof voucher.partyId === 'object') {
        // Populated Party object
        const party = voucher.partyId;
        result.partyName = party.company || party.name || 'Unknown Party';

        if (party.roles) {
          if (party.roles.includes('vendor') && !party.roles.includes('customer')) {
            result.partyType = 'Vendor';
          } else if (party.roles.includes('supplier') && !party.roles.includes('customer')) {
            result.partyType = 'Supplier';
          }
        }
      }
    }
  } else if (voucher.voucherType === 'payment') {
    // Payments are to Suppliers, Payees, or Vendors
    if (voucher.payeeName || voucher.payeeId) {
      result.partyType = 'Payee';
      result.partyName = voucher.partySnapshot?.name || voucher.payeeName;
      if (voucher.payeeId) {
        result.partyId = voucher.payeeId.toString();
      }
    } else if (voucher.partySnapshot?.displayName && !voucher.vendorName) {
      result.partyType = 'Supplier';
      result.partyName = voucher.partySnapshot.displayName;
    } else if (voucher.vendorName) {
      result.partyType = 'Vendor';
      result.partyName = voucher.vendorName;
    } else if (voucher.partyId && typeof voucher.partyId === 'object') {
      result.partyType = 'Supplier';
      result.partyName = voucher.partyId.company || voucher.partyId.name || 'Unknown Supplier';
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
 * Auto-create journal entry for Invoice with proper discount handling
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
    const { partyType, partyId, contactId, partyName, itemType, itemName } = await extractInvoicePartyAndItemInfo(invoice);
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

    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    const journalNumber = await generateInvoiceNumber('journal');

    const journal = new Journal({
      journalNumber,
      entryDate: invoice.createdAt || new Date(),
      referenceType: 'Invoice',
      referenceId: invoice._id,
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
      actionHistory: [{
        action: 'Auto-created from Invoice',
        userId,
        username,
        timestamp: new Date(),
      }],
    });

    await journal.save();
    console.log(`✅ Journal entry ${journalNumber} created for Invoice ${invoice.invoiceNumber}`);
    if (invoice.discount > 0) {
      console.log(`   💰 Discount of ${invoice.discount} recorded in Sales Discount account`);
    }
    return journal;
  } catch (error) {
    console.error('Error creating journal for invoice:', error);
    return null;
  }
}

/**
 * Auto-create journal entry for Voucher (Receipt or Payment)
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

    const { partyType, partyId, contactId, partyName, itemType, itemName } = await extractVoucherPartyAndItemInfo(voucher);

    if (voucher.voucherType === 'receipt') {
      referenceType = 'Receipt';
      narration = `Payment received from ${partyName || partyType || 'Customer'} via ${voucher.paymentMethod}`;

      const paymentAccount = voucher.paymentMethod === 'Cash' ? 'A1001' : 'A1002';
      const paymentAccountName = voucher.paymentMethod === 'Cash' ? 'Cash in Hand' : 'Cash at Bank';

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
    }
    else if (voucher.voucherType === 'payment') {
      referenceType = 'Payment';

      const paidTo = partyName || voucher.payeeName || voucher.vendorName || 'Payee';
      narration = `Payment made to ${paidTo} via ${voucher.paymentMethod}`;

      const paymentAccount = voucher.paymentMethod === 'Cash' ? 'A1001' : 'A1002';
      const paymentAccountName = voucher.paymentMethod === 'Cash' ? 'Cash in Hand' : 'Cash at Bank';

      entries.push({
        accountCode: 'L1001',
        accountName: 'Accounts Payable',
        debit: voucher.grandTotal,
        credit: 0,
      });

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

    const journalNumber = await generateInvoiceNumber('journal');

    const journal = new Journal({
      journalNumber,
      entryDate: voucher.createdAt || new Date(),
      referenceType,
      referenceId: voucher._id,
      referenceNumber: voucher.invoiceNumber,

      partyType,
      partyId,
      contactId,
      partyName,
      itemType,
      itemName,

      narration,
      entries,
      totalDebit: entries.reduce((sum, e) => sum + e.debit, 0),
      totalCredit: entries.reduce((sum, e) => sum + e.credit, 0),
      status: 'posted',
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      actionHistory: [{
        action: `Auto-created from ${referenceType}`,
        userId,
        username,
        timestamp: new Date(),
      }],
    });

    await journal.save();
    console.log(`✅ Journal entry ${journalNumber} created for ${referenceType} ${voucher.invoiceNumber}`);
    console.log(`   Party: ${partyType} - ${partyName || 'N/A'}`);
    return journal;
  } catch (error) {
    console.error('Error creating journal for voucher:', error);
    return null;
  }
}

/**
 * Handle journal for invoice status change
 */
export async function handleInvoiceStatusChange(
  invoice: any,
  oldStatus: string,
  newStatus: string,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    console.log(`📄 Handling status change: ${oldStatus} → ${newStatus} for invoice`);

    if (oldStatus === 'approved' && newStatus !== 'approved') {
      await voidJournalsForReference(invoice._id, userId, username, 'Invoice status changed from approved');
      return;
    }
    if ((oldStatus === 'pending' || oldStatus === 'cancelled') && newStatus === 'approved') {
      await createJournalForInvoice(invoice, userId, username);
      return;
    }
  } catch (error) {
    console.error('Error handling invoice status change:', error);
  }
}

/**
 * Helper: Extract party and item info from purchase WITH ID lookup
 */
async function extractPurchasePartyAndItemInfo(purchase: any) {
  const result: {
    partyType?: 'Customer' | 'Supplier' | 'Payee';
    partyId?: string;
    contactId?: string;
    partyName?: string;
    itemType?: 'Material' | 'Product';
    itemName?: string;
  } = {};

  result.partyType = 'Supplier';

  // Extract partyId and contactId
  if (purchase.partyId) result.partyId = purchase.partyId;
  if (purchase.contactId) result.contactId = purchase.contactId;

  // Extract partyName - prioritize snapshot, then populated object
  if (purchase.partySnapshot?.displayName) {
    result.partyName = purchase.partySnapshot.displayName;
  } else if (purchase.partyId && typeof purchase.partyId === 'object') {
    result.partyName = purchase.partyId.company || purchase.partyId.name || 'Unknown Supplier';
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
 * Helper: Extract party and item info from debit note
 */
async function extractDebitNotePartyAndItemInfo(debitNote: any) {
  const result: {
    partyType?: 'Supplier' | 'Vendor';
    partyId?: string;
    contactId?: string;
    partyName?: string;
    itemType?: 'Material';
    itemName?: string;
  } = {};

  // Extract partyId and contactId first
  if (debitNote.partyId) result.partyId = debitNote.partyId;
  if (debitNote.contactId) result.contactId = debitNote.contactId;

  // Extract partyName - prioritize snapshot, then populated object
  if (debitNote.partySnapshot?.displayName) {
    result.partyName = debitNote.partySnapshot.displayName;
  } else if (debitNote.partyId && typeof debitNote.partyId === 'object') {
    result.partyName = debitNote.partyId.company || debitNote.partyId.name || 'Unknown Supplier';
  }

  // Determine partyType based on partyId presence
  result.partyType = result.partyId ? 'Supplier' : 'Vendor';

  if (debitNote.items && debitNote.items.length > 0) {
    const firstItem = debitNote.items[0];
    if (firstItem.description) {
      result.itemType = 'Material';
      result.itemName = firstItem.description;
    }
  }

  return result;
}

/**
 * Auto-create journal entry for Debit Note (Approved only)
 */
export async function createJournalForDebitNote(
  debitNote: any,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    if (debitNote.status !== 'approved') {
      console.log(`⭕ Skipping journal creation - debit note status is '${debitNote.status}', not 'approved'`);
      return null;
    }

    const entries: JournalEntryData[] = [];
    const { partyType, partyId, contactId, partyName, itemType, itemName } = await extractDebitNotePartyAndItemInfo(debitNote);

    const grossTotal = Number(debitNote.totalAmount) || 0;
    const discount = Number(debitNote.discount) || 0;
    const subtotal = grossTotal - discount;
    const vatAmount = Number(debitNote.vatAmount) || 0;
    const grandTotal = Number(debitNote.grandTotal) || (subtotal + vatAmount);

    const narration = debitNote.debitType === 'return'
      ? `Debit Note for Return ${debitNote.returnNumber || 'N/A'} - ${debitNote.items.length} item(s) returned`
      : `Debit Note ${debitNote.debitNoteNumber} - ${debitNote.reason || 'Adjustment'}`;

    // Dr. Accounts Payable = Grand Total
    entries.push({
      accountCode: 'L1001',
      accountName: 'Accounts Payable',
      debit: grandTotal,
      credit: 0,
    });

    // Cr. Inventory = Subtotal (after discount)
    if (debitNote.debitType === 'return' || debitNote.debitType === 'adjustment') {
      entries.push({
        accountCode: 'A1200',
        accountName: 'Inventory',
        debit: 0,
        credit: subtotal,
      });
    } else {
      // Standalone debit notes credit COGS
      entries.push({
        accountCode: 'X1001',
        accountName: 'Cost of Goods Sold',
        debit: 0,
        credit: subtotal,
      });
    }

    // Cr. VAT Receivable (when VAT is present)
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
        `Journal entry is not balanced! Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}`
      );
    }

    const journalNumber = await generateInvoiceNumber('journal');

    const journal = new Journal({
      journalNumber,
      entryDate: debitNote.debitDate || new Date(),
      referenceType: 'DebitNote',
      referenceId: debitNote._id,
      referenceNumber: debitNote.debitNoteNumber,

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
      actionHistory: [{
        action: 'Auto-created from Debit Note (Approved)',
        userId,
        username,
        timestamp: new Date(),
      }],
    });

    await journal.save();
    console.log(`✅ Journal entry ${journalNumber} created for debit note ${debitNote.debitNoteNumber}`);
    if (discount > 0) {
      console.log(`   💰 Discount of ${discount.toFixed(2)} applied`);
    }
    return journal;
  } catch (error) {
    console.error('❌ Error creating journal for debit note:', error);
    return null;
  }
}

/**
 * Handle journal for debit note status change
 */
export async function handleDebitNoteStatusChange(
  debitNote: any,
  oldStatus: string,
  newStatus: string,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    console.log(`📄 Handling debit note status change: ${oldStatus} → ${newStatus}`);

    // Void journal when moving away from 'approved'
    if (oldStatus === 'approved' && newStatus !== 'approved') {
      console.log('🔴 Voiding journal - status changed from approved');
      await voidJournalsForReference(
        debitNote._id,
        userId,
        username,
        `Debit note status changed from ${oldStatus} to ${newStatus}`
      );
      return;
    }

    // Create journal when moving to 'approved'
    if (oldStatus !== 'approved' && newStatus === 'approved') {
      console.log('✅ Creating journal - status changed to approved');
      await createJournalForDebitNote(debitNote, userId, username);
      return;
    }
  } catch (error) {
    console.error('Error handling debit note status change:', error);
  }
}

/**
 * Helper: Extract party and item info from credit note WITH ID lookup
 */
async function extractCreditNotePartyAndItemInfo(creditNote: any) {
  const result: {
    partyType?: 'Customer' | 'Supplier' | 'Payee' | 'Vendor';
    partyId?: string;
    contactId?: string;
    partyName?: string;
    itemType?: 'Material' | 'Product';
    itemName?: string;
  } = {};

  // Extract partyId and contactId first
  if (creditNote.partyId) result.partyId = creditNote.partyId;
  if (creditNote.contactId) result.contactId = creditNote.contactId;

  if (creditNote.partySnapshot?.displayName) {
    result.partyType = 'Customer';

    // Extract partyName - prioritize snapshot
    result.partyName = creditNote.partySnapshot.displayName;
  } else if (creditNote.partyId && typeof creditNote.partyId === 'object') {
    result.partyType = 'Customer';
    result.partyName = creditNote.partyId.company || creditNote.partyId.name || 'Unknown Customer';
  } else if (creditNote.payeeName) {
    result.partyType = 'Payee';
    result.partyName = creditNote.payeeName;

    if (creditNote.payeeId) {
      result.partyId = creditNote.payeeId.toString();
    }
  } else if (creditNote.vendorName) {
    result.partyType = 'Vendor';
    result.partyName = creditNote.vendorName;
  }

  if (creditNote.items && creditNote.items.length > 0) {
    const firstItem = creditNote.items[0];
    if (firstItem.description) {
      result.itemType = 'Product';
      result.itemName = firstItem.description;
    }
  }

  return result;
}

/**
 * Auto-create journal entry for Credit Note (Approved only)
 */
export async function createJournalForCreditNote(
  creditNote: any,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    if (creditNote.status !== 'approved') {
      console.log(`⏭️ Skipping journal creation - credit note status is '${creditNote.status}', not 'approved'`);
      return null;
    }

    const entries: JournalEntryData[] = [];
    const { partyType, partyId, contactId, partyName, itemType, itemName } = await extractCreditNotePartyAndItemInfo(creditNote);

    const grossTotal = Number(creditNote.totalAmount) || 0;
    const discount = Number(creditNote.discount) || 0;
    const subtotal = grossTotal - discount;
    const vatAmount = Number(creditNote.vatAmount) || 0;
    const grandTotal = Number(creditNote.grandTotal) || (subtotal + vatAmount);

    const narration = creditNote.creditType === 'return'
      ? `Credit Note for Invoice ${creditNote.invoiceNumber || 'N/A'} - ${creditNote.items.length} item(s) returned`
      : `Credit Note ${creditNote.creditNoteNumber} - ${creditNote.reason || 'Adjustment'}`;

    // Dr. Sales Returns / Sales Revenue (depending on type)
    if (creditNote.creditType === 'return') {
      entries.push({
        accountCode: 'I1003',
        accountName: 'Sales Returns',
        debit: subtotal,
        credit: 0,
      });
    } else {
      // For adjustments/standalone, debit Sales Revenue directly
      entries.push({
        accountCode: 'I1001',
        accountName: 'Sales Revenue',
        debit: subtotal,
        credit: 0,
      });
    }

    // Dr. VAT Payable (when VAT is present) - reduces VAT liability
    if (vatAmount > 0) {
      entries.push({
        accountCode: 'L1002',
        accountName: 'VAT Payable',
        debit: vatAmount,
        credit: 0,
      });
    }

    // Cr. Accounts Receivable = Grand Total
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
        `Journal entry is not balanced! Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}`
      );
    }

    const journalNumber = await generateInvoiceNumber('journal');

    const journal = new Journal({
      journalNumber,
      entryDate: creditNote.creditDate || new Date(),
      referenceType: 'CreditNote',
      referenceId: creditNote._id,
      referenceNumber: creditNote.creditNoteNumber,

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
      actionHistory: [{
        action: 'Auto-created from Credit Note (Approved)',
        userId,
        username,
        timestamp: new Date(),
      }],
    });

    await journal.save();
    console.log(`✅ Journal entry ${journalNumber} created for credit note ${creditNote.creditNoteNumber}`);
    if (discount > 0) {
      console.log(`   💰 Discount of ${discount.toFixed(2)} applied`);
    }
    return journal;
  } catch (error) {
    console.error('❌ Error creating journal for credit note:', error);
    return null;
  }
}

/**
 * Handle journal for credit note status change
 */
export async function handleCreditNoteStatusChange(
  creditNote: any,
  oldStatus: string,
  newStatus: string,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    console.log(`📄 Handling credit note status change: ${oldStatus} → ${newStatus}`);

    // Void journal when moving away from 'approved'
    if (oldStatus === 'approved' && newStatus !== 'approved') {
      console.log('🔴 Voiding journal - status changed from approved');
      await voidJournalsForReference(
        creditNote._id,
        userId,
        username,
        `Credit note status changed from ${oldStatus} to ${newStatus}`
      );
      return;
    }

    // Create journal when moving to 'approved'
    if (oldStatus !== 'approved' && newStatus === 'approved') {
      console.log('✅ Creating journal - status changed to approved');
      await createJournalForCreditNote(creditNote, userId, username);
      return;
    }
  } catch (error) {
    console.error('Error handling credit note status change:', error);
  }
}

/**
 * ✅ UPDATED: Auto-create journal entry for Purchase when inventoryStatus is 'received'
 */
export async function createJournalForPurchase(
  purchase: any,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    // ✅ UPDATED: Check inventoryStatus instead of status
    if (purchase.inventoryStatus !== 'received') {
      console.log(`⏭️ Skipping journal creation - inventory status is '${purchase.inventoryStatus}', not 'received'`);
      return null;
    }

    const entries: JournalEntryData[] = [];
    const { partyType, partyId, partyName, itemType, itemName } = await extractPurchasePartyAndItemInfo(purchase);

    // Ensure discount is always a valid number
    const grossTotal = Number(purchase.totalAmount) || 0;
    const discount = Number(purchase.discount) || 0;

    // Recalculate subtotal
    const subtotal = grossTotal - discount;

    // Use persisted VAT and Grand Total
    const vatAmount = Number(purchase.vatAmount) || 0;
    const grandTotal = Number(purchase.grandTotal) || (subtotal + vatAmount);

    // Validation
    const expectedGrandTotal = Number(purchase.grandTotal) || 0;
    const difference = Math.abs(grandTotal - expectedGrandTotal);

    if (difference > 0.01) {
      console.warn(`⚠️ Purchase grand total mismatch detected!`);
      console.warn(`   Expected: ${expectedGrandTotal.toFixed(2)}`);
      console.warn(`   Calculated: ${grandTotal.toFixed(2)}`);
      console.warn(`   Difference: ${difference.toFixed(2)}`);
      console.warn(`   Using calculated value for journal entry`);
    }

    const narration = discount > 0
      ? `Purchase from ${partyName || 'Supplier'} - ${purchase.items.length} item(s) (Discount: ${discount.toFixed(2)})`
      : `Purchase from ${partyName || 'Supplier'} - ${purchase.items.length} item(s)`;

    // Dr. Inventory = Subtotal (after discount)
    entries.push({
      accountCode: 'A1200',
      accountName: 'Inventory',
      debit: subtotal,
      credit: 0,
    });

    // Dr. VAT Receivable (when VAT is present)
    if (vatAmount > 0) {
      entries.push({
        accountCode: 'A1300',
        accountName: 'VAT Receivable',
        debit: vatAmount,
        credit: 0,
      });
    }

    // Cr. Accounts Payable = Grand Total
    entries.push({
      accountCode: 'L1001',
      accountName: 'Accounts Payable',
      debit: 0,
      credit: grandTotal,
    });

    const totalDebit = entries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = entries.reduce((sum, e) => sum + e.credit, 0);

    console.log(`\n📊 Purchase Journal Entry:`);
    console.log(`   Gross Total: ${grossTotal.toFixed(2)}`);
    if (discount > 0) {
      console.log(`   Discount: ${discount.toFixed(2)}`);
    }
    console.log(`   Subtotal: ${subtotal.toFixed(2)}`);
    if (vatAmount > 0) {
      console.log(`   VAT: ${vatAmount.toFixed(2)}`);
    }
    console.log(`   Grand Total: ${grandTotal.toFixed(2)}`);
    console.log(`   Total Debit: ${totalDebit.toFixed(2)}`);
    console.log(`   Total Credit: ${totalCredit.toFixed(2)}`);
    console.log(`   Balanced: ${Math.abs(totalDebit - totalCredit) < 0.01 ? '✅ YES' : '❌ NO'}`);

    // Verify balance before saving
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error(
        `Journal entry is not balanced! Debit: ${totalDebit.toFixed(2)}, Credit: ${totalCredit.toFixed(2)}. ` +
        `This indicates a calculation error in the purchase data.`
      );
    }

    const journalNumber = await generateInvoiceNumber('journal');

    const journal = new Journal({
      journalNumber,
      entryDate: purchase.date || new Date(),
      referenceType: 'Purchase',
      referenceId: purchase._id,
      referenceNumber: purchase.referenceNumber || `Purchase-${purchase._id.toString().slice(-6)}`,

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
      actionHistory: [{
        action: 'Auto-created from Purchase (Inventory Received)',
        userId,
        username,
        timestamp: new Date(),
      }],
    });

    await journal.save();
    console.log(`✅ Journal entry ${journalNumber} created for purchase ${purchase.referenceNumber}`);
    if (discount > 0) {
      console.log(`   💰 Discount of ${discount.toFixed(2)} applied to inventory cost`);
    }
    return journal;
  } catch (error) {
    console.error('❌ Error creating journal for purchase:', error);
    return null;
  }
}

/**
 * ✅ UPDATED: Handle journal for purchase inventory status change
 * This is called when inventoryStatus changes
 */
export async function handlePurchaseInventoryStatusChange(
  purchase: any,
  oldInventoryStatus: string,
  newInventoryStatus: string,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    console.log(`📝 Handling inventory status change: ${oldInventoryStatus} → ${newInventoryStatus}`);

    // Void journal when moving away from 'received'
    if (oldInventoryStatus === 'received' && newInventoryStatus !== 'received') {
      console.log('🔴 Voiding journal - inventory status changed from received');
      await voidJournalsForReference(
        purchase._id,
        userId,
        username,
        `Inventory status changed from ${oldInventoryStatus} to ${newInventoryStatus}`
      );
      return;
    }

    // Create journal when moving to 'received'
    if (oldInventoryStatus !== 'received' && newInventoryStatus === 'received') {
      console.log('✅ Creating journal - inventory status changed to received');
      await createJournalForPurchase(purchase, userId, username);
      return;
    }
  } catch (error) {
    console.error('Error handling purchase inventory status change:', error);
  }
}

/**
 * Helper: Extract item info from expense
 */
async function extractExpenseItemInfo(expense: any) {
  const result: {
    partyType?: 'Payee' | 'Supplier' | 'Vendor';
    partyId?: string;
    partyName?: string;
    itemType?: 'Material' | 'Product';
    itemName?: string;
  } = {};

  if (expense.payeeId) {
    if (typeof expense.payeeId === 'object' && expense.payeeId.name) {
      result.partyType = 'Payee';
      result.partyId = expense.payeeId._id?.toString() || expense.payeeId.toString();
      result.partyName = expense.payeeId.name;
    } else {
      try {
        const Payee = (await import('@/models/Payee')).default;
        const payee = await Payee.findById(expense.payeeId);
        if (payee) {
          result.partyType = 'Payee';
          result.partyId = payee._id.toString();
          result.partyName = payee.name;
        }
      } catch (error) {
        console.error('Error looking up payee:', error);
      }
    }
  }
  else if (expense.vendor) {
    result.partyType = 'Vendor';
    result.partyName = expense.vendor;
  }

  if (expense.description) {
    result.itemType = 'Product';
    result.itemName = expense.description.substring(0, 50);
  }

  return result;
}

/**
 * Auto-create journal entry for Expense
 */
export async function createJournalForExpense(
  expense: any,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    const entries: JournalEntryData[] = [];
    const { partyType, partyId, partyName, itemType, itemName } = await extractExpenseItemInfo(expense);

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

    const expenseAccount = expenseAccountMap[expense.category] || expenseAccountMap['Miscellaneous'];

    entries.push({
      accountCode: expenseAccount.code,
      accountName: expenseAccount.name,
      debit: expense.amount,
      credit: 0,
    });

    const paymentAccount = expense.paymentMethod === 'Cash' ? 'A1001' : 'A1002';
    const paymentAccountName = expense.paymentMethod === 'Cash' ? 'Cash in Hand' : 'Cash at Bank';

    entries.push({
      accountCode: paymentAccount,
      accountName: paymentAccountName,
      debit: 0,
      credit: expense.amount,
    });

    const journalNumber = await generateInvoiceNumber('journal');

    const journal = new Journal({
      journalNumber,
      entryDate: expense.date || new Date(),
      referenceType: 'Expense',
      referenceId: expense._id,
      referenceNumber: expense.referenceNumber || `EXP-${expense._id.toString().slice(-6)}`,

      partyType,
      partyId,
      partyName,
      itemType,
      itemName,

      narration,
      entries,
      totalDebit: entries.reduce((sum, e) => sum + e.debit, 0),
      totalCredit: entries.reduce((sum, e) => sum + e.credit, 0),
      status: 'posted',
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      actionHistory: [{
        action: 'Auto-created from Expense',
        userId,
        username,
        timestamp: new Date(),
      }],
    });

    await journal.save();
    console.log(`✅ Journal entry ${journalNumber} created for expense`);
    if (partyType && partyName) {
      console.log(`   Party: ${partyType} - ${partyName} (ID: ${partyId || 'N/A'})`);
    }
    return journal;
  } catch (error) {
    console.error('Error creating journal for expense:', error);
    return null;
  }
}

/**
 * Handle journal for expense status change
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
      await voidJournalsForReference(
        expense._id,
        userId,
        username,
        `Expense status changed from ${oldStatus} to ${newStatus}`
      );
    }

    if (newStatus === 'approved' && oldStatus !== 'approved') {
      console.log('✅ Creating journal for approved expense...');
      await createJournalForExpense(
        expense,
        userId,
        username
      );
    }
  } catch (error) {
    console.error('Error handling expense status change:', error);
  }
}