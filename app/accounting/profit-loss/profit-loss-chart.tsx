// app/profit-loss/profit-loss-chart.tsx - UPDATED: Shows profit instead of revenue in pie chart

"use client";

import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Label, Pie, PieChart } from "recharts";
import {
  Card,
  CardAction,
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
import { useIsMobile } from "@/hooks/use-mobile";
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
    color: "var(--chart-4)",
  },
  expenses: {
    label: "Expenses", 
    color: "var(--chart-5)",
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
    color: "var(--chart-5)",
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
  const isMobile = useIsMobile();
  const [chartView, setChartView] = React.useState("breakdown");
  
  const totalCosts = expenses + purchases + netTax;
  const revenue = profit + totalCosts; // Calculate revenue from profit + costs
  
  // Breakdown view: Show profit and cost components
  const breakdownData = [
    { category: "profit", amount: Math.abs(profit), fill: profit >= 0 ? "var(--color-profit)" : "var(--color-netTax)" },
    { category: "expenses", amount: expenses, fill: "var(--color-expenses)" },
    { category: "purchases", amount: purchases, fill: "var(--color-purchases)" },
    ...(netTax !== 0 ? [{ category: "netTax", amount: Math.abs(netTax), fill: "var(--color-netTax)" }] : []),
  ].filter(item => item.amount > 0);

  // Summary view: Profit vs Total Costs
  const summaryData = [
    { category: "profit", amount: Math.abs(profit), fill: profit >= 0 ? "var(--color-profit)" : "var(--color-netTax)" },
    { category: "costs", amount: totalCosts, fill: "var(--color-costs)" },
  ].filter(item => item.amount > 0);

  const chartData = chartView === "breakdown" ? breakdownData : summaryData;

  const totalAmount = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.amount, 0);
  }, [chartData]);

  const profitMargin = revenue > 0 ? ((profit / revenue) * 100) : 0;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {formatMonthDay(dateRange.from)} - {formatDisplayDate(dateRange.to)} • Calculated from Journal entries
          </span>
          <span className="@[540px]/card:hidden">
            {formatMonth(dateRange.from)} - {formatMonthKey(dateRange.to)}
          </span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={chartView}
            onValueChange={setChartView}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="breakdown">Breakdown</ToggleGroupItem>
            <ToggleGroupItem value="summary">Summary</ToggleGroupItem>
          </ToggleGroup>
          <Select value={chartView} onValueChange={setChartView}>
            <SelectTrigger
              className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
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
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-col @[800px]/card:flex-row gap-6">
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

          {/* Performance Metrics */}
          <div className="w-full @[800px]/card:w-72 flex-shrink-0">
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
                  <span className={`font-bold text-sm ${profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatCompactCurrency(Math.abs(profit))}
                  </span>
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

              {/* Financial Breakdown */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {chartView === "breakdown" ? "Financial Breakdown" : "Summary View"}
                </h4>
                <div className="space-y-2">
                  {chartView === "breakdown" ? (
                    <>
                      {profit !== 0 && (
                        <div className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${profit >= 0 ? "bg-chart-4" : "bg-chart-5"}`}></div>
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
                            <div className="w-3 h-3 rounded-full bg-chart-5"></div>
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
                            <div className={`w-3 h-3 rounded-full ${profit >= 0 ? "bg-chart-4" : "bg-chart-3"}`}></div>
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
                            <div className="w-3 h-3 rounded-full bg-chart-5"></div>
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