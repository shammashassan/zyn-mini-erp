"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"
import { formatMonthDay } from "@/utils/formatters/date"

export const description = "Sales & Expenses trend over time"

const chartConfig = {
  financial: {
    label: "Financial Data",
  },
  sales: {
    label: "Sales",
    color: "var(--chart-1)",
  },
  expenses: {
    label: "Expenses", 
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

interface ChartAreaInteractiveProps {
  chartData?: Array<{ date: string; sales: number; expenses: number }>;
}

export function ChartAreaInteractive({ chartData = [] }: ChartAreaInteractiveProps) {
  const isMobile = useIsMobile()
  // Default to 30d instead of 90d for better performance, but 7d on mobile
  const [timeRange, setTimeRange] = React.useState(() => isMobile ? "7d" : "90d")

  React.useEffect(() => {
    if (isMobile && timeRange !== "7d") {
      setTimeRange("7d")
    }
  }, [isMobile, timeRange])

  // Memoize filtered data for performance
  const filteredData = React.useMemo(() => {
    if (chartData.length === 0) return []
    
    const sortedData = [...chartData].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const referenceDate = new Date(sortedData[sortedData.length - 1]?.date || new Date())
    
    let daysToSubtract = 30 // Default to 30 instead of 90
    if (timeRange === "90d") {
      daysToSubtract = 90
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    
    return sortedData.filter(item => {
      const date = new Date(item.date)
      return date >= startDate
    })
  }, [chartData, timeRange])

  // Calculate Y-axis domain to prevent negative values - memoized for performance
  const yAxisDomain = React.useMemo(() => {
    if (filteredData.length === 0) return [0, 100]
    
    const maxSales = Math.max(...filteredData.map(d => d.sales || 0))
    const maxExpenses = Math.max(...filteredData.map(d => d.expenses || 0))
    const maxValue = Math.max(maxSales, maxExpenses)
    
    return [0, Math.ceil(maxValue * 1.1)]
  }, [filteredData])

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Sales & Expenses Trend</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Financial performance over time
          </span>
          <span className="@[540px]/card:hidden">Financial trend</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-4 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillSales" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-sales)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-sales)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-expenses)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-expenses)"
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
                const date = new Date(value)
                return formatMonthDay(date)
              }}
            />
            
            <ChartTooltip
              cursor={false}
              defaultIndex={isMobile ? -1 : 10}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return formatMonthDay(value)
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="expenses"
              type="monotone"
              fill="url(#fillExpenses)"
              stroke="var(--color-expenses)"
            />
            <Area
              dataKey="sales"
              type="monotone"
              fill="url(#fillSales)"
              stroke="var(--color-sales)"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}