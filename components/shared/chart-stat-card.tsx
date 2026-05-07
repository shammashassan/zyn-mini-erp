"use client"

import { Area, AreaChart } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardAction,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart"

export type ChartDataPoint = {
    month: string
    value: number
}

export type ChartStatCardData = {
    title: string
    description: string
    badge: string
    actionLabel?: string
    onAction?: () => void
    chartData: ChartDataPoint[]
    chartColor?: string
}

function SingleChartStatCard({ card }: { card: ChartStatCardData }) {
    const color = card.chartColor ?? "var(--chart-1)"

    const chartConfig = {
        value: {
            label: card.title,
            color,
        },
    } satisfies ChartConfig

    return (
        <Card className="@container/card overflow-hidden pb-0">
            <CardHeader>
                <CardTitle>{card.title}</CardTitle>
                <CardDescription>
                    {card.description} <Badge>{card.badge}</Badge>
                </CardDescription>
                {card.actionLabel && (
                    <CardAction>
                        <Button variant="outline" size="sm" onClick={card.onAction}>
                            {card.actionLabel}
                        </Button>
                    </CardAction>
                )}
            </CardHeader>
            <div className="mt-auto">
                <ChartContainer config={chartConfig} className="h-[56px] w-full">
                    <AreaChart
                        accessibilityLayer
                        data={card.chartData}
                        margin={{ left: 0, right: 0, top: 4, bottom: 0 }}
                    >
                        <ChartTooltip
                            cursor={false}
                            content={<ChartTooltipContent indicator="line" hideLabel />}
                            defaultIndex={2}
                        />
                        <Area
                            dataKey="value"
                            type="linear"
                            fill={color}
                            fillOpacity={0.4}
                            stroke={color}
                        />
                    </AreaChart>
                </ChartContainer>
            </div>
        </Card>
    )
}

export function ChartStatCards({ cards }: { cards: ChartStatCardData[] }) {
    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
            {cards.map((card, idx) => (
                <SingleChartStatCard key={idx} card={card} />
            ))}
        </div>
    )
}