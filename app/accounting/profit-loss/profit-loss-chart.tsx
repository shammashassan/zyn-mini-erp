// app/profit-loss/profit-loss-chart.tsx - UPDATED: Uniform UI with other charts

"use client";

import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Label, Pie, PieChart } from "recharts";
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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { formatCurrency, formatCompactCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate, formatMonth, formatMonthDay, formatMonthKey } from "@/utils/formatters/date";

interface ProfitLossChartProps {
  profit: number;
  expenses: number;
  purchases: number; // Ex-tax
  netTax: number;
  dateRange: { from: Date; to: Date };
}

const chartConfig = {
  amount: {
    label: "Amount",
  },
  profit: {
    label: "Profit",
    color: "var(--chart-2)",
  },
  expenses: {
    label: "Expenses", 
    color: "var(--chart-4)",
  },
  purchases: {
    label: "Purchases (Ex-Tax)",
    color: "var(--chart-3)",
  },
  netTax: {
    label: "Net Tax",
    color: "var(--chart-1)",
  },
  costs: {
    label: "Total Costs",
    color: "var(--chart-4)",
  }
} satisfies ChartConfig;

// Custom Tooltip Component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const categoryName = data.payload.category;
    const amount = data.value;
    const color = data.payload.fill;
    
    const displayNames: { [key: string]: string } = {
      profit: "Net Profit",
      expenses: "Expenses",
      purchases: "Purchases (Ex-Tax)",
      netTax: "Net Tax",
      costs: "Total Costs"
    };
    
    const displayName = displayNames[categoryName] || categoryName.charAt(0).toUpperCase() + categoryName.slice(1);
    
    return (
      <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[120px]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-sm flex-shrink-0" 
              style={{ backgroundColor: color }}
            />
            <span className="text-sm font-medium">{displayName}</span>
          </div>
          <span className="text-sm font-bold text-right">
            {formatCurrency(amount)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export function ProfitLossChart({ profit, expenses, purchases, netTax, dateRange }: ProfitLossChartProps) {
  const [chartView, setChartView] = React.useState("breakdown");
  
  const totalCosts = expenses + purchases + netTax;
  const revenue = profit + totalCosts; // Calculate revenue from profit + costs
  
  // Breakdown view: Show profit and cost components
  const breakdownData = [
    { category: "profit", amount: Math.abs(profit), fill: profit >= 0 ? "var(--color-profit)" : "var(--chart-5)" },
    { category: "expenses", amount: expenses, fill: "var(--color-expenses)" },
    { category: "purchases", amount: purchases, fill: "var(--color-purchases)" },
    ...(netTax !== 0 ? [{ category: "netTax", amount: Math.abs(netTax), fill: "var(--color-netTax)" }] : []),
  ].filter(item => item.amount > 0);

  // Summary view: Profit vs Total Costs
  const summaryData = [
    { category: "profit", amount: Math.abs(profit), fill: profit >= 0 ? "var(--chart-2)" : "var(--chart-5)" },
    { category: "costs", amount: totalCosts, fill: "var(--color-costs)" },
  ].filter(item => item.amount > 0);

  const chartData = chartView === "breakdown" ? breakdownData : summaryData;

  const totalAmount = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.amount, 0);
  }, [chartData]);

  const profitMargin = revenue > 0 ? ((profit / revenue) * 100) : 0;

  const formatDateRange = () => {
    return `${formatMonthKey(dateRange.from)} - ${formatMonthKey(dateRange.to)}`;
  };

  return (
    <Card className="@container/chart">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Financial Overview</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/chart:block">
              {formatDateRange()} • Calculated from Journal entries
            </span>
            <span className="@[540px]/chart:hidden">
              {formatMonth(dateRange.from)} - {formatMonthKey(dateRange.to)}
            </span>
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <ToggleGroup
            type="single"
            value={chartView}
            onValueChange={setChartView}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/chart:flex"
          >
            <ToggleGroupItem value="breakdown">Breakdown</ToggleGroupItem>
            <ToggleGroupItem value="summary">Summary</ToggleGroupItem>
          </ToggleGroup>
          <Select value={chartView} onValueChange={setChartView}>
            <SelectTrigger
              className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/chart:hidden"
              size="sm"
              aria-label="Select chart view"
            >
              <SelectValue placeholder="Breakdown" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="breakdown" className="rounded-lg">
                Breakdown
              </SelectItem>
              <SelectItem value="summary" className="rounded-lg">
                Summary
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-col @[800px]/chart:flex-row gap-6">
          {/* Chart Section */}
          <div className="flex-1">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[300px]"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<CustomTooltip />}
                />
                <Pie
                  data={chartData}
                  dataKey="amount"
                  nameKey="category"
                  innerRadius={70}
                  outerRadius={120}
                  strokeWidth={8}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text
                            x={viewBox.cx}
                            y={viewBox.cy}
                            textAnchor="middle"
                            dominantBaseline="middle"
                          >
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-3xl font-bold"
                            >
                              {formatCompactCurrency(totalAmount)}
                            </tspan>
                            <tspan
                              x={viewBox.cx}
                              y={(viewBox.cy || 0) + 24}
                              className="fill-muted-foreground text-base"
                            >
                              Total
                            </tspan>
                          </text>
                        );
                      }
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>

          {/* Metrics Section */}
          <div className="w-full @[800px]/chart:w-72 flex-shrink-0">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Performance Metrics</h4>
                
                {/* Profit/Loss */}
                <div className="flex items-center justify-between p-1 rounded-lg bg-muted/50 mb-1">
                  <div className="flex items-center gap-2">
                    {profit >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium text-sm">
                      {profit >= 0 ? "Net Profit" : "Net Loss"}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-sm ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCompactCurrency(Math.abs(profit))}
                    </div>
                  </div>
                </div>

                {/* Profit Margin */}
                <div className="flex items-center justify-between p-1 rounded-lg bg-muted/50 mb-1">
                  <span className="font-medium text-sm">Profit Margin</span>
                  <span className={`font-bold text-sm ${profitMargin >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {profitMargin.toFixed(1)}%
                  </span>
                </div>

                {/* Revenue */}
                <div className="flex items-center justify-between p-1 rounded-lg bg-muted/50 mb-1">
                  <span className="font-medium text-sm">Revenue (Ex-Tax)</span>
                  <span className="font-bold text-sm text-foreground">
                    {formatCompactCurrency(revenue)}
                  </span>
                </div>
              </div>

              {/* Period Summary */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {chartView === "breakdown" ? "Period Summary" : "Period Summary"}
                </h4>
                <div className="space-y-2">
                  {chartView === "breakdown" ? (
                    <>
                      {profit !== 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${profit >= 0 ? "bg-chart-2" : "bg-chart-5"}`}></div>
                            {profit >= 0 ? "Net Profit" : "Net Loss"}
                          </span>
                          <span className={`font-medium ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCompactCurrency(Math.abs(profit))}
                          </span>
                        </div>
                      )}
                      {expenses > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-chart-4"></div>
                            Expenses
                          </span>
                          <span className="font-medium">{formatCompactCurrency(expenses)}</span>
                        </div>
                      )}
                      {purchases > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-chart-3"></div>
                            Purchases (Ex-Tax)
                          </span>
                          <span className="font-medium">{formatCompactCurrency(purchases)}</span>
                        </div>
                      )}
                      {netTax !== 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-chart-1"></div>
                            {netTax >= 0 ? "Net Tax Payable" : "Net Tax Recoverable"}
                          </span>
                          <span className={`font-medium ${netTax >= 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatCompactCurrency(Math.abs(netTax))}
                          </span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <div className="text-xs text-muted-foreground">
                          Profit: Revenue - (Purchases + Expenses + Net Tax)
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {profit !== 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${profit >= 0 ? "bg-chart-2" : "bg-chart-5"}`}></div>
                            {profit >= 0 ? "Net Profit" : "Net Loss"}
                          </span>
                          <span className={`font-medium ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCompactCurrency(Math.abs(profit))}
                          </span>
                        </div>
                      )}
                      {totalCosts > 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-chart-4"></div>
                            Total Costs
                          </span>
                          <span className="font-medium">{formatCompactCurrency(totalCosts)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 mt-2">
                        <div className="text-xs text-muted-foreground">
                          Total = Profit + Costs = {formatCompactCurrency(revenue)} Revenue
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}