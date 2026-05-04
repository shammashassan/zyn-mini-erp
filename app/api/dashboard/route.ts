// app/api/dashboard/route.ts - OPTIMIZED: Uses Aggregation Facets with Robust Error Handling

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import Journal from "@/models/Journal";
import Party from "@/models/Party";
import ChartOfAccount from "@/models/ChartOfAccount";
import POSSale from "@/models/POSSale";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { startOfMonth, endOfMonth, subMonths, eachDayOfInterval, format } from 'date-fns';
import Item from "@/models/Item";
import mongoose from "mongoose";

// Types for aggregated data
interface DailySummary {
  date: string;
  sales: number;
  expenses: number;
}

interface RecentSaleDocument {
  _id: unknown;
  documentNumber: string;

  // ✅ Party Snapshot
  partySnapshot?: {
    displayName: string;
    address?: {
      street?: string;
      city?: string;
      district?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    taxIdentifiers?: {
      vatNumber?: string;
    };
  };

  // ✅ Fallback to populated party
  partyId?: {
    name?: string;
    company?: string;
  };

  grandTotal: number;
  createdAt: Date;
  status?: string;
  documentType?: string;
}

interface AggregatedPeriodResult {
  _id: null;
  revenue: number;
  expenses: number;
  purchases: number;
  netTax: number;
  salary: number;
  rent: number;
  orderCount: number;
}

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      dashboard: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const _ensuremodel = [Invoice, Journal, Party, ChartOfAccount, POSSale, Item];
    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "monthly";

    const now = new Date();
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    let currentStart: Date;
    let previousStart: Date;
    let previousEnd: Date;

    if (range === "daily") {
      currentStart = new Date(now);
      currentStart.setHours(0, 0, 0, 0);

      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 1);

      previousEnd = new Date(previousStart);
      previousEnd.setHours(23, 59, 59, 999);
    } else {
      // Default to Monthly
      currentStart = startOfMonth(now);
      previousStart = startOfMonth(subMonths(now, 1));
      previousEnd = endOfMonth(subMonths(now, 1));
    }

    const chartStartDate = subMonths(now, 3);
    chartStartDate.setHours(0, 0, 0, 0);

    // 1. Pre-fetch Accounts to Identify Groups
    const accounts = await ChartOfAccount.find({
      isActive: true,
      isDeleted: false
    }).select('accountCode groupName').lean();

    const inventoryCode = 'A1200';
    const vatPayableCode = 'L1002';
    const vatReceivableCode = 'A1300';
    const salaryCode = 'X2001';
    const rentCode = 'X2002';
    const cogsCode = 'X1001'; // Cost of Goods Sold — isolated from general expenses

    const incomeCodes = accounts
      .filter(a => a.groupName === 'Income' && a.accountCode)
      .map(a => a.accountCode);

    const expenseCodes = accounts
      .filter(a => a.groupName === 'Expenses' && a.accountCode && a.accountCode !== salaryCode && a.accountCode !== rentCode && a.accountCode !== cogsCode)
      .map(a => a.accountCode);

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
          revenue: {
            $reduce: {
              input: { $ifNull: ["$entries", []] },
              initialValue: 0,
              in: {
                $cond: [
                  { $in: ["$$this.accountCode", incomeCodes] },
                  { $add: ["$$value", { $subtract: [{ $ifNull: ["$$this.credit", 0] }, { $ifNull: ["$$this.debit", 0] }] }] },
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
                  { $add: ["$$value", { $subtract: [{ $ifNull: ["$$this.debit", 0] }, { $ifNull: ["$$this.credit", 0] }] }] },
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
                  { $eq: ["$$this.accountCode", cogsCode] }, // X1001 — true P&L cost, not inventory balance
                  { $add: ["$$value", { $subtract: [{ $ifNull: ["$$this.debit", 0] }, { $ifNull: ["$$this.credit", 0] }] }] },
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
                  { $in: ["$$this.accountCode", [vatPayableCode, vatReceivableCode]] },
                  { $add: ["$$value", { $subtract: [{ $ifNull: ["$$this.credit", 0] }, { $ifNull: ["$$this.debit", 0] }] }] },
                  "$$value"
                ]
              }
            }
          },
          salary: {
            $reduce: {
              input: { $ifNull: ["$entries", []] },
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.accountCode", salaryCode] },
                  { $add: ["$$value", { $subtract: [{ $ifNull: ["$$this.debit", 0] }, { $ifNull: ["$$this.credit", 0] }] }] },
                  "$$value"
                ]
              }
            }
          },
          rent: {
            $reduce: {
              input: { $ifNull: ["$entries", []] },
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.accountCode", rentCode] },
                  { $add: ["$$value", { $subtract: [{ $ifNull: ["$$this.debit", 0] }, { $ifNull: ["$$this.credit", 0] }] }] },
                  "$$value"
                ]
              }
            }
          }
        }
      },
      {
        $facet: {
          "currentSummary": [
            {
              $match: {
                entryDate: { $gte: currentStart, $lte: todayEnd }
              }
            },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$revenue" },
                expenses: { $sum: "$expenses" },
                purchases: { $sum: "$purchases" },
                netTax: { $sum: "$netTax" },
                salary: { $sum: "$salary" },
                rent: { $sum: "$rent" },
                orderCount: { $sum: { $cond: [{ $gt: ["$revenue", 0] }, 1, 0] } }
              }
            }
          ],
          "previousSummary": [
            {
              $match: {
                entryDate: { $gte: previousStart, $lte: previousEnd }
              }
            },
            {
              $group: {
                _id: null,
                revenue: { $sum: "$revenue" },
                expenses: { $sum: "$expenses" },
                purchases: { $sum: "$purchases" },
                netTax: { $sum: "$netTax" },
                salary: { $sum: "$salary" },
                rent: { $sum: "$rent" },
                orderCount: { $sum: { $cond: [{ $gt: ["$revenue", 0] }, 1, 0] } }
              }
            }
          ],
          "dailyData": [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m-%d", date: "$entryDate" } },
                revenue: { $sum: "$revenue" },
                purchases: { $sum: "$purchases" },
                netTax: { $sum: "$netTax" },
                salary: { $sum: "$salary" },
                rent: { $sum: "$rent" }
              }
            }
          ]
        }
      }
    ]);

    const currentRes: AggregatedPeriodResult = aggResult[0].currentSummary[0] || { revenue: 0, expenses: 0, purchases: 0, netTax: 0, salary: 0, rent: 0, orderCount: 0 };
    const previousRes: AggregatedPeriodResult = aggResult[0].previousSummary[0] || { revenue: 0, expenses: 0, purchases: 0, netTax: 0, salary: 0, rent: 0, orderCount: 0 };
    const dailyRes: any[] = aggResult[0].dailyData;

    // 3. Process Summary Data
    const prepareStats = (res: AggregatedPeriodResult) => {
      const revenue = res.revenue;
      const cogs = res.purchases;
      const grossProfit = revenue - cogs;
      const opex = res.expenses + res.salary + res.rent;
      const netProfit = grossProfit - opex;

      return {
        revenue,
        cogs,
        grossProfit,
        opex,
        netProfit,
        expenses: res.expenses, // Other expenses
        purchases: res.purchases,
        netTax: res.netTax,
        salary: res.salary,
        rent: res.rent,
        orders: res.orderCount,
        totalCosts: cogs + opex,
      };
    };

    const currentStats = prepareStats(currentRes);
    const previousStats = prepareStats(previousRes);

    // 4. Process Daily Data
    const dailyMap = new Map(dailyRes.map(d => [d._id, d]));
    const days = eachDayOfInterval({ start: chartStartDate, end: now });

    const chartData: DailySummary[] = days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const data = dailyMap.get(dateKey) || { revenue: 0, expenses: 0, purchases: 0, netTax: 0 };

      const sales = data.revenue;
      const expenses = data.expenses + data.purchases + (data.salary || 0) + (data.rent || 0);

      return {
        date: dateKey,
        sales: Math.round(sales),
        expenses: Math.round(expenses)
      };
    });

    // 5. Fetch Recent Sales
    const [recentInvoicesList, recentPOSSales] = await Promise.all([
      Invoice.find({ isDeleted: false, status: "approved" })
        .select("invoiceNumber partySnapshot partyId grandTotal createdAt status")
        .populate({ path: 'partyId', select: 'name company type' })
        .sort({ createdAt: -1 }).limit(10).lean<any[]>(),

      POSSale.find({ isDeleted: false })
        .select("saleNumber customerName partySnapshot partyId grandTotal createdAt")
        .populate({ path: 'partyId', select: 'name company type' })
        .sort({ createdAt: -1 }).limit(10).lean<any[]>()
    ]);

    const combinedSales = [
      ...recentInvoicesList.map(sale => ({
        _id: String(sale._id),
        documentNumber: sale.invoiceNumber,
        partySnapshot: sale.partySnapshot,
        partyId: sale.partyId,
        grandTotal: sale.grandTotal,
        createdAt: sale.createdAt,
        documentType: "invoice",
        status: sale.status
      })),
      ...recentPOSSales.map(sale => ({
        _id: String(sale._id),
        documentNumber: sale.saleNumber,
        partySnapshot: sale.partySnapshot || { displayName: sale.customerName },
        partyId: sale.partyId,
        grandTotal: sale.grandTotal,
        createdAt: sale.createdAt,
        documentType: "pos_sale",
        status: "approved"
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

    // 6. Calculate Top Selling Products
    const [invoiceItemStats, posItemStats] = await Promise.all([
      Invoice.aggregate([
        {
          $match: {
            isDeleted: false,
            status: "approved",
            invoiceDate: { $gte: currentStart, $lte: todayEnd }
          }
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.itemId",
            sales: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" }
          }
        }
      ]),
      POSSale.aggregate([
        {
          $match: {
            isDeleted: false,
            createdAt: { $gte: currentStart, $lte: todayEnd }
          }
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.itemId",
            sales: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" }
          }
        }
      ])
    ]);

    const productStatsMap = new Map();
    const processStats = (stats: any[]) => {
      for (const stat of stats) {
        if (!stat._id) continue;
        const id = String(stat._id);
        const existing = productStatsMap.get(id) || { sales: 0, revenue: 0 };
        productStatsMap.set(id, {
          sales: existing.sales + stat.sales,
          revenue: existing.revenue + stat.revenue,
        });
      }
    };
    processStats(invoiceItemStats);
    processStats(posItemStats);

    const topItemIds = Array.from(productStatsMap.keys())
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const topItemsData = await Item.find({ _id: { $in: topItemIds }, isDeleted: false })
      .select("name sku category stock minStockLevel")
      .lean<any[]>();

    const topProducts = topItemsData.map(item => {
      const stats = productStatsMap.get(String(item._id));

      return {
        id: String(item._id),
        name: item.name || "Unknown Item",
        category: item.category || "Uncategorized",
        price: 0,
        sales: stats?.sales || 0,
        revenue: stats?.revenue || 0
      };
    })
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    // 7. Calculate Trends
    return NextResponse.json({
      summary: currentStats,
      previousSummary: previousStats,
      trends: {
        revenue: calculateTrend(currentStats.revenue, previousStats.revenue),
        cogs: calculateTrend(currentStats.cogs, previousStats.cogs),
        grossProfit: calculateTrend(currentStats.grossProfit, previousStats.grossProfit),
        opex: calculateTrend(currentStats.opex, previousStats.opex),
        netProfit: calculateTrend(currentStats.netProfit, previousStats.netProfit),
        expenses: calculateTrend(currentStats.expenses, previousStats.expenses),
        purchases: calculateTrend(currentStats.purchases, previousStats.purchases),
        orders: calculateTrend(currentStats.orders, previousStats.orders),
        totalCosts: calculateTrend(currentStats.totalCosts, previousStats.totalCosts),
        salary: calculateTrend(currentStats.salary, previousStats.salary),
        rent: calculateTrend(currentStats.rent, previousStats.rent),
      },
      chartData,
      recentSales: combinedSales,
      topProducts
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
    if (current > 0) return { trend: "up", change: 100 };
    if (current < 0) return { trend: "down", change: -100 };
    return { trend: "neutral", change: 0 };
  }

  const percentChange = ((current - previous) / previous) * 100;

  return {
    trend: percentChange > 0 ? "up" : percentChange < 0 ? "down" : "neutral",
    change: percentChange
  };
}