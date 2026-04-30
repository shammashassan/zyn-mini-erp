"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ChartContainer } from "@/components/ui/chart";
import { cn } from "@/lib/utils";
import { Area, AreaChart, XAxis } from "recharts";

export interface SummaryCardData {
  name: string;
  subtitle?: string;
  value: string;
  change?: string;
  percentageChange?: string;
  changeType: "positive" | "negative" | "neutral";
  chartData?: Array<{ date: string; value: number }>;
}

interface SummaryCardsProps {
  cards: SummaryCardData[];
  className?: string;
}

const sanitizeName = (name: string) => {
  return name
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-]/g, "_")
    .toLowerCase();
};

export function SummaryCards({ cards, className }: SummaryCardsProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  };

  const numCards = Math.min(cards.length, 3) as 1 | 2 | 3;

  return (
    <div className={cn("w-full", className)}>
      <dl className={cn("grid gap-6", gridCols[numCards])}>
        {cards.slice(0, 3).map((item) => {
          const sanitizedName = sanitizeName(item.name);
          const gradientId = `gradient-${sanitizedName}`;

          const color =
            item.changeType === "positive"
              ? "hsl(142.1 76.2% 36.3%)"
              : item.changeType === "negative"
              ? "hsl(0 72.2% 50.6%)"
              : "hsl(217.2 91.2% 59.8%)";

          return (
            <Card key={item.name} className="p-0">
              <CardContent className="p-4 pb-0">
                <div>
                  <dt className="text-sm font-medium text-foreground">
                    {item.name}
                    {item.subtitle && (
                      <span className="block font-normal text-xs text-muted-foreground mt-0.5">
                        {item.subtitle}
                      </span>
                    )}
                  </dt>
                  <div className="flex items-baseline justify-between mt-2">
                    <dd
                      className={cn(
                        item.changeType === "positive"
                          ? "text-green-600 dark:text-green-500"
                          : item.changeType === "negative"
                          ? "text-red-600 dark:text-red-500"
                          : "text-blue-600 dark:text-blue-500",
                        "text-lg sm:text-xl font-semibold"
                      )}
                    >
                      {item.value}
                    </dd>
                    {(item.change || item.percentageChange) && (
                      <dd className="flex items-center space-x-1 text-sm">
                        {item.change && (
                          <span className="font-medium text-foreground">
                            {item.change}
                          </span>
                        )}
                        {item.percentageChange && (
                          <span
                            className={cn(
                              item.changeType === "positive"
                                ? "text-green-600 dark:text-green-500"
                                : item.changeType === "negative"
                                ? "text-red-600 dark:text-red-500"
                                : "text-blue-600 dark:text-blue-500"
                            )}
                          >
                            ({item.percentageChange})
                          </span>
                        )}
                      </dd>
                    )}
                  </div>
                </div>

                {item.chartData && item.chartData.length > 0 && (
                  <div className="mt-2 h-16 overflow-hidden">
                    <ChartContainer
                      className="w-full h-full"
                      config={{
                        value: {
                          label: item.name,
                          color: color,
                        },
                      }}
                    >
                      <AreaChart data={item.chartData}>
                        <defs>
                          <linearGradient
                            id={gradientId}
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={color}
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor={color}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" hide={true} />
                        <Area
                          dataKey="value"
                          stroke={color}
                          fill={`url(#${gradientId})`}
                          fillOpacity={0.4}
                          strokeWidth={1.5}
                          type="monotone"
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </dl>
    </div>
  );
}