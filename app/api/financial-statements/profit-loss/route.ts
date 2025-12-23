// app/api/financial-statements/profit-loss/route.ts (or wherever this file is located)

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

    // 1. Fetch Accounts (Lightweight)
    const accounts = await ChartOfAccount.find({
      isActive: true,
      isDeleted: false
    }).lean();

    const accountMap = new Map(
      accounts.map(acc => [acc.accountCode, acc])
    );

    // 2. AGGREGATION: Calculate Account Totals directly in DB
    // This replaces fetching all journals into memory
    const aggResults = await Journal.aggregate([
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

    // 3. Process Logic in Memory (Fast, using only ~100 account summaries)
    const revenue: Record<string, number> = {};
    const cogs: Record<string, number> = {};
    const operatingExpenses: Record<string, number> = {};

    // Create a map for fast lookup of aggregated results
    const resultMap = new Map(aggResults.map(r => [r._id, r]));

    accounts.forEach(account => {
      const result = resultMap.get(account.accountCode);
      if (!result) return;

      const debit = result.totalDebit || 0;
      const credit = result.totalCredit || 0;

      // Income Logic
      if (account.groupName === 'Income') {
        // Income is Credit - Debit
        const amount = credit - debit;
        if (Math.abs(amount) > 0.01) {
          revenue[account.accountName] = amount;
        }
      } 
      // Expense Logic
      else if (account.groupName === 'Expenses') {
        // Expense is Debit - Credit
        const amount = debit - credit;
        
        if (Math.abs(amount) > 0.01) {
          if (account.subGroup === 'Cost of Goods Sold') {
            cogs[account.accountName] = amount;
          } else {
            operatingExpenses[account.accountName] = amount;
          }
        }
      }
      // SPECIAL HANDLING: Inventory (A1200) treated as COGS usage
      else if (account.accountCode === 'A1200') {
         const amount = debit - credit;
         if (Math.abs(amount) > 0.01) {
             cogs[account.accountName] = amount;
         }
      }
    });

    // Calculate totals
    const totalRevenue = Object.values(revenue).reduce((a, b) => a + b, 0);
    const totalCOGS = Object.values(cogs).reduce((a, b) => a + b, 0);
    const grossProfit = totalRevenue - totalCOGS;
    const totalOpEx = Object.values(operatingExpenses).reduce((a, b) => a + b, 0);
    const netIncome = grossProfit - totalOpEx;

    return NextResponse.json({
      revenue,
      cogs,
      operatingExpenses,
      totals: {
        totalRevenue,
        totalCOGS,
        grossProfit,
        grossProfitMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
        totalOpEx,
        netIncome,
        netProfitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
      },
      period: {
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Error generating P&L statement:', error);
    return NextResponse.json(
      { error: 'Failed to generate profit & loss statement' },
      { status: 500 }
    );
  }
}