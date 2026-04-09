// app/accounting/profit-loss/route.ts - UPDATED: Added grossProfit to monthly breakdown

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Journal from "@/models/Journal";
import ChartOfAccount from "@/models/ChartOfAccount";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { startOfMonth, endOfMonth, eachMonthOfInterval, format, differenceInMilliseconds, subMilliseconds } from 'date-fns';

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      profitLoss: ["read"],
    });

    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);

    // 1. Fetch Accounts to map logic (Income/Expense classification)
    const accounts = await ChartOfAccount.find({
      isActive: true,
      isDeleted: false
    }).lean();

    const accountMap = new Map(
      accounts.map(acc => [acc.accountCode, acc])
    );

    const incomeAccountCodes = accounts.filter(a => a.groupName === 'Income').map(a => a.accountCode);
    const expenseAccountCodes = accounts.filter(a => a.groupName === 'Expenses').map(a => a.accountCode);

    // Helper function to calculate totals for a given date range (used for trends)
    async function calculateTotals(start: Date, end: Date) {
      const aggregationResult = await Journal.aggregate([
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

      let revenue = 0;
      let expenses = 0;
      let purchasesExTax = 0;
      let salesTax = 0;
      let purchaseTax = 0;

      aggregationResult.forEach((bucket: any) => {
        const account = accountMap.get(bucket._id);
        if (!account) return;

        const debit = bucket.totalDebit || 0;
        const credit = bucket.totalCredit || 0;

        if (account.groupName === 'Income') {
          revenue += (credit - debit);
        }
        if (account.groupName === 'Expenses') {
          expenses += (debit - credit);
        }
        if (account.accountCode === 'A1200') {
          purchasesExTax += (debit - credit);
        }
        if (account.accountCode === 'L1002') {
          salesTax += (credit - debit);
        }
        if (account.accountCode === 'A1300') {
          purchaseTax += (debit - credit);
        }
      });

      const grossProfit = revenue - purchasesExTax;
      const totalCosts = expenses + purchasesExTax;
      const profit = revenue - totalCosts;
      const netTax = salesTax - purchaseTax;

      return {
        revenue,
        expenses,
        purchasesExTax,
        grossProfit,
        salesTax,
        purchaseTax,
        totalCosts,
        profit,
        netTax
      };
    }

    // 2. Monthly account-level aggregation
    const currentAggregation = await Journal.aggregate([
      {
        $match: {
          status: 'posted',
          isDeleted: false,
          entryDate: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: "$entries" },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$entryDate" } },
            accountCode: "$entries.accountCode"
          },
          totalDebit: { $sum: "$entries.debit" },
          totalCredit: { $sum: "$entries.credit" }
        }
      }
    ]);

    // Transaction counts per month
    const transactionCounts = await Journal.aggregate([
      {
        $match: {
          status: 'posted',
          isDeleted: false,
          entryDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $project: {
          entryDate: 1,
          isOrder: {
            $sum: {
              $map: {
                input: "$entries",
                as: "e",
                in: { $cond: [{ $in: ["$$e.accountCode", incomeAccountCodes] }, 1, 0] }
              }
            }
          },
          isPurchase: {
            $sum: {
              $map: {
                input: "$entries",
                as: "e",
                in: { $cond: [{ $eq: ["$$e.accountCode", "A1200"] }, 1, 0] }
              }
            }
          },
          isExpense: {
            $sum: {
              $map: {
                input: "$entries",
                as: "e",
                in: { $cond: [{ $in: ["$$e.accountCode", expenseAccountCodes] }, 1, 0] }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $dateToString: { format: "%Y-%m", date: "$entryDate" } }
          },
          orderCount: { $sum: { $cond: [{ $gt: ["$isOrder", 0] }, 1, 0] } },
          purchaseCount: { $sum: { $cond: [{ $gt: ["$isPurchase", 0] }, 1, 0] } },
          expenseCount: { $sum: { $cond: [{ $gt: ["$isExpense", 0] }, 1, 0] } }
        }
      }
    ]);

    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const monthlyBreakdown = months.map(month => {
      const monthKey = format(month, 'yyyy-MM');
      const monthBuckets = currentAggregation.filter((r: any) => r._id.month === monthKey);

      const monthTransactions = transactionCounts.find((t: any) => t._id.month === monthKey) || {
        orderCount: 0,
        purchaseCount: 0,
        expenseCount: 0
      };

      const orderCount = monthTransactions.orderCount;
      const purchaseCount = monthTransactions.purchaseCount;
      const expenseCount = monthTransactions.expenseCount;

      let revenue = 0;
      let expenses = 0;
      let purchasesExTax = 0;
      let salesTax = 0;
      let purchaseTax = 0;

      monthBuckets.forEach((bucket: any) => {
        const account = accountMap.get(bucket._id.accountCode);
        if (!account) return;
        const debit = bucket.totalDebit || 0;
        const credit = bucket.totalCredit || 0;

        if (account.groupName === 'Income') revenue += (credit - debit);
        if (account.groupName === 'Expenses') expenses += (debit - credit);
        if (account.accountCode === 'A1200') purchasesExTax += (debit - credit);
        if (account.accountCode === 'L1002') salesTax += (credit - debit);
        if (account.accountCode === 'A1300') purchaseTax += (debit - credit);
      });

      // Gross Profit = Revenue - COGS (Purchases ex-tax)
      const grossProfit = revenue - purchasesExTax;
      const totalCosts = expenses + purchasesExTax;
      const profit = revenue - totalCosts;

      return {
        period: format(month, 'MMM yyyy'),
        revenue,
        expenses,
        orderAmount: revenue,
        orders: orderCount,
        purchaseAmount: purchasesExTax,
        purchases: purchaseCount,
        expenseCount,
        salesTax,
        purchaseTax,
        grossProfit,   // NEW
        profit,
      };
    });

    // Summary from monthly breakdown
    const summary = monthlyBreakdown.reduce((acc, month) => {
      acc.totalRevenueExTax += month.revenue;
      acc.totalExpenses += month.expenses;
      acc.totalPurchasesExTax += month.purchaseAmount;
      acc.salesTax += month.salesTax;
      acc.purchaseTax += month.purchaseTax;
      acc.totalOrders += month.orders;
      acc.totalOrderAmount += month.orderAmount;
      return acc;
    }, {
      totalRevenueExTax: 0,
      totalExpenses: 0,
      totalPurchasesExTax: 0,
      totalCosts: 0,
      salesTax: 0,
      purchaseTax: 0,
      netTax: 0,
      grossProfit: 0,   // NEW
      profit: 0,
      profitMargin: 0,
      grossProfitMargin: 0,   // NEW
      totalOrders: 0,
      totalOrderAmount: 0
    });

    summary.totalCosts = summary.totalExpenses + summary.totalPurchasesExTax;
    summary.netTax = summary.salesTax - summary.purchaseTax;
    summary.grossProfit = summary.totalRevenueExTax - summary.totalPurchasesExTax;   // NEW
    summary.profit = summary.totalRevenueExTax - summary.totalCosts;
    summary.profitMargin = summary.totalRevenueExTax > 0
      ? (summary.profit / summary.totalRevenueExTax) * 100
      : 0;
    summary.grossProfitMargin = summary.totalRevenueExTax > 0   // NEW
      ? (summary.grossProfit / summary.totalRevenueExTax) * 100
      : 0;

    // 3. Previous period for trends
    const durationMs = differenceInMilliseconds(endDate, startDate);
    const prevEndDate = subMilliseconds(startDate, 1);
    const prevStartDate = subMilliseconds(prevEndDate, durationMs);

    const prevTotals = await calculateTotals(prevStartDate, prevEndDate);

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    const trends = {
      revenue: calculateTrend(summary.totalRevenueExTax, prevTotals.revenue),
      costs: calculateTrend(summary.totalCosts, prevTotals.totalCosts),
      profit: calculateTrend(summary.profit, prevTotals.profit),
      grossProfit: calculateTrend(summary.grossProfit, prevTotals.grossProfit),   // NEW
      netTax: calculateTrend(Math.abs(summary.netTax), Math.abs(prevTotals.netTax))
    };

    return NextResponse.json({
      summary,
      monthlyBreakdown: monthlyBreakdown.reverse(),
      trends
    });

  } catch (error) {
    console.error("Profit & Loss API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profit & loss data" },
      { status: 500 }
    );
  }
}