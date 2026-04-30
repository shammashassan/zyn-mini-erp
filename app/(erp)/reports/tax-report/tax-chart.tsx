"use client";

import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { TaxReportData } from "./columns";
import { formatCompactCurrency } from "@/utils/formatters/currency";
import { formatMonth, formatMonthKey } from "@/utils/formatters/date";

interface TaxReportChartProps {
  data: TaxReportData[];
  dateRange: { from: Date; to: Date };
}

const chartConfig = {
  salesTax: {
    label: "Sales Tax",
    color: "var(--chart-1)",
  },
  purchaseTax: {
    label: "Purchase Tax",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function TaxReportChart({ data, dateRange }: TaxReportChartProps) {
  // Transform data for the bar chart
  const chartData = React.useMemo(() => {
    return data.map(item => ({
      month: item.period.slice(0, 3),
      salesTax: item.salesTax,
      purchaseTax: item.purchaseTax,
      netTax: item.netTaxLiability,
    }));
  }, [data]);

  // Calculate summary statistics
  const totals = React.useMemo(() => {
    const totalSalesTax = data.reduce((sum, item) => sum + item.salesTax, 0);
    const totalPurchaseTax = data.reduce((sum, item) => sum + item.purchaseTax, 0);
    const totalNetTax = totalSalesTax - totalPurchaseTax;
    
    // Calculate trend (comparing last month to average)
    if (data.length >= 2) {
      const lastMonth = data[data.length - 1];
      const previousMonths = data.slice(0, -1);
      const avgPreviousNet = previousMonths.reduce((sum, item) => sum + item.netTaxLiability, 0) / previousMonths.length;
      const currentNet = lastMonth.netTaxLiability;
      const trendPercentage = avgPreviousNet !== 0 ? ((currentNet - avgPreviousNet) / Math.abs(avgPreviousNet)) * 100 : 0;
      
      return {
        totalSalesTax,
        totalPurchaseTax,
        totalNetTax,
        trendPercentage,
        isIncreasing: trendPercentage > 0,
      };
    }
    
    return {
      totalSalesTax,
      totalPurchaseTax,
      totalNetTax,
      trendPercentage: 0,
      isIncreasing: true,
    };
  }, [data]);

  const formatDateRange = () => {
    return `${formatMonthKey(dateRange.from)} - ${formatMonthKey(dateRange.to)}`;
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tax Analysis</CardTitle>
          <CardDescription>No tax data available for the selected period</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Select a date range to view tax analysis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/chart">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Tax Analysis</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/chart:block">
              {formatDateRange()} • Sales tax collected vs Purchase tax paid
            </span>
            <span className="@[540px]/chart:hidden">
              {formatMonth(dateRange.from)} - {formatMonthKey(dateRange.to)}
            </span>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-col @[800px]/chart:flex-row gap-6">
          {/* Chart Section */}
          <div className="flex-1">
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-[250px] w-full"
            >
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip 
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" />}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="salesTax"
                  fill="var(--color-salesTax)"
                  radius={4}
                />
                <Bar
                  dataKey="purchaseTax"
                  fill="var(--color-purchaseTax)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Metrics Section */}
          <div className="w-full @[800px]/chart:w-72 flex-shrink-0">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Performance Metrics</h4>
                
                {/* Net Tax Liability */}
                <div className="flex items-center justify-between p-1 rounded-lg bg-muted/50 mb-1">
                  <div className="flex items-center gap-2">
                    {totals.totalNetTax >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-orange-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-green-600" />
                    )}
                    <span className="font-medium text-sm">
                      {totals.totalNetTax >= 0 ? "Net Liability" : "Net Refund"}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-sm ${totals.totalNetTax >= 0 ? "text-orange-600" : "text-green-600"}`}>
                      {formatCompactCurrency(Math.abs(totals.totalNetTax))}
                    </div>
                    {totals.trendPercentage !== 0 && (
                      <div className={`text-xs ${totals.isIncreasing ? "text-orange-600" : "text-green-600"}`}>
                        {totals.isIncreasing ? "↗" : "↘"} {Math.abs(totals.trendPercentage).toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Sales Tax */}
                <div className="flex items-center justify-between p-1 rounded-lg bg-muted/50 mb-1">
                  <span className="font-medium text-sm">Total Sales Tax</span>
                  <span className="font-bold text-sm">
                    {formatCompactCurrency(totals.totalSalesTax)}
                  </span>
                </div>

                {/* Purchase Tax */}
                <div className="flex items-center justify-between p-1 rounded-lg bg-muted/50 mb-1">
                  <span className="font-medium text-sm">Total Purchase Tax</span>
                  <span className="font-bold text-sm">
                    {formatCompactCurrency(totals.totalPurchaseTax)}
                  </span>
                </div>
              </div>

              {/* Tax Breakdown */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Period Summary</h4>
                <div className="space-y-2">
                  {totals.totalSalesTax > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-chart-1"></div>
                        Sales Tax
                      </span>
                      <span className="font-medium">{formatCompactCurrency(totals.totalSalesTax)}</span>
                    </div>
                  )}
                  {totals.totalPurchaseTax > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-chart-2"></div>
                        Purchase Tax
                      </span>
                      <span className="font-medium">{formatCompactCurrency(totals.totalPurchaseTax)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 mt-2">
                    <div className="text-xs text-muted-foreground">
                      {totals.totalNetTax >= 0 ? "Amount owed to government" : "Refund expected"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}