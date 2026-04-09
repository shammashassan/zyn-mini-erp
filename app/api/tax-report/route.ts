// app/api/tax-report/route.ts - OPTIMIZED: Uses Aggregation Facets

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Journal from "@/models/Journal";
import ChartOfAccount from "@/models/ChartOfAccount";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { startOfMonth, endOfMonth, eachMonthOfInterval, format } from 'date-fns';

interface MonthlyBreakdown {
  period: string;
  salesTransactions: number;
  purchaseTransactions: number;
  salesTax: number;
  purchaseTax: number;
  netTaxLiability: number;
  revenueAmount: number;
  purchaseAmount: number;
  salesTaxRate: number;
  purchaseTaxRate: number;
}

interface TaxSummary {
  totalSalesTax: number;
  totalPurchaseTax: number;
  totalRevenueExTax: number;
  totalPurchasesExTax: number;
  netTaxLiability: number;
  salesTaxRate: number;
  purchaseTaxRate: number;
  salesTransactions: number;
  purchaseTransactions: number;
}

// Helper interface for aggregation result
interface AggregationResult {
  _id: any;
  salesTax: number;
  purchaseTax: number;
  revenue: number;
  purchasesExTax: number;
  salesCount: number;
  purchaseCount: number;
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
    endDate.setHours(23, 59, 59, 999);

    // 1. Pre-fetch Income Accounts for Revenue Calculation
    const accounts = await ChartOfAccount.find({
      isActive: true,
      isDeleted: false,
      groupName: 'Income'
    }).select('accountCode').lean();

    const incomeAccountCodes = accounts.map(a => a.accountCode);

    // Fixed Tax/Purchase Accounts
    const VAT_PAYABLE = 'L1002';     // Sales Tax
    const VAT_RECEIVABLE = 'A1300';  // Purchase Tax
    const INVENTORY_ASSET = 'A1200'; // Purchase Cost

    // 2. AGGREGATION PIPELINE
    const aggResult = await Journal.aggregate([
      {
        $match: {
          status: 'posted',
          isDeleted: false,
          entryDate: { $gte: startDate, $lte: endDate }
        }
      },
      // Projection: Calculate values for each Journal
      {
        $project: {
          entryDate: 1,
          referenceType: 1,
          // Calculate Sales Tax (Credit on L1002)
          salesTax: {
            $sum: {
              $map: {
                input: "$entries",
                as: "e",
                in: { $cond: [{ $eq: ["$$e.accountCode", VAT_PAYABLE] }, "$$e.credit", 0] }
              }
            }
          },
          // Calculate Revenue (Credit on Income Accounts)
          revenue: {
            $sum: {
              $map: {
                input: "$entries",
                as: "e",
                in: { $cond: [{ $in: ["$$e.accountCode", incomeAccountCodes] }, "$$e.credit", 0] }
              }
            }
          },
          // Calculate Purchase Tax (Debit on A1300)
          purchaseTax: {
            $sum: {
              $map: {
                input: "$entries",
                as: "e",
                in: { $cond: [{ $eq: ["$$e.accountCode", VAT_RECEIVABLE] }, "$$e.debit", 0] }
              }
            }
          },
          // Calculate Purchase Cost (Debit on A1200)
          purchasesExTax: {
            $sum: {
              $map: {
                input: "$entries",
                as: "e",
                in: { $cond: [{ $eq: ["$$e.accountCode", INVENTORY_ASSET] }, "$$e.debit", 0] }
              }
            }
          }
        }
      },
      // Facet: Run parallel groupings
      {
        $facet: {
          "summary": [
            {
              $group: {
                _id: null,
                totalSalesTax: { $sum: "$salesTax" },
                totalPurchaseTax: { $sum: "$purchaseTax" },
                totalRevenueExTax: { $sum: "$revenue" },
                totalPurchasesExTax: { $sum: "$purchasesExTax" },
                salesTransactions: {
                  $sum: { $cond: [{ $gt: ["$revenue", 0] }, 1, 0] }
                },
                purchaseTransactions: {
                  $sum: { $cond: [{ $gt: ["$purchasesExTax", 0] }, 1, 0] }
                }
              }
            }
          ],
          "monthly": [
            {
              $group: {
                _id: { $dateToString: { format: "%Y-%m", date: "$entryDate" } },
                monthSalesTax: { $sum: "$salesTax" },
                monthPurchaseTax: { $sum: "$purchaseTax" },
                monthRevenue: { $sum: "$revenue" },
                monthPurchasesExTax: { $sum: "$purchasesExTax" },
                salesCount: {
                  $sum: { $cond: [{ $gt: ["$revenue", 0] }, 1, 0] }
                },
                purchaseCount: {
                  $sum: { $cond: [{ $gt: ["$purchasesExTax", 0] }, 1, 0] }
                }
              }
            }
          ]
        }
      }
    ]);

    // Extract Results
    const summaryRes = aggResult[0].summary[0] || {
      totalSalesTax: 0,
      totalPurchaseTax: 0,
      totalRevenueExTax: 0,
      totalPurchasesExTax: 0,
      salesTransactions: 0,
      purchaseTransactions: 0
    };

    const monthlyRes = aggResult[0].monthly;

    // --- Process Summary ---
    const netTaxLiability = summaryRes.totalSalesTax - summaryRes.totalPurchaseTax;
    const salesTaxRate = summaryRes.totalRevenueExTax > 0
      ? (summaryRes.totalSalesTax / summaryRes.totalRevenueExTax) * 100
      : 0;
    const purchaseTaxRate = summaryRes.totalPurchasesExTax > 0
      ? (summaryRes.totalPurchaseTax / summaryRes.totalPurchasesExTax) * 100
      : 0;

    const summary: TaxSummary = {
      totalSalesTax: summaryRes.totalSalesTax,
      totalPurchaseTax: summaryRes.totalPurchaseTax,
      totalRevenueExTax: summaryRes.totalRevenueExTax,
      totalPurchasesExTax: summaryRes.totalPurchasesExTax,
      netTaxLiability,
      salesTaxRate,
      purchaseTaxRate,
      salesTransactions: summaryRes.salesTransactions,
      purchaseTransactions: summaryRes.purchaseTransactions
    };

    // --- Process Monthly Breakdown ---
    // Fix: Explicitly type the Map
    const monthlyMap = new Map<string, any>(
      monthlyRes.map((m: any) => [m._id, m])
    );

    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    const monthlyBreakdown: MonthlyBreakdown[] = months.map(month => {
      const monthKey = format(month, 'yyyy-MM');

      const data = monthlyMap.get(monthKey) || {
        monthSalesTax: 0,
        monthPurchaseTax: 0,
        monthRevenue: 0,
        monthPurchasesExTax: 0,
        salesCount: 0,
        purchaseCount: 0
      };

      const monthNetTaxLiability = data.monthSalesTax - data.monthPurchaseTax;
      const monthSalesTaxRate = data.monthRevenue > 0
        ? (data.monthSalesTax / data.monthRevenue) * 100
        : 0;
      const monthPurchaseTaxRate = data.monthPurchasesExTax > 0
        ? (data.monthPurchaseTax / data.monthPurchasesExTax) * 100
        : 0;

      return {
        period: format(month, 'MMM yyyy'),
        salesTransactions: data.salesCount,
        purchaseTransactions: data.purchaseCount,
        salesTax: data.monthSalesTax,
        purchaseTax: data.monthPurchaseTax,
        netTaxLiability: monthNetTaxLiability,
        revenueAmount: data.monthRevenue,
        // Gross Purchase Amount (Ex Tax + Tax) to match original logic
        purchaseAmount: data.monthPurchasesExTax + data.monthPurchaseTax,
        salesTaxRate: monthSalesTaxRate,
        purchaseTaxRate: monthPurchaseTaxRate
      };
    });

    return NextResponse.json({
      summary,
      monthlyBreakdown: monthlyBreakdown.reverse()
    });

  } catch (error) {
    console.error("Tax Report API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tax data" },
      { status: 500 }
    );
  }
}