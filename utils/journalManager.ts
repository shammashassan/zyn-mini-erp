// utils/journalManager.ts - UPDATED: Preserve party and item references when recreating journals

import Journal from '@/models/Journal';
import generateInvoiceNumber from './invoiceNumber';
import mongoose from 'mongoose';

/**
 * Void all journals connected to a reference
 * FIXED: Don't change referenceType, just update status
 */
export async function voidJournalsForReference(
  referenceId: string,
  userId: string | null = null,
  username: string | null = null,
  reason: string = 'Reference document modified'
) {
  try {
    const journals = await Journal.find({
      referenceId,
      status: 'posted',
      isDeleted: false
    });

    console.log(`📄 Found ${journals.length} journals to void for reference ${referenceId}`);

    for (const journal of journals) {
      // Only change status, keep everything else the same
      journal.status = 'void';
      journal.updatedBy = userId;
      
      journal.addAuditEntry(
        `Voided - ${reason}`,
        userId,
        username,
        [{ field: 'status', oldValue: 'posted', newValue: 'void' }]
      );
      
      // Save with validation disabled to avoid enum issues
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
 * Get all voided journals for a reference (to recreate with same dates)
 */
export async function getVoidedJournalsForReference(referenceId: string) {
  try {
    const journals = await Journal.find({
      referenceId,
      status: 'void',
      isDeleted: false
    }).sort({ entryDate: 1 }); // Sort by date to maintain order

    return journals;
  } catch (error) {
    console.error('Error fetching voided journals:', error);
    return [];
  }
}

/**
 * Create journal with specific date (for restoration)
 * ✅ UPDATED: Preserve party and item references
 */
export async function createJournalWithDate(
  journalData: any,
  entryDate: Date,
  userId: string | null = null,
  username: string | null = null
) {
  try {
    // Generate journal number with retry mechanism
    const journalNumber = await generateInvoiceNumber('journal');
    
    const journal = new Journal({
      ...journalData,
      journalNumber,
      entryDate,
      
      // ✅ IMPORTANT: Preserve party and item references from original journal
      partyType: journalData.partyType,
      partyId: journalData.partyId,
      partyName: journalData.partyName,
      itemType: journalData.itemType,
      itemId: journalData.itemId,
      itemName: journalData.itemName,
      
      status: 'posted',
      createdBy: userId,
      postedBy: userId,
      postedAt: new Date(),
      actionHistory: [{
        action: `Recreated from voided journal`,
        userId,
        username,
        timestamp: new Date(),
      }],
    });

    await journal.save();
    console.log(`✅ Recreated journal ${journalNumber} with date ${entryDate}`);
    
    // Log preserved references
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
 * Check if a reference has any posted journals
 */
export async function hasPostedJournals(referenceId: string): Promise<boolean> {
  try {
    const count = await Journal.countDocuments({
      referenceId,
      status: 'posted',
      isDeleted: false
    });
    return count > 0;
  } catch (error) {
    console.error('Error checking posted journals:', error);
    return false;
  }
}

/**
 * Get all journals (posted and voided) for a reference
 */
export async function getAllJournalsForReference(referenceId: string) {
  try {
    return await Journal.find({
      referenceId,
      isDeleted: false
    }).sort({ entryDate: 1 });
  } catch (error) {
    console.error('Error fetching journals:', error);
    return [];
  }
}