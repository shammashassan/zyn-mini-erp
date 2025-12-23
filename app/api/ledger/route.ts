// app/api/ledger/route.ts - UPDATED: Optimized Opening Balance Calculation

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Journal from '@/models/Journal';
import ChartOfAccount from '@/models/ChartOfAccount';
import { requireAuthAndPermission } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuthAndPermission({
      ledger: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const accountCode = searchParams.get('accountCode');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const partyType = searchParams.get('partyType');
    const partyId = searchParams.get('partyId');

    if (!accountCode) {
      return NextResponse.json(
        { error: 'Account code is required' },
        { status: 400 }
      );
    }

    // Verify account exists
    const account = await ChartOfAccount.findOne({ accountCode });
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    // Build date filter for the main query
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.entryDate = {};
      if (startDate) dateFilter.entryDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.entryDate.$lte = end;
      }
    }

    // Build party filter
    const partyFilter: any = {};
    if (partyType) {
      partyFilter.partyType = partyType;
    }
    if (partyId) {
      partyFilter.partyId = partyId;
    }

    // Calculate opening balance (transactions before start date)
    let openingBalance = 0;
    
    if (startDate) {
      // OPTIMIZATION: Use Aggregation instead of fetching all docs to memory
      const result = await Journal.aggregate([
        { 
          $match: {
            'entries.accountCode': accountCode, // Index optimization
            entryDate: { $lt: new Date(startDate) },
            status: 'posted',
            isDeleted: false,
            ...partyFilter // Apply party filter to opening balance
          } 
        },
        { $unwind: "$entries" }, // Flatten the entries array
        { 
          $match: { 
            "entries.accountCode": accountCode // Filter only the specific account line items
          } 
        },
        { 
          $group: {
            _id: null,
            totalDebit: { $sum: "$entries.debit" },
            totalCredit: { $sum: "$entries.credit" }
          }
        }
      ]);

      // Calculate balance from aggregation result
      if (result.length > 0) {
        const { totalDebit, totalCredit } = result[0];
        
        if (account.nature === 'debit') {
          openingBalance = totalDebit - totalCredit;
        } else {
          // For credit accounts (Liability/Equity/Income), Credit increases balance
          openingBalance = totalCredit - totalDebit;
        }
      }
    }

    // Fetch ledger entries for the current period
    // Note: This still fetches all rows for the period (Client-side pagination).
    // TODO: Implement server-side pagination here for further scaling.
    const journals = await Journal.find({
      'entries.accountCode': accountCode,
      ...dateFilter,
      ...partyFilter, // Apply party filter to entries
      status: 'posted',
      isDeleted: false,
    }).sort({ entryDate: 1, createdAt: 1 });

    // Build ledger entries with running balance
    const ledgerEntries: any[] = [];
    let runningBalance = openingBalance;

    journals.forEach(journal => {
      journal.entries.forEach((entry: any) => {
        if (entry.accountCode === accountCode) {
          const debit = entry.debit || 0;
          const credit = entry.credit || 0;

          // Calculate balance change based on account nature
          if (account.nature === 'debit') {
            runningBalance += debit - credit;
          } else {
            runningBalance += credit - debit;
          }

          ledgerEntries.push({
            date: journal.entryDate,
            journalNumber: journal.journalNumber,
            referenceType: journal.referenceType,
            referenceNumber: journal.referenceNumber,
            narration: journal.narration,
            debit,
            credit,
            balance: runningBalance,
            journalId: journal._id,
          });
        }
      });
    });

    const closingBalance = runningBalance;

    return NextResponse.json({
      account: {
        accountCode: account.accountCode,
        accountName: account.accountName,
        groupName: account.groupName,
        subGroup: account.subGroup,
        nature: account.nature,
      },
      openingBalance,
      closingBalance,
      entries: ledgerEntries,
      totalDebit: ledgerEntries.reduce((sum, e) => sum + e.debit, 0),
      totalCredit: ledgerEntries.reduce((sum, e) => sum + e.credit, 0),
    }, { status: 200 });
  } catch (error) {
    console.error('Error fetching ledger:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ledger data' },
      { status: 500 }
    );
  }
}