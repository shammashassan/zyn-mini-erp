// utils/journalAutoCreate.ts — Project 1 (POS + Return Notes, no Credit/Debit Notes)
//
// ══════════════════════════════════════════════════════════════════════════════
// ARCHITECTURE
// ══════════════════════════════════════════════════════════════════════════════
//
// RETURN NOTES  → financial journals here (Sales Return + Purchase Return).
//                  Stock movements handled by inventoryManager.ts separately.
// POS SALES     → full journal: revenue side + COGS side in one entry.
// POS RETURNS   → immediate reversal: revenue + COGS reversal in one entry.
//
// ══════════════════════════════════════════════════════════════════════════════
// BUGS FIXED
// ══════════════════════════════════════════════════════════════════════════════
//
// [BUG-1]  Expense journal used expense.paymentMethod (does not exist).
//          Fixed: Cr. AP (L1001) — accrual basis.
// [BUG-2]  Voucher Receipt always Cr. AR even for debitNote allocations.
//          Fixed: route by allocation.documentType.
// [BUG-3]  Voucher Payment always Dr. AP even for creditNote allocations.
//          Fixed: route by allocation.documentType.
// [BUG-4]  party.roles.includes() → TypeError. roles is an object, not array.
//          Fixed: boolean property access.
// [BUG-5]  handleInvoiceStatusChange missed 'partial'/'overdue' → 'approved'.
//          Fixed: oldStatus !== 'approved' && newStatus === 'approved'.
// [BUG-6]  partySnapshot.roles / partySnapshot.name do not exist on snapshot.
//          Fixed: .name → .displayName.
// [BUG-7]  Voucher payment partySnapshot?.name → always undefined.
//          Fixed: partySnapshot?.displayName.
// [JM-1]   referenceId ObjectId vs String mismatch on all journal queries.
//          Fixed: str() helper normalises every id before use.
// [BUG-V]  createJournalForVoucher used voucher.invoiceNumber (undefined).
//          Fixed: voucher.voucherNumber.
// [BUG-E]  Equipment category mapped to A2002 (Fixed Asset, not expense).
//          Fixed: removed; falls through to X2014 Miscellaneous.
// [BUG-X]  handleExpenseStatusChange missing return after void.
//          Fixed: early return added.
// ══════════════════════════════════════════════════════════════════════════════

import Journal from '@/models/Journal';
import generateInvoiceNumber from './invoiceNumber';
import { voidJournalsForReference } from './journalManager';

interface JournalEntryData {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY — normalise any id to a plain string (matches Journal.referenceId: String)
// ─────────────────────────────────────────────────────────────────────────────
const str = (v: any): string | undefined =>
  v != null ? (typeof v.toString === 'function' ? v.toString() : String(v)) : undefined;

const sumEntries = (entries: JournalEntryData[], side: 'debit' | 'credit') =>
  entries.reduce((s, e) => s + e[side], 0);

// ─────────────────────────────────────────────────────────────────────────────
// PARTY / ITEM EXTRACTORS
// ─────────────────────────────────────────────────────────────────────────────

type PartyMeta = {
  partyType?: 'Customer' | 'Supplier' | 'Payee' | 'Vendor';
  partyId?: string;
  contactId?: string;
  partyName?: string;
  itemType?: 'Material' | 'Product';
  itemName?: string;
};

function firstItemMeta(items: any[], type: 'Material' | 'Product'): Pick<PartyMeta, 'itemType' | 'itemName'> {
  if (items?.length > 0 && items[0].description) {
    return { itemType: type, itemName: items[0].description };
  }
  return {};
}

/** Invoice — party is always Customer. */
function extractInvoiceMeta(invoice: any): PartyMeta {
  const partyId = str(invoice.partyId);
  const partyName =
    invoice.partySnapshot?.displayName ??
    (typeof invoice.partyId === 'object' ? invoice.partyId?.company || invoice.partyId?.name : undefined) ??
    'Unknown Customer';
  return {
    partyType: 'Customer', partyId,
    contactId: str(invoice.contactId), partyName,
    ...firstItemMeta(invoice.items, 'Product'),
  };
}

/**
 * Voucher — type depends on voucherType + allocation targets.
 * [BUG-4] Party.roles is { customer: boolean, supplier: boolean } — NOT array.
 * [BUG-6] partySnapshot has no `roles` or `name` field.
 * [BUG-7] Payment branch used partySnapshot?.name (undefined). Fixed: displayName.
 */
function extractVoucherMeta(voucher: any): PartyMeta {
  const base: PartyMeta = {
    partyId: str(voucher.partyId),
    contactId: str(voucher.contactId),
    ...firstItemMeta(voucher.items, 'Product'),
  };

  if (voucher.voucherType === 'receipt') {
    if (voucher.vendorName) {
      return { ...base, partyType: 'Vendor', partyName: voucher.vendorName };
    }
    if (voucher.payeeName || voucher.payeeId) {
      return { ...base, partyType: 'Payee', partyName: voucher.payeeName, partyId: str(voucher.payeeId) || base.partyId };
    }
    // [BUG-6] snapshot has no roles — resolve from populated partyId object
    const displayName = voucher.partySnapshot?.displayName;
    if (displayName) {
      // [BUG-4] boolean object access, NOT .includes()
      const roles = typeof voucher.partyId === 'object' ? voucher.partyId?.roles : null;
      const type = roles?.supplier && !roles?.customer ? 'Supplier' : 'Customer';
      return { ...base, partyType: type, partyName: displayName };
    }
    if (typeof voucher.partyId === 'object') {
      const p = voucher.partyId;
      const name = p.company || p.name || 'Unknown Party';
      // [BUG-4]
      const type = p.roles?.supplier && !p.roles?.customer ? 'Supplier' : 'Customer';
      return { ...base, partyType: type, partyName: name };
    }
    return { ...base, partyType: 'Customer' };
  }

  // payment
  if (voucher.payeeName || voucher.payeeId) {
    // [BUG-7] was partySnapshot?.name — undefined always
    return { ...base, partyType: 'Payee', partyName: voucher.partySnapshot?.displayName || voucher.payeeName, partyId: str(voucher.payeeId) || base.partyId };
  }
  if (voucher.vendorName) return { ...base, partyType: 'Vendor', partyName: voucher.vendorName };
  if (voucher.partySnapshot?.displayName) return { ...base, partyType: 'Supplier', partyName: voucher.partySnapshot.displayName };
  if (typeof voucher.partyId === 'object') return { ...base, partyType: 'Supplier', partyName: voucher.partyId.company || voucher.partyId.name || 'Unknown Supplier' };
  return { ...base };
}

/** Purchase — party is always Supplier. */
function extractPurchaseMeta(purchase: any): PartyMeta {
  const partyName =
    purchase.partySnapshot?.displayName ??
    (typeof purchase.partyId === 'object' ? purchase.partyId?.company || purchase.partyId?.name : undefined) ??
    'Unknown Supplier';
  return {
    partyType: 'Supplier',
    partyId: str(purchase.partyId), contactId: str(purchase.contactId), partyName,
    ...firstItemMeta(purchase.items, 'Material'),
  };
}

/** Expense — Payee or Vendor. */
async function extractExpenseMeta(expense: any): Promise<PartyMeta> {
  if (expense.payeeId) {
    if (typeof expense.payeeId === 'object' && expense.payeeId.name) {
      return {
        partyType: 'Payee',
        partyId: str(expense.payeeId._id || expense.payeeId),
        partyName: expense.payeeId.name,
        ...firstItemMeta([{ description: expense.description }], 'Product'),
      };
    }
    try {
      const Payee = (await import('@/models/Payee')).default;
      const payee = await Payee.findById(expense.payeeId);
      if (payee) return {
        partyType: 'Payee', partyId: payee._id.toString(), partyName: payee.name,
        ...firstItemMeta([{ description: expense.description }], 'Product'),
      };
    } catch (e) { console.error('Payee lookup error:', e); }
  }
  if (expense.vendor) return {
    partyType: 'Vendor', partyName: expense.vendor,
    ...firstItemMeta([{ description: expense.description }], 'Product'),
  };
  return { ...firstItemMeta([{ description: expense.description }], 'Product') };
}

/** Save a balanced journal or throw if unbalanced. */
async function saveJournal(opts: {
  referenceType: string;
  referenceId: string | undefined;
  referenceNumber: string | undefined;
  meta: PartyMeta;
  narration: string;
  entries: JournalEntryData[];
  entryDate: Date;
  userId: string | null;
  username: string | null;
  actionLabel: string;
}) {
  const { entries, entryDate, referenceType, referenceId, referenceNumber, meta, narration, userId, username, actionLabel } = opts;
  const totalDebit = sumEntries(entries, 'debit');
  const totalCredit = sumEntries(entries, 'credit');
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(`Journal not balanced — Dr: ${totalDebit.toFixed(2)}, Cr: ${totalCredit.toFixed(2)} [${referenceType} ${referenceNumber}]`);
  }
  const journalNumber = await generateInvoiceNumber('journal');
  const journal = new Journal({
    journalNumber, entryDate, referenceType, referenceId, referenceNumber,
    ...meta, narration, entries, totalDebit, totalCredit,
    status: 'posted', createdBy: userId, postedBy: userId, postedAt: new Date(),
    actionHistory: [{ action: actionLabel, userId, username, timestamp: new Date() }],
  });
  await journal.save();
  console.log(`✅ Journal ${journalNumber} created — ${referenceType} ${referenceNumber}`);
  return journal;
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Approved Invoice journal.
 *   Dr. Accounts Receivable  (grandTotal)
 *   Dr. Sales Discount        (I1004 — if any)
 *   Cr. Sales Revenue         (totalAmount)
 *   Cr. VAT Payable           (vatAmount — if any)
 */
export async function createJournalForInvoice(
  invoice: any, userId: string | null = null, username: string | null = null
) {
  try {
    if (invoice.status !== 'approved') return null;
    const meta = extractInvoiceMeta(invoice);
    const entries: JournalEntryData[] = [
      { accountCode: 'A1100', accountName: 'Accounts Receivable', debit: invoice.grandTotal, credit: 0 },
    ];
    if ((invoice.discount || 0) > 0)
      entries.push({ accountCode: 'I1004', accountName: 'Sales Discount', debit: invoice.discount, credit: 0 });
    entries.push({ accountCode: 'I1001', accountName: 'Sales Revenue', debit: 0, credit: invoice.totalAmount });
    if ((invoice.vatAmount || 0) > 0)
      entries.push({ accountCode: 'L1002', accountName: 'VAT Payable', debit: 0, credit: invoice.vatAmount });

    return await saveJournal({
      referenceType: 'Invoice', referenceId: str(invoice._id), referenceNumber: invoice.invoiceNumber,
      meta, narration: `Sales invoice — ${meta.partyName || 'Unknown Customer'}`,
      entries, entryDate: new Date(invoice.invoiceDate || invoice.createdAt || Date.now()),
      userId, username, actionLabel: 'Auto-created from Invoice',
    });
  } catch (err) { console.error('Error creating invoice journal:', err); return null; }
}

/** [BUG-5] Catches ALL transitions into 'approved', not just from 'pending'/'cancelled'. */
export async function handleInvoiceStatusChange(
  invoice: any, oldStatus: string, newStatus: string,
  userId: string | null = null, username: string | null = null
) {
  try {
    console.log(`📄 Invoice status: ${oldStatus} → ${newStatus}`);
    if (oldStatus === 'approved' && newStatus !== 'approved') {
      await voidJournalsForReference(invoice._id, userId, username, `Invoice status changed from approved to ${newStatus}`);
      return;
    }
    if (oldStatus !== 'approved' && newStatus === 'approved') {
      await createJournalForInvoice(invoice, userId, username);
    }
  } catch (err) { console.error('handleInvoiceStatusChange error:', err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// VOUCHER (Receipt / Payment)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [BUG-2][BUG-3] Allocation-aware control account routing.
 *
 * RECEIPT:
 *   Dr. Cash / Bank
 *   Cr. Accounts Receivable  ← invoice allocations + unallocated amount
 *   Cr. Accounts Payable     ← debitNote allocations (supplier refund cash-in)
 *
 * PAYMENT:
 *   Dr. Accounts Payable     ← purchase + expense allocations + unallocated
 *   Dr. Accounts Receivable  ← creditNote allocations (customer refund cash-out)
 *   Cr. Cash / Bank
 */
export async function createJournalForVoucher(
  voucher: any, userId: string | null = null, username: string | null = null
) {
  try {
    const meta = extractVoucherMeta(voucher);
    const grand = Number(voucher.grandTotal) || 0;
    const payAcc = voucher.paymentMethod === 'Cash' ? 'A1001' : 'A1002';
    const payName = voucher.paymentMethod === 'Cash' ? 'Cash in Hand' : 'Cash at Bank';
    const allocs: Array<{ documentType: string; amount: number }> = voucher.allocations || [];
    const sum = (type: string) => allocs.filter(a => a.documentType === type).reduce((s, a) => s + Number(a.amount || 0), 0);
    const entries: JournalEntryData[] = [];
    let refType = 'Manual';
    let narration = '';

    if (voucher.voucherType === 'receipt') {
      refType = 'Receipt';
      narration = `Payment received from ${meta.partyName || 'Customer'} via ${voucher.paymentMethod}`;
      const invAmt = sum('invoice');
      const dnAmt = sum('debitNote');
      const arCredit = invAmt + Math.max(0, grand - invAmt - dnAmt);
      entries.push({ accountCode: payAcc, accountName: payName, debit: grand, credit: 0 });
      if (arCredit > 0) entries.push({ accountCode: 'A1100', accountName: 'Accounts Receivable', debit: 0, credit: arCredit });
      if (dnAmt > 0) entries.push({ accountCode: 'L1001', accountName: 'Accounts Payable', debit: 0, credit: dnAmt });
    } else if (voucher.voucherType === 'payment') {
      refType = 'Payment';
      const paidTo = meta.partyName || voucher.payeeName || voucher.vendorName || 'Payee';
      narration = `Payment made to ${paidTo} via ${voucher.paymentMethod}`;
      const purAmt = sum('purchase');
      const expAmt = sum('expense');
      const cnAmt = sum('creditNote');
      const apDebit = purAmt + expAmt + Math.max(0, grand - purAmt - expAmt - cnAmt);
      if (apDebit > 0) entries.push({ accountCode: 'L1001', accountName: 'Accounts Payable', debit: apDebit, credit: 0 });
      if (cnAmt > 0) entries.push({ accountCode: 'A1100', accountName: 'Accounts Receivable', debit: cnAmt, credit: 0 });
      entries.push({ accountCode: payAcc, accountName: payName, debit: 0, credit: grand });
    }

    if (!entries.length) return null;

    return await saveJournal({
      referenceType: refType, referenceId: str(voucher._id), referenceNumber: voucher.voucherNumber, // [BUG-V] was voucher.invoiceNumber
      meta, narration, entries,
      entryDate: new Date(voucher.voucherDate || voucher.createdAt || Date.now()),
      userId, username, actionLabel: `Auto-created from ${refType}`,
    });
  } catch (err) { console.error('Error creating voucher journal:', err); return null; }
}

// ─────────────────────────────────────────────────────────────────────────────
// PURCHASE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Approved Purchase journal.
 *   Dr. Inventory         (subtotal — gross minus trade discount)
 *   Dr. VAT Receivable    (vatAmount — if any)
 *   Cr. Accounts Payable  (grandTotal)
 */
export async function createJournalForPurchase(
  purchase: any, userId: string | null = null, username: string | null = null
) {
  try {
    if (purchase.purchaseStatus !== 'approved') {
      console.log(`⏭️ Skipping purchase journal — purchaseStatus is '${purchase.purchaseStatus}'`);
      return null;
    }
    const meta = extractPurchaseMeta(purchase);
    const gross = Number(purchase.totalAmount) || 0;
    const discount = Number(purchase.discount) || 0;
    const subtotal = gross - discount;
    const vat = Number(purchase.vatAmount) || 0;
    const grand = Number(purchase.grandTotal) || (subtotal + vat);
    const entries: JournalEntryData[] = [
      { accountCode: 'A1200', accountName: 'Inventory', debit: subtotal, credit: 0 },
    ];
    if (vat > 0) entries.push({ accountCode: 'A1300', accountName: 'VAT Receivable', debit: vat, credit: 0 });
    entries.push({ accountCode: 'L1001', accountName: 'Accounts Payable', debit: 0, credit: grand });

    const narration = discount > 0
      ? `Purchase from ${meta.partyName || 'Supplier'} — ${purchase.items.length} item(s) (Discount: ${discount.toFixed(2)})`
      : `Purchase from ${meta.partyName || 'Supplier'} — ${purchase.items.length} item(s)`;

    return await saveJournal({
      referenceType: 'Purchase', referenceId: str(purchase._id), referenceNumber: purchase.referenceNumber,
      meta, narration, entries,
      entryDate: new Date(purchase.purchaseDate || purchase.date || Date.now()),
      userId, username, actionLabel: 'Auto-created from Purchase (Approved)',
    });
  } catch (err) { console.error('❌ Error creating purchase journal:', err); return null; }
}

export async function handlePurchaseStatusChange(
  purchase: any, oldStatus: string, newStatus: string,
  userId: string | null = null, username: string | null = null
) {
  try {
    console.log(`📝 Purchase status: ${oldStatus} → ${newStatus}`);
    if (oldStatus === 'approved' && newStatus !== 'approved') {
      await voidJournalsForReference(purchase._id, userId, username, `Purchase status changed from approved to ${newStatus}`);
      return;
    }
    if (oldStatus !== 'approved' && newStatus === 'approved') {
      await createJournalForPurchase(purchase, userId, username);
    }
  } catch (err) { console.error('handlePurchaseStatusChange error:', err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// RETURN NOTES (Sales & Purchase)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Approved Sales Return Note journal.
 *   Dr. Sales Returns    (I1003 — subtotal)
 *   Dr. VAT Payable      (vatAmount — reduces VAT liability)
 *   Cr. Accounts Receivable (grandTotal)
 *
 * Inventory restock (Dr. Inventory / Cr. COGS) included when returnNote.cogsAmount
 * is provided. If inventoryManager handles stock separately, pass cogsAmount = 0.
 */
export async function createJournalForSalesReturn(
  returnNote: any, userId: string | null = null, username: string | null = null
) {
  try {
    if (returnNote.status !== 'approved') return null;

    const totalAmount = Number(returnNote.totalAmount) || 0;
    const discount = Number(returnNote.discount) || 0;
    const vatAmount = Number(returnNote.vatAmount) || 0;
    const subtotal = totalAmount - discount;
    const grandTotal = subtotal + vatAmount;

    if (returnNote.grandTotal && Math.abs(grandTotal - Number(returnNote.grandTotal)) > 0.01) {
      console.warn(`⚠️  Sales Return ${returnNote.returnNumber} grandTotal mismatch: computed ${grandTotal.toFixed(2)} vs stored ${Number(returnNote.grandTotal).toFixed(2)}. Using computed value.`);
    }

    const meta: PartyMeta = {
      partyType: 'Customer',
      partyId: str(returnNote.partyId),
      contactId: str(returnNote.contactId),
      partyName: returnNote.partySnapshot?.displayName || 'Unknown Customer',
      itemType: 'Product',
      itemName: returnNote.items?.[0]?.description,
    };

    const entries: JournalEntryData[] = [
      { accountCode: 'I1003', accountName: 'Sales Returns', debit: subtotal, credit: 0 },
    ];
    if (vatAmount > 0)
      entries.push({ accountCode: 'L1002', accountName: 'VAT Payable', debit: vatAmount, credit: 0 });
    entries.push({ accountCode: 'A1100', accountName: 'Accounts Receivable', debit: 0, credit: grandTotal });

    // Inventory restock — goods re-enter stock: Dr. Inventory / Cr. COGS.
    // Attach cogsAmount to returnNote before calling if stock is managed here.
    const cogsAmount = Number(returnNote.cogsAmount) || 0;
    if (cogsAmount > 0) {
      entries.push({ accountCode: 'A1200', accountName: 'Inventory', debit: cogsAmount, credit: 0 });
      entries.push({ accountCode: 'X1001', accountName: 'Cost of Goods Sold', debit: 0, credit: cogsAmount });
    }

    return await saveJournal({
      referenceType: 'SalesReturn', referenceId: str(returnNote._id), referenceNumber: returnNote.returnNumber,
      meta, narration: `Sales Return ${returnNote.returnNumber} — ${returnNote.items?.length || 0} item(s) returned`,
      entries, entryDate: new Date(returnNote.returnDate || Date.now()),
      userId, username, actionLabel: 'Auto-created from Sales Return (Approved)',
    });
  } catch (err) { console.error('❌ Error creating sales return journal:', err); return null; }
}

/**
 * Approved Purchase Return Note journal.
 *   Dr. Accounts Payable  (grandTotal)
 *   Cr. Inventory         (subtotal)
 *   Cr. VAT Receivable    (vatAmount — if any)
 */
export async function createJournalForPurchaseReturn(
  returnNote: any, userId: string | null = null, username: string | null = null
) {
  try {
    if (returnNote.status !== 'approved') return null;

    const totalAmount = Number(returnNote.totalAmount) || 0;
    const discount = Number(returnNote.discount) || 0;
    const vatAmount = Number(returnNote.vatAmount) || 0;
    const subtotal = totalAmount - discount;
    const grandTotal = subtotal + vatAmount;

    if (returnNote.grandTotal && Math.abs(grandTotal - Number(returnNote.grandTotal)) > 0.01) {
      console.warn(`⚠️  Purchase Return ${returnNote.returnNumber} grandTotal mismatch: computed ${grandTotal.toFixed(2)} vs stored ${Number(returnNote.grandTotal).toFixed(2)}. Using computed value.`);
    }

    const meta: PartyMeta = {
      partyType: 'Supplier',
      partyId: str(returnNote.partyId),
      contactId: str(returnNote.contactId),
      partyName: returnNote.partySnapshot?.displayName || 'Unknown Supplier',
      itemType: 'Material',
      itemName: returnNote.items?.[0]?.description,
    };

    const entries: JournalEntryData[] = [
      { accountCode: 'L1001', accountName: 'Accounts Payable', debit: grandTotal, credit: 0 },
      { accountCode: 'A1200', accountName: 'Inventory', debit: 0, credit: subtotal },
    ];
    if (vatAmount > 0)
      entries.push({ accountCode: 'A1300', accountName: 'VAT Receivable', debit: 0, credit: vatAmount });

    return await saveJournal({
      referenceType: 'PurchaseReturn', referenceId: str(returnNote._id), referenceNumber: returnNote.returnNumber,
      meta, narration: `Purchase Return ${returnNote.returnNumber} — ${returnNote.items?.length || 0} item(s) returned`,
      entries, entryDate: new Date(returnNote.returnDate || Date.now()),
      userId, username, actionLabel: 'Auto-created from Purchase Return (Approved)',
    });
  } catch (err) { console.error('❌ Error creating purchase return journal:', err); return null; }
}

export async function handleReturnNoteStatusChange(
  returnNote: any, oldStatus: string, newStatus: string,
  userId: string | null = null, username: string | null = null
) {
  try {
    const isSales = returnNote.returnType === 'salesReturn';
    if (oldStatus === 'approved' && newStatus !== 'approved') {
      await voidJournalsForReference(returnNote._id, userId, username, `Return note status changed from ${oldStatus} to ${newStatus}`);
      return;
    }
    if (oldStatus !== 'approved' && newStatus === 'approved') {
      if (isSales) {
        await createJournalForSalesReturn(returnNote, userId, username);
      } else {
        await createJournalForPurchaseReturn(returnNote, userId, username);
      }
    }
  } catch (err) { console.error('handleReturnNoteStatusChange error:', err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSE — accrual basis
// ─────────────────────────────────────────────────────────────────────────────

/**
 * [BUG-1] expense.paymentMethod does not exist in IExpense.
 * Correct accrual entry: Dr. Expense / Cr. AP.
 * Payment Voucher later does: Dr. AP / Cr. Cash — completing the two-step flow.
 */
export async function createJournalForExpense(
  expense: any, userId: string | null = null, username: string | null = null
) {
  try {
    const meta = await extractExpenseMeta(expense);
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
    const acct = expenseAccountMap[expense.category] ?? expenseAccountMap['Miscellaneous'];
    const entries: JournalEntryData[] = [
      { accountCode: acct.code, accountName: acct.name, debit: expense.amount, credit: 0 },
      { accountCode: 'L1001', accountName: 'Accounts Payable', debit: 0, credit: expense.amount },
    ];
    return await saveJournal({
      referenceType: 'Expense', referenceId: str(expense._id),
      referenceNumber: expense.referenceNumber || `EXP-${str(expense._id)?.slice(-6)}`,
      meta, narration: `${expense.category} Expense — ${expense.description}`,
      entries, entryDate: new Date(expense.expenseDate || expense.date || Date.now()),
      userId, username, actionLabel: 'Auto-created from Expense',
    });
  } catch (err) { console.error('Error creating expense journal:', err); return null; }
}

export async function handleExpenseStatusChange(
  expense: any, oldStatus: string, newStatus: string,
  userId: string | null = null, username: string | null = null
) {
  try {
    console.log(`📄 Expense status: ${oldStatus} → ${newStatus}`);
    if (oldStatus === 'approved' && newStatus !== 'approved') {
      await voidJournalsForReference(expense._id, userId, username, `Expense status changed from ${oldStatus} to ${newStatus}`);
      return; // [BUG-X] prevent fall-through to create branch
    }
    if (newStatus === 'approved' && oldStatus !== 'approved') {
      await createJournalForExpense(expense, userId, username);
    }
  } catch (err) { console.error('handleExpenseStatusChange error:', err); }
}

// ─────────────────────────────────────────────────────────────────────────────
// POS SALE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Auto-create journal entry for a POS sale.
 *
 * Revenue entries:
 *   Dr. Cash/Bank          (grandTotal)
 *   Dr. Sales Discount     (I1004 — if any)
 *   Cr. Sales Revenue      (totalAmount)
 *   Cr. VAT Payable        (vatAmount — if any)
 *
 * COGS entries (only when cogsAmount > 0 — computed by deductStockForPOSSale):
 *   Dr. Cost of Goods Sold (X1001 — cogsAmount)
 *   Cr. Inventory          (A1200 — cogsAmount)
 *
 * Revenue block and COGS block each balance independently.
 */
export async function createJournalForPOSSale(
  sale: any,
  userId: string | null = null,
  username: string | null = null,
  cogsAmount: number = 0
): Promise<any> {
  try {
    const entries: JournalEntryData[] = [];
    const paymentAccount = sale.paymentMethod === 'Cash' ? 'A1001' : 'A1002';
    const paymentAccountName = sale.paymentMethod === 'Cash' ? 'Cash in Hand' : 'Cash at Bank';

    // Dr. Cash/Bank = grandTotal
    entries.push({ accountCode: paymentAccount, accountName: paymentAccountName, debit: sale.grandTotal, credit: 0 });

    // Dr. Sales Discount (if any)
    if ((sale.discount || 0) > 0)
      entries.push({ accountCode: 'I1004', accountName: 'Sales Discount', debit: sale.discount, credit: 0 });

    // Cr. Sales Revenue = totalAmount (gross before discount)
    entries.push({ accountCode: 'I1001', accountName: 'Sales Revenue', debit: 0, credit: sale.totalAmount });

    // Cr. VAT Payable
    if ((sale.vatAmount || 0) > 0)
      entries.push({ accountCode: 'L1002', accountName: 'VAT Payable', debit: 0, credit: sale.vatAmount });

    // COGS entries — Dr. X1001 / Cr. A1200 (balance independently)
    if (cogsAmount > 0) {
      entries.push({ accountCode: 'X1001', accountName: 'Cost of Goods Sold', debit: cogsAmount, credit: 0 });
      entries.push({ accountCode: 'A1200', accountName: 'Inventory', debit: 0, credit: cogsAmount });
    }

    const meta: PartyMeta = {
      partyType: 'Customer',
      partyId: str(sale.partyId),
      partyName: sale.customerType === 'party' ? sale.customerName : 'Walk-in',
    };

    return await saveJournal({
      referenceType: 'POSSale', referenceId: str(sale._id), referenceNumber: sale.saleNumber,
      meta,
      narration: `POS Sale ${sale.saleNumber} — ${sale.customerName} via ${sale.paymentMethod}`,
      entries, entryDate: new Date(sale.createdAt || Date.now()),
      userId, username, actionLabel: 'Auto-created from POS Sale',
    });
  } catch (err) { console.error('Error creating POS journal:', err); return null; }
}

/**
 * Recreate journal when restoring a soft-deleted POS sale.
 * Pass the recomputed cogsAmount from reapplyStockForPOSSale.
 */
export async function recreateJournalForPOSSale(
  sale: any,
  userId: string | null,
  username: string | null,
  cogsAmount: number = 0
): Promise<any> {
  return createJournalForPOSSale(sale, userId, username, cogsAmount);
}

/**
 * Auto-create journal entry for a POS Return (immediate).
 *
 * Revenue reversal entries:
 *   Dr. Sales Returns      (I1003 — subtotal)
 *   Dr. VAT Payable        (vatAmount — if any)
 *   Cr. Cash/Bank          (grandTotal)
 *
 * COGS reversal entries (only when cogsAmount > 0):
 *   Dr. Inventory          (A1200 — cogsAmount)
 *   Cr. Cost of Goods Sold (X1001 — cogsAmount)
 */
export async function createJournalForPOSReturn(
  returnNote: any,
  paymentMethod: string,
  userId: string | null = null,
  username: string | null = null,
  cogsAmount: number = 0
): Promise<any> {
  try {
    const entries: JournalEntryData[] = [];
    const paymentAccount = paymentMethod === 'Cash' ? 'A1001' : 'A1002';
    const paymentAccountName = paymentMethod === 'Cash' ? 'Cash in Hand' : 'Cash at Bank';

    const totalAmount = Number(returnNote.totalAmount) || 0;
    const discount = Number(returnNote.discount) || 0;
    const vatAmount = Number(returnNote.vatAmount) || 0;
    const subtotal = totalAmount - discount;
    const grandTotal = subtotal + vatAmount;

    // Dr. Sales Returns
    entries.push({ accountCode: 'I1003', accountName: 'Sales Returns', debit: subtotal, credit: 0 });

    // Dr. VAT Payable (if any)
    if (vatAmount > 0)
      entries.push({ accountCode: 'L1002', accountName: 'VAT Payable', debit: vatAmount, credit: 0 });

    // Cr. Cash/Bank
    entries.push({ accountCode: paymentAccount, accountName: paymentAccountName, debit: 0, credit: grandTotal });

    // COGS reversal — Dr. Inventory / Cr. COGS
    if (cogsAmount > 0) {
      entries.push({ accountCode: 'A1200', accountName: 'Inventory', debit: cogsAmount, credit: 0 });
      entries.push({ accountCode: 'X1001', accountName: 'Cost of Goods Sold', debit: 0, credit: cogsAmount });
    }

    const meta: PartyMeta = {
      partyType: 'Customer',
      partyId: str(returnNote.partyId),
      partyName: returnNote.partySnapshot?.displayName || 'Walk-in',
    };

    return await saveJournal({
      referenceType: 'POSReturn', referenceId: str(returnNote._id), referenceNumber: returnNote.returnNumber,
      meta,
      narration: `POS Return ${returnNote.returnNumber} via ${paymentMethod}`,
      entries, entryDate: new Date(returnNote.returnDate || Date.now()),
      userId, username, actionLabel: 'Auto-created from POS Return',
    });
  } catch (err) { console.error('Error creating POS return journal:', err); return null; }
}