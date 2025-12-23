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
    partyName?: string;
    itemType?: 'Material' | 'Product';
    itemName?: string;
  } = {};

  if (invoice.customerName) {
    result.partyType = 'Customer';
    result.partyName = invoice.customerName;
    
    try {
      const Customer = (await import('@/models/Customer')).default;
      const customer = await Customer.findOne({ name: invoice.customerName, isDeleted: false });
      if (customer) {
        result.partyId = customer._id.toString();
      }
    } catch (error) {
      console.error('Error looking up customer ID:', error);
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
    partyName?: string;
    itemType?: 'Material' | 'Product';
    itemName?: string;
  } = {};

  if (voucher.customerName) {
    result.partyType = 'Customer';
    result.partyName = voucher.customerName;
    
    if (voucher.customerId) {
       result.partyId = voucher.customerId.toString();
    } else {
      try {
        const Customer = (await import('@/models/Customer')).default;
        const customer = await Customer.findOne({ name: voucher.customerName, isDeleted: false });
        if (customer) {
          result.partyId = customer._id.toString();
        }
      } catch (error) {
        console.error('Error looking up customer ID:', error);
      }
    }
  } 
  else if (voucher.supplierName) {
    result.partyName = voucher.supplierName;
    
    if (voucher.supplierId) {
      result.partyType = 'Supplier';
      result.partyId = voucher.supplierId.toString();
    } else {
      try {
        const Supplier = (await import('@/models/Supplier')).default;
        const supplier = await Supplier.findOne({ name: voucher.supplierName, isDeleted: false });
        if (supplier) {
          result.partyType = 'Supplier';
          result.partyId = supplier._id.toString();
        } else {
          result.partyType = 'Vendor';
        }
      } catch (error) {
        result.partyType = 'Vendor';
      }
    }
  } 
  else if (voucher.payeeName) {
    result.partyType = 'Payee';
    result.partyName = voucher.payeeName;
    
    if (voucher.payeeId) {
       result.partyId = voucher.payeeId.toString();
    }
  }
  else if (voucher.vendorName) {
    result.partyType = 'Vendor';
    result.partyName = voucher.vendorName;
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
    const narration = `Sales invoice for ${invoice.customerName}`;

    const { partyType, partyId, partyName, itemType, itemName } = await extractInvoicePartyAndItemInfo(invoice);

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

    const { partyType, partyId, partyName, itemType, itemName } = await extractVoucherPartyAndItemInfo(voucher);

    if (voucher.voucherType === 'receipt') {
      referenceType = 'Receipt';
      narration = `Payment received from ${partyName || voucher.customerName || 'Customer'} via ${voucher.paymentMethod}`;

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
      
      const paidTo = partyName || voucher.supplierName || voucher.payeeName || voucher.vendorName || 'Payee';
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
 * Auto-create journal entry for Refund Voucher
 */
export async function createJournalForRefund(
  voucher: any,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    const entries: JournalEntryData[] = [];
    const amountToRecord = voucher.grandTotal;

    const { partyType, partyId, partyName, itemType, itemName } = await extractVoucherPartyAndItemInfo(voucher);

    const narration = `Refund issued to ${partyName || voucher.customerName || 'Customer'} via ${voucher.paymentMethod}`;

    entries.push({
      accountCode: 'I1003',
      accountName: 'Sales Returns',
      debit: amountToRecord,
      credit: 0,
    });

    const paymentAccount = voucher.paymentMethod === 'Cash' ? 'A1001' : 'A1002';
    const paymentAccountName = voucher.paymentMethod === 'Cash' ? 'Cash in Hand' : 'Cash at Bank';

    entries.push({
      accountCode: paymentAccount,
      accountName: paymentAccountName,
      debit: 0,
      credit: amountToRecord,
    });

    const journalNumber = await generateInvoiceNumber('journal');

    const journal = new Journal({
      journalNumber,
      entryDate: voucher.createdAt || new Date(),
      referenceType: 'Refund', 
      referenceId: voucher._id,
      referenceNumber: voucher.invoiceNumber,
      
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
        action: 'Auto-created from Refund Voucher',
        userId,
        username,
        timestamp: new Date(),
      }],
    });

    await journal.save();
    console.log(`✅ Journal entry ${journalNumber} created for Refund ${voucher.invoiceNumber}`);
    return journal;
  } catch (error) {
    console.error('Error creating journal for refund:', error);
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
    partyName?: string;
    itemType?: 'Material' | 'Product';
    itemName?: string;
  } = {};

  if (purchase.supplierName) {
    result.partyType = 'Supplier';
    result.partyName = purchase.supplierName;
    
    try {
      const Supplier = (await import('@/models/Supplier')).default;
      const supplier = await Supplier.findOne({ name: purchase.supplierName, isDeleted: false });
      if (supplier) {
        result.partyId = supplier._id.toString();
      }
    } catch (error) {
      console.error('Error looking up supplier ID:', error);
    }
  }

  if (purchase.items && purchase.items.length > 0) {
    const firstItem = purchase.items[0];
    if (firstItem.materialName) {
      result.itemType = 'Material';
      result.itemName = firstItem.materialName;
    }
  }

  return result;
}

/**
 * ✅ FIXED: Auto-create journal entry for Purchase with proper discount handling
 * 
 * This function now correctly:
 * 1. Ensures discount defaults to 0 if missing
 * 2. Calculates subtotal = grossTotal - discount
 * 3. Ensures VAT is calculated on subtotal (after discount)
 * 4. Creates balanced journal entries
 */
export async function createJournalForPurchase(
  purchase: any,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    const entries: JournalEntryData[] = [];
    const { partyType, partyId, partyName, itemType, itemName } = await extractPurchasePartyAndItemInfo(purchase);

    // ✅ FIX: Ensure discount is always a valid number, default to 0
    const grossTotal = Number(purchase.totalAmount) || 0;
    const discount = Number(purchase.discount) || 0;
    
    // ✅ FIX: Recalculate subtotal to ensure consistency
    const subtotal = grossTotal - discount;
    
    // ✅ FIX: Recalculate VAT to ensure it's based on subtotal
    const vatAmount = purchase.isTaxPayable 
      ? (subtotal * 0.05) 
      : 0;
    
    // ✅ FIX: Recalculate grand total to ensure consistency
    const grandTotal = subtotal + vatAmount;

    // ✅ VALIDATION: Check for calculation errors
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
      ? `Purchase from ${purchase.supplierName || 'Supplier'} - ${purchase.items.length} item(s) (Discount: ${discount.toFixed(2)})${purchase.isTaxPayable ? ' (Tax Payable)' : ' (Tax Free)'}`
      : `Purchase from ${purchase.supplierName || 'Supplier'} - ${purchase.items.length} item(s)${purchase.isTaxPayable ? ' (Tax Payable)' : ' (Tax Free)'}`;

    // ✅ Dr. Inventory = Subtotal (after discount)
    entries.push({
      accountCode: 'A1200',
      accountName: 'Inventory',
      debit: subtotal,
      credit: 0,
    });

    // ✅ Dr. VAT Receivable (if applicable)
    if (purchase.isTaxPayable && vatAmount > 0) {
      entries.push({
        accountCode: 'A1300',
        accountName: 'VAT Receivable',
        debit: vatAmount,
        credit: 0,
      });
    }

    // ✅ Cr. Accounts Payable = Grand Total
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
      console.log(`   VAT (5%): ${vatAmount.toFixed(2)}`);
    }
    console.log(`   Grand Total: ${grandTotal.toFixed(2)}`);
    console.log(`   Total Debit: ${totalDebit.toFixed(2)}`);
    console.log(`   Total Credit: ${totalCredit.toFixed(2)}`);
    console.log(`   Balanced: ${Math.abs(totalDebit - totalCredit) < 0.01 ? '✅ YES' : '❌ NO'}`);

    // ✅ CRITICAL: Verify balance before saving
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
        action: 'Auto-created from Purchase',
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
 * Handle journal for purchase status change
 */
export async function handlePurchaseStatusChange(
  purchase: any,
  oldStatus: string,
  newStatus: string,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    if (oldStatus === 'Received' && newStatus !== 'Received') {
      await voidJournalsForReference(purchase._id, userId, username, 'Purchase status changed from Received');
      return;
    }

    if (oldStatus !== 'Received' && newStatus === 'Received') {
      await createJournalForPurchase(purchase, userId, username);
      return;
    }
  } catch (error) {
    console.error('Error handling purchase status change:', error);
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
  else if (expense.supplierId) {
    if (typeof expense.supplierId === 'object' && expense.supplierId.name) {
      result.partyType = 'Supplier';
      result.partyId = expense.supplierId._id?.toString() || expense.supplierId.toString();
      result.partyName = expense.supplierId.name;
    } else {
      try {
        const Supplier = (await import('@/models/Supplier')).default;
        const supplier = await Supplier.findById(expense.supplierId);
        if (supplier) {
          result.partyType = 'Supplier';
          result.partyId = supplier._id.toString();
          result.partyName = supplier.name;
        }
      } catch (error) {
        console.error('Error looking up supplier:', error);
      }
    }
  }
  else if (expense.vendor) {
    try {
      const Supplier = (await import('@/models/Supplier')).default;
      const supplier = await Supplier.findOne({ name: expense.vendor, isDeleted: false });
      if (supplier) {
        result.partyType = 'Supplier';
        result.partyId = supplier._id.toString();
        result.partyName = supplier.name;
      } else {
        result.partyType = 'Vendor';
        result.partyName = expense.vendor;
      }
    } catch (error) {
      console.error('Error looking up supplier by vendor name:', error);
      result.partyType = 'Vendor';
      result.partyName = expense.vendor;
    }
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