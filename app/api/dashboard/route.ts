// app/api/dashboard/route.ts - OPTIMIZED: Uses Aggregation Facets with Robust Error Handling

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import Journal from "@/models/Journal";
import ChartOfAccount from "@/models/ChartOfAccount";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { startOfMonth, endOfMonth, subMonths, eachDayOfInterval, format } from 'date-fns';

// Types for aggregated data
interface DailySummary {
  date: string;
  sales: number;
  expenses: number;
}

interface RecentSaleDocument {
  _id: unknown;
  invoiceNumber: string;
  customerName?: string;
  grandTotal: number;
  createdAt: Date;
  status?: string;
}

interface AggregatedPeriodResult {
  _id: null;
  revenue: number;
  expenses: number;
  purchases: number;
  netTax: number;
  orderCount: number;
}

export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      dashboard: ["read"],
    });
    if (error) return error;
    
    await dbConnect();

    const now = new Date();
    // Set 'now' to end of day to include today's transactions
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const currentMonthStart = startOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));
    const chartStartDate = subMonths(now, 3);
    // Ensure chart starts at beginning of that day
    chartStartDate.setHours(0, 0, 0, 0);

    // 1. Pre-fetch Accounts to Identify Groups
    const accounts = await ChartOfAccount.find({
      isActive: true,
      isDeleted: false
    }).select('accountCode groupName').lean();

    const incomeCodes = accounts
      .filter(a => a.groupName === 'Income' && a.accountCode)
      .map(a => a.accountCode);
      
    const expenseCodes = accounts
      .filter(a => a.groupName === 'Expenses' && a.accountCode)
      .map(a => a.accountCode);
      
    const inventoryCode = 'A1200';
    const vatPayableCode = 'L1002';

    // 2. AGGREGATION PIPELINE
    const aggResult = await Journal.aggregate([
      {
        $match: {
          status: 'posted',
          isDeleted: false,
          entryDate: { $gte: chartStartDate, $lte: todayEnd }
        }
      },
      {
        $project: {
          entryDate: 1,
          referenceType: 1,
          // Calculate Metrics Per Journal using $reduce
          // Use $ifNull to handle potentially missing 'entries' array or missing fields
          revenue: {
            $reduce: {
              input: { $ifNull: ["$entries", []] },
              initialValue: 0,
              in: {
                $cond: [
                  { $in: ["$$this.accountCode", incomeCodes] },
                  { $add: ["$$value", { $ifNull: ["$$this.credit", 0] }] },
                  "$$value"
                ]
              }
            }
          },
          expenses: {
            $reduce: {
              input: { $ifNull: ["$entries", []] },
              initialValue: 0,
              in: {
                $cond: [
                  { $in: ["$$this.accountCode", expenseCodes] },
                  { $add: ["$$value", { $ifNull: ["$$this.debit", 0] }] },
                  "$$value"
                ]
              }
            }
          },
          purchases: {
            $reduce: {
              input: { $ifNull: ["$entries", []] },
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.accountCode", inventoryCode] },
                  { $add: ["$$value", { $ifNull: ["$$this.debit", 0] }] },
                  "$$value"
                ]
              }
            }
          },
          netTax: {
            $reduce: {
              input: { $ifNull: ["$entries", []] },
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.accountCode", vatPayableCode] },
                  { $add: ["$$value", { $subtract: [{ $ifNull: ["$$this.credit", 0] }, { $ifNull: ["$$this.debit", 0] }] }] },
                  "$$value"
                ]
              }
            }
          },
          isOrder: { $cond: [{ $eq: ["$referenceType", "Invoice"] }, 1, 0] }
        }
      },
      {
        $facet: {
          // A. Current Month Summary
          "currentSummary": [
            {
              $match: {
                entryDate: { $gte: currentMonthStart, $lte: todayEnd }
              }
            },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$revenue" },
                expenses: { $sum: "$expenses" },
                purchases: { $sum: "$purchases" },
                netTax: { $sum: "$netTax" },
                orderCount: { $sum: "$isOrder" }
              }
            }
          ],
          // B. Last Month Summary
          "lastSummary": [
            {
              $match: {
                entryDate: { $gte: lastMonthStart, $lte: lastMonthEnd }
              }
            },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$revenue" },
                expenses: { $sum: "$expenses" },
                purchases: { $sum: "$purchases" },
                netTax: { $sum: "$netTax" },
                orderCount: { $sum: "$isOrder" }
              }
            }
          ],
          // C. Daily Chart Data
          "dailyData": [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$entryDate" } },
                revenue: { $sum: "$revenue" },
                expenses: { $sum: "$expenses" },
                purchases: { $sum: "$purchases" },
                netTax: { $sum: "$netTax" }
              }
            }
          ]
        }
      }
    ]);

    const currentRes: AggregatedPeriodResult = aggResult[0].currentSummary[0] || { revenue: 0, expenses: 0, purchases: 0, netTax: 0, orderCount: 0 };
    const lastRes: AggregatedPeriodResult = aggResult[0].lastSummary[0] || { revenue: 0, expenses: 0, purchases: 0, netTax: 0, orderCount: 0 };
    const dailyRes: any[] = aggResult[0].dailyData;

    // 3. Process Summary Data
    const calculateStats = (res: AggregatedPeriodResult) => ({
      revenue: res.revenue,
      costs: res.expenses + res.purchases + res.netTax,
      profit: res.revenue - (res.expenses + res.purchases + res.netTax),
      orders: res.orderCount
    });

    const currentStats = calculateStats(currentRes);
    const lastStats = calculateStats(lastRes);

    // 4. Process Daily Data
    const dailyMap = new Map(dailyRes.map(d => [d._id, d]));
    const days = eachDayOfInterval({ start: chartStartDate, end: now });

    const chartData: DailySummary[] = days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const data = dailyMap.get(dateKey) || { revenue: 0, expenses: 0, purchases: 0, netTax: 0 };
      
      const sales = data.revenue + data.netTax; 
      const expenses = data.expenses + data.purchases + data.netTax; 

      return {
        date: dateKey,
        sales: Math.round(sales),
        expenses: Math.round(expenses)
      };
    });

    // 5. Fetch Recent Invoices
    // Note: Ensure Invoice model is properly registered in your codebase
    const recentInvoices = await Invoice.find({
      isDeleted: false,
      status: "approved"
    })
      .select("invoiceNumber customerName grandTotal createdAt status")
      .sort({ createdAt: -1 })
      .limit(10)
      .lean<RecentSaleDocument[]>();

    // 6. Calculate Trends
    const revenueTrend = calculateTrend(currentStats.revenue, lastStats.revenue);
    const costsTrend = calculateTrend(currentStats.costs, lastStats.costs);
    const profitTrend = calculateTrend(currentStats.profit, lastStats.profit);
    const ordersTrend = calculateTrend(currentStats.orders, lastStats.orders);

    return NextResponse.json({
      summary: {
        currentRevenue: currentStats.revenue,
        lastRevenue: lastStats.revenue,
        currentCosts: currentStats.costs,
        lastCosts: lastStats.costs,
        currentProfit: currentStats.profit,
        lastProfit: lastStats.profit,
        currentOrders: currentStats.orders,
        lastOrders: lastStats.orders,
      },
      trends: {
        revenue: revenueTrend,
        costs: costsTrend,
        profit: profitTrend,
        orders: ordersTrend,
      },
      chartData,
      recentSales: recentInvoices.map(sale => ({
        _id: String(sale._id),
        invoiceNumber: sale.invoiceNumber,
        customerName: sale.customerName || "Walk-in Customer",
        grandTotal: sale.grandTotal,
        createdAt: sale.createdAt,
        documentType: "invoice",
        status: sale.status
      }))
    });

  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

function calculateTrend(current: number, previous: number) {
  if (previous === 0) {
    return { trend: current >= 0 ? "up" : "down", change: 0 };
  }
  
  const percentChange = ((current - previous) / previous) * 100;
  return {
    trend: percentChange >= 0 ? "up" : "down",
    change: percentChange
  };
}