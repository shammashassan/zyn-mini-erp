// app/api/financial-statements/balance-sheet/route.ts - OPTIMIZED

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Journal from '@/models/Journal';
import ChartOfAccount from '@/models/ChartOfAccount';
import { requireAuthAndPermission } from "@/lib/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuthAndPermission({
      financialStatements: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const asOfDateParam = searchParams.get('asOfDate');
    
    // Default to today if not provided
    const asOfDate = asOfDateParam ? new Date(asOfDateParam) : new Date();
    // Ensure we get everything up to the very last millisecond of that day
    asOfDate.setHours(23, 59, 59, 999);

    // 1. Fetch Accounts (Lightweight)
    const accounts = await ChartOfAccount.find({
      isActive: true,
      isDeleted: false
    }).lean();

    // 2. AGGREGATION: Calculate Account Balances directly in DB
    const balanceResults = await Journal.aggregate([
      {
        $match: {
          status: 'posted',
          isDeleted: false,
          entryDate: { $lte: asOfDate } // All history up to date
        }
      },
      { $unwind: "$entries" },
      {
        $group: {
          _id: "$entries.accountCode",
          totalDebit: { $sum: "$entries.debit" },
          totalCredit: { $sum: "$entries.credit" }
        }
      }
    ]);

    // 3. Process Logic in Memory
    const currentAssets: Record<string, number> = {};
    const fixedAssets: Record<string, number> = {};
    const currentLiabilities: Record<string, number> = {};
    const longTermLiabilities: Record<string, number> = {};
    const equity: Record<string, number> = {};

    // Helper map for aggregation results
    const aggMap = new Map(balanceResults.map(r => [r._id, r]));

    accounts.forEach(account => {
      const aggData = aggMap.get(account.accountCode);
      
      const debit = aggData?.totalDebit || 0;
      const credit = aggData?.totalCredit || 0;
      const netBalance = debit - credit;

      // Skip zero balance accounts
      if (Math.abs(netBalance) < 0.01) return;

      // --- ASSETS ---
      if (account.groupName === 'Assets') {
        const val = account.nature === 'debit' ? netBalance : -netBalance;
        
        if (account.subGroup === 'Current Assets' || 
            account.subGroup === 'Cash and Cash Equivalents' ||
            account.subGroup === 'Accounts Receivable' ||
            account.subGroup === 'Inventory') {
          currentAssets[account.accountName] = (currentAssets[account.accountName] || 0) + val;
        } else {
          fixedAssets[account.accountName] = (fixedAssets[account.accountName] || 0) + val;
        }
      } 
      // --- LIABILITIES ---
      else if (account.groupName === 'Liabilities') {
        const val = account.nature === 'credit' ? -netBalance : netBalance;

        if (account.subGroup === 'Current Liabilities' || 
            account.subGroup === 'Accounts Payable') {
          currentLiabilities[account.accountName] = (currentLiabilities[account.accountName] || 0) + val;
        } else {
          longTermLiabilities[account.accountName] = (longTermLiabilities[account.accountName] || 0) + val;
        }
      } 
      // --- EQUITY (Explicit) ---
      else if (account.groupName === 'Equity') {
        const val = account.nature === 'credit' ? -netBalance : netBalance;
        equity[account.accountName] = (equity[account.accountName] || 0) + val;
      }
      
      // --- EQUITY (Calculated Retained Earnings) ---
      // This is the NEW logic. It captures Income/Expenses and adds them to Equity.
      // Without this, your Balance Sheet would ignore the 171.9K profit you made.
      else if (account.groupName === 'Income' || account.groupName === 'Expenses') {
         // Income (Credit) increases Equity. Expense (Debit) decreases Equity.
         // Since NetBalance = Debit - Credit:
         // If Income: Credit > Debit => NetBalance is Negative. We want Positive Equity. So -NetBalance.
         // If Expense: Debit > Credit => NetBalance is Positive. We want Negative Equity. So -NetBalance.
         // Therefore, for both, we subtract the NetBalance (Debit - Credit).
         
         const contributionToEquity = -netBalance; 
         
         equity['Retained Earnings (Calculated)'] = (equity['Retained Earnings (Calculated)'] || 0) + contributionToEquity;
      }
    });

    // Calculate totals
    const totalCurrentAssets = Object.values(currentAssets).reduce((a, b) => a + b, 0);
    const totalFixedAssets = Object.values(fixedAssets).reduce((a, b) => a + b, 0);
    const totalAssets = totalCurrentAssets + totalFixedAssets;

    const totalCurrentLiabilities = Object.values(currentLiabilities).reduce((a, b) => a + b, 0);
    const totalLongTermLiabilities = Object.values(longTermLiabilities).reduce((a, b) => a + b, 0);
    const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

    const totalEquity = Object.values(equity).reduce((a, b) => a + b, 0);
    const totalLiabilitiesEquity = totalLiabilities + totalEquity;

    const difference = Math.abs(totalAssets - totalLiabilitiesEquity);
    const isBalanced = difference < 1;

    return NextResponse.json({
      assets: {
        currentAssets,
        fixedAssets,
      },
      liabilities: {
        currentLiabilities,
        longTermLiabilities,
      },
      equity,
      totals: {
        totalCurrentAssets,
        totalFixedAssets,
        totalAssets,
        totalCurrentLiabilities,
        totalLongTermLiabilities,
        totalLiabilities,
        totalEquity,
        totalLiabilitiesEquity,
        difference,
        isBalanced,
      },
      asOfDate: asOfDate.toISOString(),
    }, { status: 200 });

  } catch (error) {
    console.error('Error generating balance sheet:', error);
    return NextResponse.json(
      { error: 'Failed to generate balance sheet' },
      { status: 500 }
    );
  }
}