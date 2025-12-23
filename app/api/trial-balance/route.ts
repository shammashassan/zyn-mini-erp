// app/api/trial-balance/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Journal from '@/models/Journal';
import ChartOfAccount from '@/models/ChartOfAccount';
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface AccountBalance {
  accountCode: string;
  accountName: string;
  groupName: string;
  subGroup: string;
  nature: 'debit' | 'credit';
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

// GET - Compute Trial Balance
export async function GET(request: NextRequest) {
  try {
    // Check authentication and permission
    const { error, session } = await requireAuthAndPermission({
      trialBalance: ["read"],
    });

    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const asOfDateParam = searchParams.get('asOfDate');
    
    // Default to current date if not specified
    const asOfDate = asOfDateParam ? new Date(asOfDateParam) : new Date();
    
    // Fetch all posted journals up to the specified date
    const journals = await Journal.find({
      status: 'posted',
      isDeleted: false,
      entryDate: { $lte: asOfDate }
    }).lean();

    // Fetch all active accounts
    const accounts = await ChartOfAccount.find({
      isActive: true,
      isDeleted: false
    }).lean();

    // Create account map for quick lookup
    const accountMap = new Map(
      accounts.map(acc => [acc.accountCode, acc])
    );

    // Calculate balances for each account
    const balanceMap = new Map<string, { debit: number; credit: number }>();

    // Process all journal entries
    journals.forEach(journal => {
      journal.entries.forEach((entry: any) => {
        const existing = balanceMap.get(entry.accountCode) || { debit: 0, credit: 0 };
        balanceMap.set(entry.accountCode, {
          debit: existing.debit + entry.debit,
          credit: existing.credit + entry.credit
        });
      });
    });

    // Build trial balance items
    const trialBalanceItems: AccountBalance[] = [];
    let totalDebits = 0;
    let totalCredits = 0;

    balanceMap.forEach((balance, accountCode) => {
      const account = accountMap.get(accountCode);
      
      // Skip if account not found in COA
      if (!account) {
        console.warn(`Account ${accountCode} not found in Chart of Accounts`);
        return;
      }

      // Calculate net balance
      const netBalance = balance.debit - balance.credit;
      
      // Only include accounts with non-zero balances
      if (Math.abs(netBalance) < 0.01) {
        return;
      }

      trialBalanceItems.push({
        accountCode: account.accountCode,
        accountName: account.accountName,
        groupName: account.groupName,
        subGroup: account.subGroup,
        nature: account.nature,
        totalDebit: balance.debit,
        totalCredit: balance.credit,
        balance: netBalance
      });

      totalDebits += balance.debit;
      totalCredits += balance.credit;
    });

    // Sort by Group -> SubGroup -> Account Code
    const groupOrder = ['Assets', 'Liabilities', 'Equity', 'Income', 'Expenses'];
    trialBalanceItems.sort((a, b) => {
      // 1. Primary Sort: Account Group (Assets, then Liabilities...)
      const groupCompare = groupOrder.indexOf(a.groupName) - groupOrder.indexOf(b.groupName);
      if (groupCompare !== 0) return groupCompare;
      
      // 2. Secondary Sort: SubGroup (e.g., Current Assets vs Non-Current Assets)
      // We use localeCompare with a fallback to empty string to handle missing subgroups safely
      const subGroupA = a.subGroup || '';
      const subGroupB = b.subGroup || '';
      const subGroupCompare = subGroupA.localeCompare(subGroupB);
      if (subGroupCompare !== 0) return subGroupCompare;

      // 3. Tertiary Sort: Account Code (Numerical order)
      return a.accountCode.localeCompare(b.accountCode);
    });

    // Calculate summary
    const difference = totalDebits - totalCredits;
    const isBalanced = Math.abs(difference) < 0.01;

    const summary = {
      totalDebits,
      totalCredits,
      difference,
      isBalanced,
      accountsCount: trialBalanceItems.length
    };

    return NextResponse.json({
      accounts: trialBalanceItems,
      summary,
      asOfDate: asOfDate.toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error('Error computing trial balance:', error);
    return NextResponse.json(
      { error: 'Failed to compute trial balance' },
      { status: 500 }
    );
  }
}