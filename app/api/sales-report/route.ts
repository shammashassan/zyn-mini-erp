// app/api/sales-report/route.ts - OPTIMIZED: Uses Aggregation Facets with Trends

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Journal from "@/models/Journal";
import ChartOfAccount from "@/models/ChartOfAccount";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { startOfMonth, endOfMonth, eachMonthOfInterval, format, differenceInMilliseconds, subMilliseconds } from 'date-fns';

// --- Response Interfaces ---
interface MonthlyBreakdown {
  month: string;
  invoiceCount: number;
  revenue: number;
  tax: number;
  netTotal: number;
}

interface DailyData {
  date: string;
  sales: number;
  orders: number;
  avgOrderValue: number;
}

interface SalesSummary {
  totalRevenue: number;
  totalTax: number;
  totalNetTotal: number;
  totalInvoices: number;
  avgInvoiceValue: number;
  profitMargin: number;
}

interface Trends {
  revenue: number;
  invoices: number;
  avgValue: number;
  margin: number;
}

// --- Aggregation Result Interfaces ---
interface AggregationSummary {
  _id: null;
  totalRevenue: number;
  totalTax: number;
  totalInvoices: number;
}

interface AggregationDaily {
  _id: string;
  dailyRevenue: number;
  dailyCount: number;
}

interface AggregationMonthly {
  _id: string;
  monthRevenue: number;
  monthTax: number;
  monthCount: number;
}

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      report: ["read"],
    });
    if (error) return error;

    await dbConnect();

    // Parse query parameters
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

    // 1. PRE-FETCH ACCOUNT CODES (Optimization Strategy)
    const accounts = await ChartOfAccount.find({
      isActive: true,
      isDeleted: false
    }).lean();

    // Create array of Income Account Codes
    const incomeAccountCodes = accounts
      .filter(acc => acc.groupName === 'Income')
      .map(acc => acc.accountCode);

    const taxAccountCode = 'L1002'; // VAT Payable

    // Helper to build pipeline
    const buildPipeline = (start: Date, end: Date, includeFacets = false) => {
      const pipeline: any[] = [
        {
          $match: {
            status: 'posted',
            isDeleted: false,
            referenceType: 'Invoice',
            entryDate: { $gte: start, $lte: end }
          }
        },
        // Projection
        {
          $project: {
            entryDate: 1,
            revenue: {
              $sum: {
                $map: {
                  input: "$entries",
                  as: "e",
                  in: {
                    $cond: [
                      { $in: ["$$e.accountCode", incomeAccountCodes] },
                      "$$e.credit",
                      0
                    ]
                  }
                }
              }
            },
            tax: {
              $sum: {
                $map: {
                  input: "$entries",
                  as: "e",
                  in: {
                    $cond: [
                      { $eq: ["$$e.accountCode", taxAccountCode] },
                      "$$e.credit",
                      0
                    ]
                  }
                }
              }
            }
          }
        }
      ];

      if (includeFacets) {
        pipeline.push({
          $facet: {
            "summary": [
              {
                $group: {
                  _id: null,
                  totalRevenue: { $sum: "$revenue" },
                  totalTax: { $sum: "$tax" },
                  totalInvoices: { $sum: 1 }
                }
              }
            ],
            "daily": [
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$entryDate" } },
                  dailyRevenue: { $sum: "$revenue" },
                  dailyCount: { $sum: 1 }
                }
              }
            ],
            "monthly": [
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m", date: "$entryDate" } },
                  monthRevenue: { $sum: "$revenue" },
                  monthTax: { $sum: "$tax" },
                  monthCount: { $sum: 1 }
                }
              }
            ]
          }
        });
      } else {
        pipeline.push({
          $group: {
            _id: null,
            totalRevenue: { $sum: "$revenue" },
            totalTax: { $sum: "$tax" },
            totalInvoices: { $sum: 1 }
          }
        });
      }

      return pipeline;
    };

    // 2. RUN AGGREGATION (Current Period)
    const currentPipeline = buildPipeline(startDate, endDate, true);
    const aggResult = await Journal.aggregate(currentPipeline);

    // Extract results
    const summaryRes: AggregationSummary = aggResult[0].summary[0] || { totalRevenue: 0, totalTax: 0, totalInvoices: 0, _id: null };
    const dailyRes: AggregationDaily[] = aggResult[0].daily;
    const monthlyRes: AggregationMonthly[] = aggResult[0].monthly;

    // --- Process Summary ---
    const totalRevenue = summaryRes.totalRevenue;
    const profitMargin = totalRevenue > 0 ? ((totalRevenue * 0.3) / totalRevenue) * 100 : 0;

    const summary: SalesSummary = {
      totalRevenue: totalRevenue,
      totalTax: summaryRes.totalTax,
      totalNetTotal: totalRevenue + summaryRes.totalTax,
      totalInvoices: summaryRes.totalInvoices,
      avgInvoiceValue: summaryRes.totalInvoices > 0
        ? totalRevenue / summaryRes.totalInvoices
        : 0,
      profitMargin
    };

    // 3. CALCULATE TRENDS (Previous Period)
    const durationMs = differenceInMilliseconds(endDate, startDate);
    const prevEndDate = subMilliseconds(startDate, 1);
    const prevStartDate = subMilliseconds(prevEndDate, durationMs);

    const prevPipeline = buildPipeline(prevStartDate, prevEndDate, false);
    const prevResult = await Journal.aggregate(prevPipeline);
    const prevSummary = prevResult[0] || { totalRevenue: 0, totalTax: 0, totalInvoices: 0 };
    const prevAvgValue = prevSummary.totalInvoices > 0 ? prevSummary.totalRevenue / prevSummary.totalInvoices : 0;
    const prevMargin = prevSummary.totalRevenue > 0 ? ((prevSummary.totalRevenue * 0.3) / prevSummary.totalRevenue) * 100 : 0;

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    const trends: Trends = {
      revenue: calculateTrend(summary.totalRevenue, prevSummary.totalRevenue),
      invoices: calculateTrend(summary.totalInvoices, prevSummary.totalInvoices),
      avgValue: calculateTrend(summary.avgInvoiceValue, prevAvgValue),
      margin: calculateTrend(summary.profitMargin, prevMargin)
    };

    // --- Process Daily Data ---
    const dailyData: DailyData[] = dailyRes.map((d) => ({
      date: d._id,
      sales: d.dailyRevenue,
      orders: d.dailyCount,
      avgOrderValue: d.dailyCount > 0 ? d.dailyRevenue / d.dailyCount : 0
    }));

    dailyData.sort((a, b) => a.date.localeCompare(b.date));

    // --- Process Monthly Breakdown ---
    const monthlyMap = new Map<string, AggregationMonthly>(
      monthlyRes.map((m) => [m._id, m])
    );

    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const monthlyBreakdown: MonthlyBreakdown[] = months.map(month => {
      const monthKey = format(month, 'yyyy-MM');

      const data = monthlyMap.get(monthKey) || {
        monthRevenue: 0,
        monthTax: 0,
        monthCount: 0,
        _id: monthKey
      };

      return {
        month: format(month, 'MMM yyyy'),
        invoiceCount: data.monthCount,
        revenue: data.monthRevenue,
        tax: data.monthTax,
        netTotal: data.monthRevenue + data.monthTax,
      };
    });

    return NextResponse.json({
      summary,
      trends, // Include trends
      dailyData,
      monthlyBreakdown: monthlyBreakdown.reverse()
    });

  } catch (error) {
    console.error("Sales Report API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sales data" },
      { status: 500 }
    );
  }
}