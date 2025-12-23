import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Journal from '@/models/Journal';
import ChartOfAccount from '@/models/ChartOfAccount';
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface AccountData {
  accountCode: string;
  accountName: string;
  subGroup: string;
  amount: number;
}

export async function GET(request: NextRequest) {
  try {
    const { error, session } = await requireAuthAndPermission({
      financialStatements: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    // Build date filter
    const dateFilter = {
      entryDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      status: 'posted',
      isDeleted: false
    };

    // Fetch all posted journals within date range
    const journals = await Journal.find(dateFilter).lean();

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
    const balanceMap = new Map<string, number>();

    journals.forEach(journal => {
      journal.entries.forEach((entry: any) => {
        const account = accountMap.get(entry.accountCode);
        if (!account) return;

        const existing = balanceMap.get(entry.accountCode) || 0;
        
        // For income and credit-nature accounts, credit increases balance
        // For expense and debit-nature accounts, debit increases balance
        if (account.nature === 'credit') {
          balanceMap.set(entry.accountCode, existing + entry.credit - entry.debit);
        } else {
          balanceMap.set(entry.accountCode, existing + entry.debit - entry.credit);
        }
      });
    });

    // Organize data by account groups
    const income: AccountData[] = [];
    const expenses: AccountData[] = [];

    balanceMap.forEach((balance, accountCode) => {
      const account = accountMap.get(accountCode);
      if (!account) return;

      // Only include accounts with non-zero balances
      if (Math.abs(balance) < 0.01) return;

      const accountData: AccountData = {
        accountCode: account.accountCode,
        accountName: account.accountName,
        subGroup: account.subGroup,
        amount: Math.abs(balance)
      };

      // Standard Income/Expense Grouping
      if (account.groupName === 'Income') {
        income.push(accountData);
      } else if (account.groupName === 'Expenses') {
        expenses.push(accountData);
      }
      
      // SPECIAL HANDLING: Include Inventory/Purchases (A1200) as an Expense (Cost of Goods Sold)
      // This aligns the Financial Statements with the Profit & Loss Dashboard
      else if (account.accountCode === 'A1200') {
         // Override subgroup to ensure it shows up clearly
         accountData.subGroup = 'Cost of Goods Sold';
         expenses.push(accountData);
      }
    });

    // Sort each group by account code
    const sortByCode = (a: AccountData, b: AccountData) => 
      a.accountCode.localeCompare(b.accountCode);

    income.sort(sortByCode);
    expenses.sort(sortByCode);

    return NextResponse.json({
      income,
      expenses,
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching financial statements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial statements' },
      { status: 500 }
    );
  }
}