// app/api/financial-statements/cash-flow/route.ts - OPTIMIZED: Uses Aggregation

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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // 1. Fetch Accounts
    const accounts = await ChartOfAccount.find({
      isActive: true,
      isDeleted: false
    }).lean();

    const accountMap = new Map(
      accounts.map(acc => [acc.accountCode, acc])
    );

    // 2. AGGREGATION: Group by Account Code within date range
    const cashFlowResults = await Journal.aggregate([
      {
        $match: {
          status: 'posted',
          isDeleted: false,
          entryDate: { $gte: start, $lte: end }
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

    // 3. Categorize cash flows in Memory
    const operating: Record<string, number> = {};
    const investing: Record<string, number> = {};
    const financing: Record<string, number> = {};
    
    // Helper to get aggregated data
    const getBalance = (code: string) => {
        const found = cashFlowResults.find(r => r._id === code);
        return found ? { debit: found.totalDebit, credit: found.totalCredit } : { debit: 0, credit: 0 };
    };

    let netIncome = 0;

    // Iterate accounts to classify movements
    accounts.forEach(account => {
      const balance = getBalance(account.accountCode);
      if (balance.debit === 0 && balance.credit === 0) return;

      // Cash accounts - excluded from flow logic (they are the result)
      if (account.accountCode === 'A1001' || account.accountCode === 'A1002') {
        return;
      }

      // Calculate Net Income (Indirect Method Start)
      if (account.groupName === 'Income') {
        netIncome += balance.credit - balance.debit;
      } else if (account.groupName === 'Expenses') {
        netIncome -= balance.debit - balance.credit;
      }

      // Operating Activities (Working Capital Changes)
      if (account.groupName === 'Assets' || account.groupName === 'Liabilities') {
        const netChange = balance.debit - balance.credit;

        if (account.subGroup === 'Current Assets' || 
            account.subGroup === 'Accounts Receivable' ||
            account.subGroup === 'Inventory') {
           // Increase in Asset = Cash Outflow (Negative)
           // Decrease in Asset = Cash Inflow (Positive)
           operating[account.accountName] = account.nature === 'debit' 
            ? -netChange 
            : netChange;
        }
        else if (account.subGroup === 'Current Liabilities' || 
                 account.subGroup === 'Accounts Payable') {
           // Increase in Liability = Cash Inflow (Positive)
           // Decrease in Liability = Cash Outflow (Negative)
           operating[account.accountName] = account.nature === 'credit' 
             ? -netChange // netChange (D-C) is negative for credit increase, so negate it
             : netChange;
        }
      }

      // Investing Activities (Fixed Assets)
      if (account.groupName === 'Assets' && account.subGroup === 'Fixed Assets') {
        const netChange = balance.debit - balance.credit;
        // Purchase of FA (Debit) = Cash Outflow
        investing[account.accountName] = -netChange;
      }

      // Financing Activities (Long-term Liabilities & Equity)
      if ((account.groupName === 'Liabilities' && account.subGroup !== 'Current Liabilities') ||
           account.groupName === 'Equity') {
        const netChange = balance.credit - balance.debit; // Credit increase
        // Loan Taken (Credit) = Cash Inflow
        financing[account.accountName] = netChange;
      }
    });

    // Add Net Income line item to Operating
    operating['Net Income'] = netIncome;

    // Calculate totals
    const operatingCash = Object.values(operating).reduce((a, b) => a + b, 0);
    const investingCash = Object.values(investing).reduce((a, b) => a + b, 0);
    const financingCash = Object.values(financing).reduce((a, b) => a + b, 0);
    const netCashChange = operatingCash + investingCash + financingCash;

    return NextResponse.json({
      operating,
      investing,
      financing,
      totals: {
        operatingCash,
        investingCash,
        financingCash,
        netCashChange,
      },
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error generating cash flow statement:', error);
    return NextResponse.json(
      { error: 'Failed to generate cash flow statement' },
      { status: 500 }
    );
  }
}