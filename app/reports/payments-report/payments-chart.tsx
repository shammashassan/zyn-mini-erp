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
import { formatCompactCurrency } from "@/utils/formatters/currency";
import { formatMonthKey, formatDisplayDate, formatMonth } from "@/utils/formatters/date";

interface MonthlyBreakdown {
  month: string;
  totalInflow: number;
  totalOutflow: number;
  netMovement: number;
  inflowCount: number;
  outflowCount: number;
}

interface PaymentsChartProps {
  data: MonthlyBreakdown[];
  dateRange: { from: Date; to: Date };
}

const chartConfig = {
  inflow: {
    label: "Cash Inflow",
    color: "var(--chart-1)",
  },
  outflow: {
    label: "Cash Outflow",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function PaymentsChart({ data, dateRange }: PaymentsChartProps) {
  const chartData = React.useMemo(() => {
    return data.map(item => ({
      month: item.month.slice(0, 3),
      inflow: item.totalInflow,
      outflow: item.totalOutflow,
      netMovement: item.netMovement,
      inflowCount: item.inflowCount,
      outflowCount: item.outflowCount,
    }));
  }, [data]);

  const totals = React.useMemo(() => {
    const totalInflow = data.reduce((sum, item) => sum + item.totalInflow, 0);
    const totalOutflow = data.reduce((sum, item) => sum + item.totalOutflow, 0);
    const netMovement = totalInflow - totalOutflow;
    
    return {
      totalInflow,
      totalOutflow,
      netMovement,
    };
  }, [data]);

  const formatDateRange = () => {
    return `${formatMonthKey(dateRange.from)} - ${formatMonthKey(dateRange.to)}`;
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Payment Analysis</CardTitle>
          <CardDescription>No payment data available for the selected period</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px]">
          <p className="text-muted-foreground">Select a date range to view payment analysis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Cash Flow Analysis</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            {formatDateRange()} • Inflows vs Outflows
          </span>
          <span className="@[540px]/card:hidden">
            {formatMonth(dateRange.from)} - {formatMonthKey(dateRange.to)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-col @[800px]/card:flex-row gap-6">
          <div className="flex-1">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[300px]"
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
                  dataKey="inflow"
                  stackId="a"
                  fill="var(--color-inflow)"
                  radius={4}
                />
                <Bar
                  dataKey="outflow"
                  stackId="b"
                  fill="var(--color-outflow)"
                  radius={4}
                />
              </BarChart>
            </ChartContainer>
          </div>

          <div className="w-full @[800px]/card:w-72 flex-shrink-0">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Payment Summary</h4>
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-sm">Total Inflow</span>
                  </div>
                  <span className="font-bold text-sm text-green-600">
                    {formatCompactCurrency(totals.totalInflow)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-600" />
                    <span className="font-medium text-sm">Total Outflow</span>
                  </div>
                  <span className="font-bold text-sm text-red-600">
                    {formatCompactCurrency(totals.totalOutflow)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-medium text-sm">Net Movement</span>
                  <span className={`font-bold text-sm ${totals.netMovement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCompactCurrency(Math.abs(totals.netMovement))}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Breakdown</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-chart-1"></div>
                      Cash Inflow
                    </span>
                    <span className="font-medium">{formatCompactCurrency(totals.totalInflow)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-chart-2"></div>
                      Cash Outflow
                    </span>
                    <span className="font-medium">{formatCompactCurrency(totals.totalOutflow)}</span>
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