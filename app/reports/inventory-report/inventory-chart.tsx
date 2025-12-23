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
    return topMaterials.map((item, index) => ({
      material: item.name.length > 20 ? item.name.slice(0, 20) + '...' : item.name,
      fullName: item.name,
      stockValue: item.stockValue,
      quantity: item.closingQty,
      fill: materialColors[index % materialColors.length]
    }));
  }, [topMaterials]);

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

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Top Materials by Stock Value</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Top 5 materials with highest inventory value
          </span>
          <span className="@[540px]/card:hidden">
            Top 5 materials
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <div className="flex flex-col @[800px]/card:flex-row gap-6">
          {/* Chart Section */}
          <div className="flex-1">
            <ChartContainer
              config={chartConfig}
              className="mx-auto aspect-square max-h-[300px] w-full"
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
                  tickMargin={10}
                  axisLine={false}
                  width={150}
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

          {/* Summary Section - Compact */}
          <div className="w-full @[800px]/card:w-64 flex-shrink-0">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Summary</h4>
                
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 mb-2">
                  <div className="flex items-center gap-2">
                    <Package className="h-3.5 w-3.5 text-blue-600" />
                    <span className="font-medium text-xs">Materials</span>
                  </div>
                  <span className="font-bold text-xs">
                    {totals.itemCount}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 mb-2">
                  <span className="font-medium text-xs">Total Value</span>
                  <span className="font-bold text-xs text-blue-600">
                    {formatCompactCurrency(totals.totalValue)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50">
                  <span className="font-medium text-xs">Avg Value</span>
                  <span className="font-bold text-xs">
                    {formatCompactCurrency(totals.avgValue)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground">Top 3</h4>
                <div className="space-y-1.5">
                  {top3Materials.map((item, index) => (
                    <div key={item.id} className="flex justify-between items-center text-xs">
                      <span className="flex items-center gap-1.5 flex-1 min-w-0">
                        <div 
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: materialColors[index % materialColors.length] }}
                        ></div>
                        <span className="truncate">{item.name}</span>
                      </span>
                      <div className="text-right ml-2">
                        <span className="font-medium">{formatCompactCurrency(item.stockValue)}</span>
                        <div className="text-[10px] text-muted-foreground">{item.closingQty} units</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}