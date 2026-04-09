// app/api/purchase-report/route.ts - OPTIMIZED: Uses Aggregation Facets with Explicit Types & Trends

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Journal from "@/models/Journal";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { startOfMonth, endOfMonth, eachMonthOfInterval, format, differenceInMilliseconds, subMilliseconds } from 'date-fns';

// --- Response Interfaces ---
interface MonthlyBreakdown {
  month: string;
  purchaseCount: number;
  amount: number;
  tax: number;
  netTotal: number;
}

interface DailyData {
  date: string;
  purchases: number;
  orders: number;
  avgOrderValue: number;
}

interface PurchaseSummary {
  totalAmount: number;
  totalTax: number;
  totalNetTotal: number;
  totalPurchases: number;
  avgPurchaseValue: number;
}

interface Trends {
  amount: number;
  count: number;
  avgValue: number;
  netTotal: number;
}

// --- Aggregation Result Interfaces ---
interface AggregationSummary {
  _id: null;
  totalAmount: number;
  totalTax: number;
  totalPurchases: number;
}

interface AggregationDaily {
  _id: string;
  dailyAmount: number;
  dailyCount: number;
}

interface AggregationMonthly {
  _id: string;
  monthAmount: number;
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

    // --- Helper to build aggregation pipeline ---
    const buildPipeline = (start: Date, end: Date, includeFacets = false) => {
      const pipeline: any[] = [
        {
          $match: {
            status: 'posted',
            isDeleted: false,
            'entries.accountCode': 'A1200',
            entryDate: { $gte: start, $lte: end }
          }
        },
        // 1. Calculate Amount and Tax for each Journal (Projection)
        {
          $project: {
            entryDate: 1,
            amount: {
              $sum: {
                $map: {
                  input: "$entries",
                  as: "e",
                  in: {
                    $cond: [
                      { $eq: ["$$e.accountCode", "A1200"] },
                      "$$e.debit",
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
                      { $eq: ["$$e.accountCode", "A1300"] },
                      "$$e.debit",
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
                  totalAmount: { $sum: "$amount" },
                  totalTax: { $sum: "$tax" },
                  totalPurchases: { $sum: 1 }
                }
              }
            ],
            "daily": [
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$entryDate" } },
                  dailyAmount: { $sum: "$amount" },
                  dailyCount: { $sum: 1 }
                }
              }
            ],
            "monthly": [
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m", date: "$entryDate" } },
                  monthAmount: { $sum: "$amount" },
                  monthTax: { $sum: "$tax" },
                  monthCount: { $sum: 1 }
                }
              }
            ]
          }
        });
      } else {
        // Just summary for trend calculation
        pipeline.push({
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            totalTax: { $sum: "$tax" },
            totalPurchases: { $sum: 1 }
          }
        });
      }
      return pipeline;
    };

    // 1. Run Aggregation for Current Period (with Facets)
    const currentPipeline = buildPipeline(startDate, endDate, true);
    const aggResult = await Journal.aggregate(currentPipeline);

    // Extract results
    const summaryRes: AggregationSummary = aggResult[0].summary[0] || { totalAmount: 0, totalTax: 0, totalPurchases: 0, _id: null };
    const dailyRes: AggregationDaily[] = aggResult[0].daily;
    const monthlyRes: AggregationMonthly[] = aggResult[0].monthly;

    // --- Process Summary ---
    const summary: PurchaseSummary = {
      totalAmount: summaryRes.totalAmount,
      totalTax: summaryRes.totalTax,
      totalNetTotal: summaryRes.totalAmount + summaryRes.totalTax,
      totalPurchases: summaryRes.totalPurchases,
      avgPurchaseValue: summaryRes.totalPurchases > 0
        ? summaryRes.totalAmount / summaryRes.totalPurchases
        : 0
    };

    // 2. Calculate Trends (Previous Period)
    const durationMs = differenceInMilliseconds(endDate, startDate);
    const prevEndDate = subMilliseconds(startDate, 1);
    const prevStartDate = subMilliseconds(prevEndDate, durationMs);

    const prevPipeline = buildPipeline(prevStartDate, prevEndDate, false);
    const prevResult = await Journal.aggregate(prevPipeline);
    const prevSummary = prevResult[0] || { totalAmount: 0, totalTax: 0, totalPurchases: 0 };
    const prevNetTotal = prevSummary.totalAmount + prevSummary.totalTax;
    const prevAvgValue = prevSummary.totalPurchases > 0 ? prevSummary.totalAmount / prevSummary.totalPurchases : 0;

    const calculateTrend = (current: number, previous: number) => {
      if (previous === 0) return current === 0 ? 0 : 100;
      return ((current - previous) / Math.abs(previous)) * 100;
    };

    const trends: Trends = {
      amount: calculateTrend(summary.totalAmount, prevSummary.totalAmount),
      count: calculateTrend(summary.totalPurchases, prevSummary.totalPurchases),
      avgValue: calculateTrend(summary.avgPurchaseValue, prevAvgValue),
      netTotal: calculateTrend(summary.totalNetTotal, prevNetTotal)
    };

    // --- Process Daily Data ---
    const dailyData: DailyData[] = dailyRes.map((d) => ({
      date: d._id,
      purchases: d.dailyAmount,
      orders: d.dailyCount,
      avgOrderValue: d.dailyCount > 0 ? d.dailyAmount / d.dailyCount : 0
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
        monthAmount: 0,
        monthTax: 0,
        monthCount: 0,
        _id: monthKey
      };

      return {
        month: format(month, 'MMM yyyy'),
        purchaseCount: data.monthCount,
        amount: data.monthAmount,
        tax: data.monthTax,
        netTotal: data.monthAmount + data.monthTax,
      };
    });

    return NextResponse.json({
      summary,
      trends, // Include trends in response
      dailyData,
      monthlyBreakdown: monthlyBreakdown.reverse()
    });

  } catch (error) {
    console.error("Purchase Report API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch purchase data" },
      { status: 500 }
    );
  }
}