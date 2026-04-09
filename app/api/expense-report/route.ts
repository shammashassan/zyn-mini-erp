// app/api/expense-report/route.ts - OPTIMIZED: Uses Specific Category Map

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Journal from "@/models/Journal";
import ChartOfAccount from "@/models/ChartOfAccount";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { startOfMonth, endOfMonth, eachMonthOfInterval, format, differenceInMilliseconds, subMilliseconds } from 'date-fns';

interface CategoryData {
  category: string;
  amount: number;
  count: number;
}

interface MonthlyBreakdown {
  period: string;
  totalAmount: number;
  totalExpenses: number;
  categories: CategoryData[];
  topCategory: string;
  topCategoryAmount: number;
  averageExpense: number;
  highestExpense: number;
  trendVsLastMonth?: number;
}

interface MonthlyTrendData {
  month: string;
  amount: number;
}

interface ExpenseSummary {
  totalAmount: number;
  totalCount: number;
  averageExpense: number;
}

interface Trends {
  amount: number;
  count: number;
  average: number;
}

// Interface for aggregation results to satisfy TypeScript
interface AggregationMonthlyCount {
  _id: string;
  count: number;
  maxExpense: number;
}

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      report: ["read"],
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
    // Ensure full day coverage
    endDate.setHours(23, 59, 59, 999);

    // 1. Fetch Accounts (Lightweight)
    const accounts = await ChartOfAccount.find({
      isActive: true,
      isDeleted: false
    }).lean();

    const accountMap = new Map(
      accounts.map(acc => [acc.accountCode, acc])
    );

    const expenseAccountCodes = accounts
      .filter(acc => acc.groupName === 'Expenses' || (acc.groupName === 'Assets' && acc.subGroup === 'Fixed Assets'))
      .map(acc => acc.accountCode);

    // 2. AGGREGATION PIPELINE (Current Period)
    const aggResult = await Journal.aggregate([
      {
        $match: {
          status: 'posted',
          isDeleted: false,
          'entries.accountCode': { $in: expenseAccountCodes },
          entryDate: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $facet: {
          // Pipeline 1: Count unique Journals (Expenses) per month
          "monthlyCounts": [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$entryDate" } },
                count: { $sum: 1 },
                maxExpense: { $max: "$totalDebit" }
              }
            }
          ],
          // Pipeline 2: Sum Line Items by Account + Month
          "lineItems": [
            { $unwind: "$entries" },
            {
              $group: {
                _id: {
                  month: { $dateToString: { format: "%Y-%m", date: "$entryDate" } },
                  accountCode: "$entries.accountCode"
                },
                totalAmount: { $sum: "$entries.debit" },
                itemCount: { $sum: 1 }
              }
            }
          ]
        }
      }
    ]);

    const monthlyCounts = aggResult[0].monthlyCounts;
    const lineItems = aggResult[0].lineItems;

    // Helper Maps
    const countMap = new Map<string, AggregationMonthlyCount>(
      monthlyCounts.map((m: any) => [m._id, m])
    );

    // Process Line Items into a structured Map: Month -> Category -> Data
    const processedData = new Map<string, Map<string, { amount: number, count: number }>>();

    // Global category accumulator
    const globalCategoryMap = new Map<string, { amount: number, count: number }>();
    let globalTotalAmount = 0;

    lineItems.forEach((item: any) => {
      const { month, accountCode } = item._id;
      const amount = item.totalAmount;
      const count = item.itemCount;

      const account = accountMap.get(accountCode);
      if (!account) return;

      // Logic: Include Expenses OR Fixed Assets (SubGroup used for filtering)
      const isExpense = account.groupName === 'Expenses';
      const isFixedAsset = account.groupName === 'Assets' && account.subGroup === 'Fixed Assets';

      if (!isExpense && !isFixedAsset) return;

      // Use helper function to get simplified category name
      const category = mapAccountToCategory(account);

      // 1. Update Monthly Data
      if (!processedData.has(month)) {
        processedData.set(month, new Map());
      }
      const monthMap = processedData.get(month)!;

      const catData = monthMap.get(category) || { amount: 0, count: 0 };
      catData.amount += amount;
      catData.count += count;
      monthMap.set(category, catData);

      // 2. Update Global Data
      globalTotalAmount += amount;
      const globalCatData = globalCategoryMap.get(category) || { amount: 0, count: 0 };
      globalCatData.amount += amount;
      globalCatData.count += count;
      globalCategoryMap.set(category, globalCatData);
    });

    // --- BUILD REPORT ---

    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const monthlyBreakdown: MonthlyBreakdown[] = [];
    const monthlyTrend: MonthlyTrendData[] = [];
    let globalTotalCount = 0;

    months.forEach((monthDate, index) => {
      const monthKey = format(monthDate, 'yyyy-MM');
      const prettyPeriod = format(monthDate, 'MMM yyyy');

      // Get count data
      const countData = countMap.get(monthKey);
      const totalExpensesCount = countData ? countData.count : 0;
      const highestExpense = countData ? countData.maxExpense : 0;
      globalTotalCount += totalExpensesCount;

      // Get category data
      const monthCategoriesMap = processedData.get(monthKey);
      let monthTotalAmount = 0;
      let categories: CategoryData[] = [];

      if (monthCategoriesMap) {
        categories = Array.from(monthCategoriesMap.entries()).map(([cat, data]) => ({
          category: cat,
          amount: data.amount,
          count: data.count
        })).sort((a, b) => b.amount - a.amount);

        monthTotalAmount = categories.reduce((sum, c) => sum + c.amount, 0);
      }

      // Calculate Trend vs Last Month
      let trendVsLastMonth: number | undefined;
      if (index > 0 && monthlyTrend[index - 1]) {
        const prevAmount = monthlyTrend[index - 1].amount;
        if (prevAmount > 0) {
          trendVsLastMonth = ((monthTotalAmount - prevAmount) / prevAmount) * 100;
        } else if (monthTotalAmount > 0) {
          trendVsLastMonth = 100;
        } else {
          trendVsLastMonth = 0;
        }
      }

      const topCategory = categories.length > 0 ? categories[0] : null;

      monthlyBreakdown.push({
        period: prettyPeriod,
        totalAmount: monthTotalAmount,
        totalExpenses: totalExpensesCount,
        categories,
        topCategory: topCategory?.category || '',
        topCategoryAmount: topCategory?.amount || 0,
        averageExpense: totalExpensesCount > 0 ? monthTotalAmount / totalExpensesCount : 0,
        highestExpense,
        trendVsLastMonth
      });

      monthlyTrend.push({
        month: prettyPeriod,
        amount: monthTotalAmount
      });
    });

    // Final Global Summary
    const summary: ExpenseSummary = {
      totalAmount: globalTotalAmount,
      totalCount: globalTotalCount,
      averageExpense: globalTotalCount > 0 ? globalTotalAmount / globalTotalCount : 0
    };

    const categoryData: CategoryData[] = Array.from(globalCategoryMap.entries())
      .map(([category, data]) => ({
        category,
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => b.amount - a.amount);

    // 3. CALCULATE TRENDS (vs Previous Period)
    const durationMs = differenceInMilliseconds(endDate, startDate);
    const prevEndDate = subMilliseconds(startDate, 1);
    const prevStartDate = subMilliseconds(prevEndDate, durationMs);

    const prevPeriodAgg = await Journal.aggregate([
      {
        $match: {
          status: 'posted',
          isDeleted: false,
          'entries.accountCode': { $in: expenseAccountCodes },
          entryDate: { $gte: prevStartDate, $lte: prevEndDate }
        }
      },
      {
        $facet: {
          "totalCount": [
            { $count: "count" }
          ],
          "totalAmount": [
            { $unwind: "$entries" },
            {
              $lookup: {
                from: "chartofaccounts",
                localField: "entries.accountCode",
                foreignField: "accountCode",
                as: "account"
              }
            },
            { $unwind: "$account" },
            // Filter by Expenses OR Fixed Assets
            {
              $match: {
                $or: [
                  { "account.groupName": "Expenses" },
                  { "account.groupName": "Assets", "account.subGroup": "Fixed Assets" }
                ]
              }
            },
            { $group: { _id: null, total: { $sum: "$entries.debit" } } }
          ]
        }
      }
    ]);

    const prevCount = prevPeriodAgg[0].totalCount[0]?.count || 0;
    const prevAmount = prevPeriodAgg[0].totalAmount[0]?.total || 0;
    const prevAverage = prevCount > 0 ? prevAmount / prevCount : 0;

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    const trends: Trends = {
      amount: calculateTrend(summary.totalAmount, prevAmount),
      count: calculateTrend(summary.totalCount, prevCount),
      average: calculateTrend(summary.averageExpense, prevAverage)
    };

    return NextResponse.json({
      summary,
      categoryData,
      monthlyBreakdown: monthlyBreakdown.reverse(),
      monthlyTrend,
      trends
    });

  } catch (error) {
    console.error("Expense Report API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expense data" },
      { status: 500 }
    );
  }
}

/**
 * Map expense account to category
 */
function mapAccountToCategory(account: any): string {
  const accountCode = account.accountCode;

  const categoryMap: { [key: string]: string } = {
    'X2001': 'Salary',
    'X2002': 'Rent',
    'X2003': 'Utilities',
    'X2004': 'Travel',
    'X2005': 'Marketing',
    'X2006': 'Office Supplies',
    'X2008': 'Professional Services',
    'X2009': 'Insurance',
    'X2011': 'Software',
    'X2012': 'Meals',
    'X2013': 'Training & Development',
    'X2014': 'Miscellaneous',
    'X2015': 'Entertainment',
    'A2002': 'Equipment'
  };

  return categoryMap[accountCode] || account.subGroup || 'Miscellaneous';
}