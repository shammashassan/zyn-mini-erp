"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { TrendingUp, TrendingDown } from "lucide-react";
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
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCompactCurrency, formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate, formatMonthDay, formatMonth, formatMonthKey } from "@/utils/formatters/date";

interface PurchaseChartProps {
  data: Array<{
    date: string;
    purchases: number;
    orders: number;
    avgOrderValue: number;
  }>;
  totalPurchases: number;
  totalOrders: number;
  dateRange: { from: Date; to: Date };
}

const chartConfig = {
  purchases: {
    label: "Purchases",
    color: "var(--chart-1)",
  },
  orders: {
    label: "Orders",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function PurchaseChart({ data, totalPurchases, totalOrders, dateRange }: PurchaseChartProps) {
  const [viewType, setViewType] = React.useState<"purchases" | "orders">("purchases");

  // Calculate trend based on entire data set
  const calculateTrend = () => {
    if (data.length < 2) return { direction: "neutral", percentage: 0 };

    const midpoint = Math.floor(data.length / 2);
    const firstHalf = data.slice(0, midpoint);
    const secondHalf = data.slice(midpoint);

    const firstHalfAvg = firstHalf.reduce((sum, item) =>
      sum + (viewType === "purchases" ? item.purchases : item.orders), 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) =>
      sum + (viewType === "purchases" ? item.purchases : item.orders), 0) / secondHalf.length;

    if (firstHalfAvg === 0) return { direction: "neutral", percentage: 0 };

    const percentage = ((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100;
    const direction = percentage > 0 ? "up" : percentage < 0 ? "down" : "neutral";

    return { direction, percentage: Math.abs(percentage) };
  };

  const trend = calculateTrend();
  const currentMetric = viewType === "purchases" ? totalPurchases : totalOrders;

  const formatDateRange = () => {
    return `${formatMonthKey(dateRange.from)} - ${formatMonthKey(dateRange.to)}`;
  };

  return (
    <Card className="@container/chart">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Purchase Performance</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/chart:block">
              {formatDateRange()} • {viewType === "purchases" ? "Purchase amount" : "Number of orders"} trend over time
            </span>
            <span className="@[540px]/chart:hidden">
              {formatMonth(dateRange.from)} - {formatMonthKey(dateRange.to)}
            </span>
          </CardDescription>
        </div>
        <div className="flex gap-2">
          <ToggleGroup
            type="single"
            value={viewType}
            onValueChange={(value) => value && setViewType(value as "purchases" | "orders")}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/chart:flex"
          >
            <ToggleGroupItem value="purchases">Purchases</ToggleGroupItem>
            <ToggleGroupItem value="orders">Orders</ToggleGroupItem>
          </ToggleGroup>

          <Select
            value={viewType}
            onValueChange={(value) => setViewType(value as "purchases" | "orders")}
          >
            <SelectTrigger
              className="flex w-32 @[767px]/chart:hidden"
              size="sm"
              aria-label="Select chart view"
            >
              <SelectValue placeholder="Purchases" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="purchases" className="rounded-lg">Purchases</SelectItem>
              <SelectItem value="orders" className="rounded-lg">Orders</SelectItem>
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
              className="aspect-auto h-[250px] w-full"
            >
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="fillPurchases" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-purchases)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-purchases)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                  <linearGradient id="fillOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor="var(--color-orders)"
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor="var(--color-orders)"
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={32}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return formatMonthDay(date);
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => formatMonthDay(value)}
                      indicator="dot"
                    />
                  }
                />
                <Area
                  dataKey={viewType}
                  type="monotone"
                  fill={viewType === "purchases" ? "url(#fillPurchases)" : "url(#fillOrders)"}
                  stroke={viewType === "purchases" ? "var(--color-purchases)" : "var(--color-orders)"}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </AreaChart>
            </ChartContainer>
          </div>

          {/* Metrics Section */}
          <div className="w-full @[800px]/chart:w-72 flex-shrink-0">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Performance Metrics</h4>

                {/* Current Metric */}
                <div className="flex items-center justify-between p-1 rounded-lg bg-muted/50 mb-1">
                  <div className="flex items-center gap-2">
                    {trend.direction === "up" ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : trend.direction === "down" ? (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    ) : (
                      <div className="h-4 w-4" />
                    )}
                    <span className="font-medium text-sm">
                      {viewType === "purchases" ? "Total Purchases" : "Total Orders"}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm">
                      {viewType === "purchases" ? formatCompactCurrency(currentMetric) : currentMetric.toLocaleString()}
                    </div>
                    {trend.direction !== "neutral" && (
                      <div className={`text-xs ${trend.direction === "up" ? "text-green-600" : "text-red-600"}`}>
                        {trend.direction === "up" ? "↗" : "↘"} {trend.percentage.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>

                {/* Average Order Value */}
                <div className="flex items-center justify-between p-1 rounded-lg bg-muted/50 mb-1">
                  <span className="font-medium text-sm">Avg Order Value</span>
                  <span className="font-bold text-sm">
                    {formatCurrency(totalOrders > 0 ? totalPurchases / totalOrders : 0)}
                  </span>
                </div>
              </div>

              {/* Chart Insights */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Period Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-chart-1"></div>
                      Purchase Amount
                    </span>
                    <span className="font-medium">{formatCompactCurrency(totalPurchases)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-chart-2"></div>
                      Total Orders
                    </span>
                    <span className="font-medium">{totalOrders.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="text-xs text-muted-foreground">
                      Showing data for selected period
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