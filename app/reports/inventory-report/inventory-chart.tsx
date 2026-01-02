// app/inventory/inventory-chart.tsx - UPDATED: Responsive Y-Axis for Mobile

"use client";

import * as React from "react";
import { Package, TrendingUp } from "lucide-react";
import { Bar, BarChart, XAxis, YAxis } from "recharts";
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
import { formatCompactCurrency, formatCurrency } from "@/utils/formatters/currency";
import { formatMonth, formatMonthKey } from "@/utils/formatters/date";

interface InventoryItemData {
  id: string;
  name: string;
  type: 'Material' | 'Product';
  category: string;
  closingQty: number;
  stockValue: number;
  status: string;
}

interface InventoryChartProps {
  data: InventoryItemData[];
  dateRange: { from: Date; to: Date };
}

const chartConfig = {
  stockValue: {
    label: "Stock Value",
  },
} satisfies ChartConfig;

// Color palette for different materials
const materialColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

export function InventoryChart({ data, dateRange }: InventoryChartProps) {
  // Responsive check for mobile view
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    // Initial check
    checkMobile();
    
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Filter only materials and get top 5 by stock value for the chart
  const topMaterials = React.useMemo(() => {
    return [...data]
      .filter(item => item.type === 'Material')
      .sort((a, b) => b.stockValue - a.stockValue)
      .slice(0, 5);
  }, [data]);

  // Get top 3 for the summary list
  const top3Materials = React.useMemo(() => {
    return topMaterials.slice(0, 3);
  }, [topMaterials]);

  const chartData = React.useMemo(() => {
    // Truncate labels more aggressively on mobile
    const charLimit = isMobile ? 12 : 20;
    
    return topMaterials.map((item, index) => ({
      material: item.name.length > charLimit ? item.name.slice(0, charLimit) + '...' : item.name,
      fullName: item.name,
      stockValue: item.stockValue,
      quantity: item.closingQty,
      fill: materialColors[index % materialColors.length]
    }));
  }, [topMaterials, isMobile]);

  const totals = React.useMemo(() => {
    const materials = data.filter(item => item.type === 'Material');
    const totalValue = materials.reduce((sum, item) => sum + item.stockValue, 0);
    const totalQty = materials.reduce((sum, item) => sum + item.closingQty, 0);
    const avgValue = materials.length > 0 ? totalValue / materials.length : 0;
    
    return {
      totalValue,
      totalQty,
      avgValue,
      itemCount: materials.length
    };
  }, [data]);

  const formatDateRange = () => {
    return `${formatMonthKey(dateRange.from)} - ${formatMonthKey(dateRange.to)}`;
  };

  return (
    <Card className="@container/chart">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>Inventory Analysis</CardTitle>
          <CardDescription>
            <span className="hidden @[540px]/chart:block">
              {formatDateRange()} • Top materials by stock value
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
              <BarChart
                accessibilityLayer
                data={chartData}
                layout="vertical"
                margin={{
                  left: 0,
                }}
              >
                <YAxis
                  dataKey="material"
                  type="category"
                  tickLine={false}
                  tickMargin={isMobile ? 5 : 10}
                  axisLine={false}
                  width={isMobile ? 90 : 150} // Responsive width
                  fontSize={isMobile ? 12 : 14}
                />
                <XAxis dataKey="stockValue" type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="dot" hideLabel />}
                />
                <Bar dataKey="stockValue" layout="vertical" radius={5} />
              </BarChart>
            </ChartContainer>
          </div>

          {/* Metrics Section */}
          <div className="w-full @[800px]/chart:w-72 flex-shrink-0">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Performance Metrics</h4>
                
                {/* Total Value */}
                <div className="flex items-center justify-between p-1 rounded-lg bg-muted/50 mb-1">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Total Value</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-blue-600">
                      {formatCompactCurrency(totals.totalValue)}
                    </div>
                  </div>
                </div>

                {/* Materials Count */}
                <div className="flex items-center justify-between p-1 rounded-lg bg-muted/50 mb-1">
                  <span className="font-medium text-sm">Total Materials</span>
                  <span className="font-bold text-sm">
                    {totals.itemCount}
                  </span>
                </div>

                {/* Average Value */}
                <div className="flex items-center justify-between p-1 rounded-lg bg-muted/50 mb-1">
                  <span className="font-medium text-sm">Avg Value</span>
                  <span className="font-bold text-sm">
                    {formatCompactCurrency(totals.avgValue)}
                  </span>
                </div>
              </div>

              {/* Top Materials */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground">Period Summary</h4>
                <div className="space-y-2">
                  {top3Materials.map((item, index) => (
                    <div key={item.id} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2 flex-1 min-w-0">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: materialColors[index % materialColors.length] }}
                        ></div>
                        <span className="truncate">{item.name}</span>
                      </span>
                      <div className="text-right ml-2">
                        <span className="font-medium">{formatCompactCurrency(item.stockValue)}</span>
                      </div>
                    </div>
                  ))}
                  {topMaterials.length > 3 && (
                    <div className="border-t pt-2 mt-2">
                      <div className="text-xs text-muted-foreground">
                        +{topMaterials.length - 3} more materials
                      </div>
                    </div>
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