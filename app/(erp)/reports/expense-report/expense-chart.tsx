"use client";

import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Label, Pie, PieChart, Bar, BarChart, XAxis, CartesianGrid, LabelList } from "recharts";
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
import { cn } from "@/lib/utils";
import { formatCompactCurrency } from "@/utils/formatters/currency";
import { formatMonth, formatMonthKey } from "@/utils/formatters/date";

interface ExpenseChartProps {
  categoryData: {
    category: string;
    amount: number;
    count: number;
  }[];
  monthlyTrend: {
    month: string;
    amount: number;
  }[];
  totalAmount: number;
  dateRange: { from: Date; to: Date };
}

const chartConfig = {
  amount: {
    label: "Amount",
  },
} satisfies ChartConfig;

// Category colors
const categoryColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
  "var(--chart-10)",
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-7))",
  "hsl(var(--chart-8))",
  "hsl(var(--chart-9))",
  "hsl(var(--chart-10))"
];

export function ExpenseChart({ categoryData, monthlyTrend, totalAmount, dateRange }: ExpenseChartProps) {
  const [chartView, setChartView] = React.useState("category");
  
  // Prepare chart data with colors
  const pieChartData = categoryData.map((item, index) => ({
    ...item,
    fill: categoryColors[index % categoryColors.length],
  }));

  const barChartData = monthlyTrend.map((item) => ({
    ...item,
    fill: "var(--chart-1)",
  }));

  const totalExpenses = categoryData.reduce((sum, cat) => sum + cat.count, 0);

  // Calculate trend for monthly view
  const calculateTrend = () => {
    if (monthlyTrend.length < 2) return { direction: "neutral", percentage: 0 };

    const midpoint = Math.floor(monthlyTrend.length / 2);
    const firstHalf = monthlyTrend.slice(0, midpoint);
    const secondHalf = monthlyTrend.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.amount, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.amount, 0) / secondHalf.length;

    if (firstHalfAvg === 0) return { direction: "neutral", percentage: 0 };

    const percentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    const direction = percentage > 0 ? "up" : percentage < 0 ? "down" : "neutral";

    return { direction, percentage: Math.abs(percentage) };
  };

  const trend = calculateTrend();

  const formatDateRange = () => {
    return `${formatMonthKey(dateRange.from)} - ${formatMonthKey(dateRange.to)}`;
  };

  return (
    <Card className="@container/chart">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Expense Analysis</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/chart:block">
              {formatDateRange()} • Detailed expense breakdown and trends
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
            <ToggleGroupItem value="category">By Category</ToggleGroupItem>
            <ToggleGroupItem value="trend">Monthly Trend</ToggleGroupItem>
          </ToggleGroup>
          <Select value={chartView} onValueChange={setChartView}>
            <SelectTrigger
              className="flex w-32 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/chart:hidden"
              size="sm"
              aria-label="Select chart view"
            >
              <SelectValue placeholder="By Category" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="category" className="rounded-lg">
                By Category
              </SelectItem>
              <SelectItem value="trend" className="rounded-lg">
                Monthly Trend
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
              key={chartView}
              config={chartConfig}
              className={cn(
                "mx-auto",
                chartView === "category" ? "aspect-square max-h-[300px]" : "aspect-auto h-[250px] w-full"
              )}
            >
              {chartView === "category" ? (
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <Pie
                    data={pieChartData}
                    dataKey="amount"
                    nameKey="category"
                    innerRadius={70}
                    outerRadius={120}
                    strokeWidth={8}
                    isAnimationActive={true}
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
              ) : (
                <BarChart
                  accessibilityLayer
                  data={barChartData}
                  margin={{
                    top: 20,
                  }}
                >
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
                  <Bar 
                    dataKey="amount" 
                    fill="var(--chart-1)" 
                    radius={8}
                    isAnimationActive={true}
                  >
                    <LabelList
                      position="top"
                      offset={12}
                      className="fill-foreground"
                      fontSize={12}
                      formatter={(value: number) => formatCompactCurrency(value)}
                    />
                  </Bar>
                </BarChart>
              )}
            </ChartContainer>
          </div>

          {/* Metrics Section */}
          <div className="w-full @[800px]/chart:w-72 flex-shrink-0">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Performance Metrics</h4>
                
                {/* Total Expenses */}
                <div className="flex items-center justify-between p-1 rounded-lg bg-muted/50 mb-1">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-sm">Total Expenses</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-red-600">
                      {formatCompactCurrency(totalAmount)}
                    </div>
                    {chartView === "trend" && trend.direction !== "neutral" && (
                      <div className={`text-xs ${trend.direction === "up" ? "text-red-600" : "text-green-600"}`}>
                        {trend.direction === "up" ? "↗" : "↘"} {trend.percentage.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Average per Expense */}
                <div className="flex items-center justify-between p-1 rounded-lg bg-muted/50 mb-1">
                  <span className="font-medium text-sm">Average per Expense</span>
                  <span className="font-bold text-sm">
                    {formatCompactCurrency(totalExpenses > 0 ? totalAmount / totalExpenses : 0)}
                  </span>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">
                  {chartView === "category" ? "Period Summary" : "Period Summary"}
                </h4>
                <div className="space-y-2">
                  {chartView === "category" ? (
                    <>
                      {categoryData.slice(0, 4).map((category, index) => (
                        <div key={category.category} className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: categoryColors[index % categoryColors.length] }}
                            ></div>
                            <span className="truncate">{category.category}</span>
                          </span>
                          <div className="text-right">
                            <span className="font-medium">{formatCompactCurrency(category.amount)}</span>
                          </div>
                        </div>
                      ))}
                      {categoryData.length > 3 && (
                        <div className="border-t pt-2 mt-2">
                          <div className="text-xs text-muted-foreground">
                            +{categoryData.length - 3} more categories
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {monthlyTrend.slice(-3).map((month, index) => (
                        <div key={month.month} className="flex justify-between items-center text-sm">
                          <span className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-chart-1"></div>
                            {month.month}
                          </span>
                          <span className="font-medium">{formatCompactCurrency(month.amount)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <div className="text-xs text-muted-foreground">
                          Showing data for selected period
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