// utils/journalManager.ts
//
// KEY FIX: Journal schema declares `referenceId` as `{ type: String }`.
// All callers pass raw `document._id` which is a mongoose ObjectId.
// MongoDB strict equality treats ObjectId ≠ String, so every void/query
// silently returned 0 results before this fix.
// Every public function now normalises referenceId via `.toString()`.
//
// createJournalWithDate: spreads only safe, named fields from the source
// journal to avoid accidentally inheriting _id, journalNumber, status,
// or actionHistory from the voided document.

import Journal from '@/models/Journal';
import generateInvoiceNumber from './invoiceNumber';
import mongoose from 'mongoose';

const toStr = (id: string | mongoose.Types.ObjectId | undefined | null): string | undefined =>
  id != null ? id.toString() : undefined;

/**
 * Void all POSTED journals for a reference document.
 * Only `status` changes — all other fields are preserved.
 */
export async function voidJournalsForReference(
  referenceId: string | mongoose.Types.ObjectId,
  userId: string | null = null,
  username: string | null = null,
  reason = 'Reference document modified'
) {
  try {
    const refStr = toStr(referenceId);
    const journals = await Journal.find({ referenceId: refStr, status: 'posted', isDeleted: false });
    console.log(`📄 Found ${journals.length} journal(s) to void for reference ${refStr}`);

    for (const journal of journals) {
      journal.status = 'void';
      journal.updatedBy = userId;
      journal.addAuditEntry(
        `Voided — ${reason}`, userId, username,
        [{ field: 'status', oldValue: 'posted', newValue: 'void' }]
      );
      await journal.save({ validateBeforeSave: false }); // skip enum re-check on status-only save
      console.log(`✅ Voided journal ${journal.journalNumber}`);
    }
    return journals;
  } catch (err) {
    console.error('voidJournalsForReference error:', err);
    return [];
  }
}

/**
 * Get all VOIDED journals for a reference (used during restore to find
 * journals eligible for recreation). Sorted oldest-first.
 */
export async function getVoidedJournalsForReference(
  referenceId: string | mongoose.Types.ObjectId
) {
  try {
    return await Journal.find({
      referenceId: toStr(referenceId),
      status: 'void',
      isDeleted: false,
    }).sort({ entryDate: 1 });
  } catch (err) {
    console.error('getVoidedJournalsForReference error:', err);
    return [];
  }
}

/**
 * Recreate a voided journal with a specific entry date (used during restore).
 * Only named fields are spread — _id, journalNumber, status, and actionHistory
 * from the source journal are never carried over.
 */
export async function createJournalWithDate(
  journalData: any,
  entryDate: Date,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    const journalNumber = await generateInvoiceNumber('journal');
    const journal = new Journal({
      // Reference info
      referenceType: journalData.referenceType,
      referenceNumber: journalData.referenceNumber,
      referenceId: toStr(journalData.referenceId), // normalise to string
      // Financial data
      narration: journalData.narration,
      entries: journalData.entries,
      totalDebit: journalData.totalDebit,
      totalCredit: journalData.totalCredit,
      // Party / item metadata
      partyType: journalData.partyType,
      partyId: journalData.partyId,
      contactId: journalData.contactId,
      partyName: journalData.partyName,
      itemType: journalData.itemType,
      itemId: journalData.itemId,
      itemName: journalData.itemName,
      // Fresh fields for the recreated journal
      journalNumber,
      entryDate,
      status: 'posted',
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      actionHistory: [{
        action: 'Recreated from voided journal',
        userId, username, timestamp: new Date(),
      }],
    });
    await journal.save();
    console.log(`✅ Recreated journal ${journalNumber} with date ${entryDate}`);
    if (journal.partyType && journal.partyName) console.log(`   Party: ${journal.partyType} — ${journal.partyName}`);
    if (journal.itemType && journal.itemName) console.log(`   Item:  ${journal.itemType} — ${journal.itemName}`);
    return journal;
  } catch (err) {
    console.error('createJournalWithDate error:', err);
    return null;
  }
}

/**
 * Returns true if the reference document has at least one POSTED journal.
 */
export async function hasPostedJournals(
  referenceId: string | mongoose.Types.ObjectId
): Promise<boolean> {
  try {
    const count = await Journal.countDocuments({
      referenceId: toStr(referenceId), status: 'posted', isDeleted: false,
    });
    return count > 0;
  } catch (err) {
    console.error('hasPostedJournals error:', err);
    return false;
  }
}

/**
 * Returns all non-deleted journals (posted and voided) for a reference,
 * sorted oldest-first.
 */
export async function getAllJournalsForReference(
  referenceId: string | mongoose.Types.ObjectId
) {
  try {
    return await Journal.find({
      referenceId: toStr(referenceId), isDeleted: false,
    }).sort({ entryDate: 1 });
  } catch (err) {
    console.error('getAllJournalsForReference error:', err);
    return [];
  }
}