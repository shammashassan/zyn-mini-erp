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

    // Helper function to calculate totals for a given date range
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
        if (account.accountCode === 'A1200') { // Inventory
          purchasesExTax += (debit - credit);
        }
        if (account.accountCode === 'L1002') { // VAT Payable
          salesTax += (credit - debit);
        }
        if (account.accountCode === 'A1300') { // VAT Receivable
          purchaseTax += (debit - credit);
        }
      });

      const totalCosts = expenses + purchasesExTax;
      const profit = revenue - totalCosts;
      const netTax = salesTax - purchaseTax;

      return {
        revenue,
        expenses,
        purchasesExTax,
        salesTax,
        purchaseTax,
        totalCosts,
        profit,
        netTax
      };
    }

    // 2. Calculate Current Period Totals (Detailed Aggregation for Charts)
    // We still need the monthly breakdown logic for the chart, so we keep the original aggregation flow for current period
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

    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const monthlyBreakdown = months.map(month => {
      const monthKey = format(month, 'yyyy-MM');
      const monthBuckets = currentAggregation.filter((r: any) => r._id.month === monthKey);

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

      const totalCosts = expenses + purchasesExTax;
      const profit = revenue - totalCosts;

      return {
        period: format(month, 'MMM yyyy'),
        revenue,
        expenses,
        orderAmount: 0,
        orders: 0,
        purchaseAmount: purchasesExTax,
        purchases: 0,
        expenseCount: 0,
        salesTax,
        purchaseTax,
        profit,
      };
    });

    // Calculate Summary from Breakdown
    const summary = monthlyBreakdown.reduce((acc, month) => {
      acc.totalRevenueExTax += month.revenue;
      acc.totalExpenses += month.expenses;
      acc.totalPurchasesExTax += month.purchaseAmount;
      acc.salesTax += month.salesTax;
      acc.purchaseTax += month.purchaseTax;
      return acc;
    }, {
      totalRevenueExTax: 0,
      totalExpenses: 0,
      totalPurchasesExTax: 0,
      totalCosts: 0,
      salesTax: 0,
      purchaseTax: 0,
      netTax: 0,
      profit: 0,
      profitMargin: 0,
      totalOrders: 0,
      totalOrderAmount: 0
    });

    summary.totalCosts = summary.totalExpenses + summary.totalPurchasesExTax;
    summary.netTax = summary.salesTax - summary.purchaseTax;
    summary.profit = summary.totalRevenueExTax - summary.totalCosts;
    summary.profitMargin = summary.totalRevenueExTax > 0 
      ? (summary.profit / summary.totalRevenueExTax) * 100 
      : 0;

    // 3. Calculate Previous Period for Trends
    // Calculate previous date range with same duration
    const durationMs = differenceInMilliseconds(endDate, startDate);
    const prevEndDate = subMilliseconds(startDate, 1);
    const prevStartDate = subMilliseconds(prevEndDate, durationMs);

    const prevTotals = await calculateTotals(prevStartDate, prevEndDate);

    // Calculate Percentage Changes
    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    const trends = {
      revenue: calculateTrend(summary.totalRevenueExTax, prevTotals.revenue),
      costs: calculateTrend(summary.totalCosts, prevTotals.totalCosts),
      profit: calculateTrend(summary.profit, prevTotals.profit),
      netTax: calculateTrend(Math.abs(summary.netTax), Math.abs(prevTotals.netTax))
    };

    return NextResponse.json({
      summary,
      monthlyBreakdown: monthlyBreakdown.reverse(),
      trends // Send trends to frontend
    });

  } catch (error) {
    console.error("Profit & Loss API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch profit & loss data" },
      { status: 500 }
    );
  }
}