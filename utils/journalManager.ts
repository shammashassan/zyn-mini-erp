// utils/journalManager.ts
// [FIX Bug 3] voidJournalsForReference now normalises referenceId to a string before
// querying, matching the String field type declared in the Journal schema. Previously,
// passing an ObjectId produced zero matches and voids silently failed.

import Journal from '@/models/Journal';
import generateInvoiceNumber from './invoiceNumber';
import mongoose from 'mongoose';

/**
 * Void all journals connected to a reference document.
 *
 * [FIX Bug 3] The Journal schema declares referenceId as `String`. All journal creation
 * functions now store it via `.toString()`. This function therefore coerces the incoming
 * argument to a string before querying so ObjectId vs String mismatches never silently
 * return 0 results again.
 */
export async function voidJournalsForReference(
  referenceId: string | mongoose.Types.ObjectId,
  userId: string | null = null,
  username: string | null = null,
  reason: string = 'Reference document modified'
) {
  try {
    // [FIX Bug 3] Always query with a plain string, regardless of what caller passes
    const referenceIdStr = referenceId?.toString();

    const journals = await Journal.find({
      referenceId: referenceIdStr,
      status: 'posted',
      isDeleted: false,
    });

    console.log(
      `📄 Found ${journals.length} journal(s) to void for reference ${referenceIdStr}`
    );

    for (const journal of journals) {
      journal.status = 'void';
      journal.updatedBy = userId;

      journal.addAuditEntry(
        `Voided - ${reason}`,
        userId,
        username,
        [{ field: 'status', oldValue: 'posted', newValue: 'void' }]
      );

      // Save with validation disabled to skip enum checks on status-only change
      await journal.save({ validateBeforeSave: false });
      console.log(`✅ Voided journal ${journal.journalNumber}`);
    }

    return journals;
  } catch (error) {
    console.error('Error voiding journals:', error);
    return [];
  }
}

/**
 * Get all voided journals for a reference (to recreate with same dates).
 */
export async function getVoidedJournalsForReference(
  referenceId: string | mongoose.Types.ObjectId
) {
  try {
    // [FIX Bug 3] Consistent string coercion
    const referenceIdStr = referenceId?.toString();

    const journals = await Journal.find({
      referenceId: referenceIdStr,
      status: 'void',
      isDeleted: false,
    }).sort({ entryDate: 1 });

    return journals;
  } catch (error) {
    console.error('Error fetching voided journals:', error);
    return [];
  }
}

/**
 * Create journal with specific date (for restoration).
 * Preserves party and item references from original journal.
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
      ...journalData,
      journalNumber,
      entryDate,

      // Preserve party and item references from original journal
      partyType: journalData.partyType,
      partyId: journalData.partyId,
      contactId: journalData.contactId,
      partyName: journalData.partyName,
      itemType: journalData.itemType,
      itemId: journalData.itemId,
      itemName: journalData.itemName,

      // [FIX Bug 3] Preserve referenceId as string
      referenceId: journalData.referenceId?.toString(),

      status: 'posted',
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      actionHistory: [
        {
          action: `Recreated from voided journal`,
          userId,
          username,
          timestamp: new Date(),
        },
      ],
    });

    await journal.save();
    console.log(`✅ Recreated journal ${journalNumber} with date ${entryDate}`);

    if (journal.partyType && journal.partyName) {
      console.log(`   Party: ${journal.partyType} - ${journal.partyName}`);
    }
    if (journal.itemType && journal.itemName) {
      console.log(`   Item: ${journal.itemType} - ${journal.itemName}`);
    }

    return journal;
  } catch (error) {
    console.error('Error creating journal with date:', error);
    return null;
  }
}

/**
 * Check if a reference has any posted journals.
 */
export async function hasPostedJournals(
  referenceId: string | mongoose.Types.ObjectId
): Promise<boolean> {
  try {
    // [FIX Bug 3] Consistent string coercion
    const referenceIdStr = referenceId?.toString();

    const count = await Journal.countDocuments({
      referenceId: referenceIdStr,
      status: 'posted',
      isDeleted: false,
    });
    return count > 0;
  } catch (error) {
    console.error('Error checking posted journals:', error);
    return false;
  }
}

/**
 * Get all journals (posted and voided) for a reference.
 */
export async function getAllJournalsForReference(
  referenceId: string | mongoose.Types.ObjectId
) {
  try {
    // [FIX Bug 3] Consistent string coercion
    const referenceIdStr = referenceId?.toString();

    return await Journal.find({
      referenceId: referenceIdStr,
      isDeleted: false,
    }).sort({ entryDate: 1 });
  } catch (error) {
    console.error('Error fetching journals:', error);
    return [];
  }
}