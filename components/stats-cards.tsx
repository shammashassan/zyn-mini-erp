"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export interface StatItem {
  name: string;
  stat: string;
  change?: string; // Keep this for small numbers, percentages, or status
  subtext?: string; // New field for descriptive text
  changeType: "positive" | "negative" | "neutral";
}

interface StatsCardsProps {
  data: StatItem[];
  columns?: 3 | 4;
}

export function StatsCards({ data, columns = 3 }: StatsCardsProps) {
  return (
    <div className="w-full">
      <dl className={cn(
        "grid grid-cols-1 gap-6 sm:grid-cols-2 w-full",
        columns === 3 ? "lg:grid-cols-3" : "xl:grid-cols-4"
      )}>
        {data.map((item) => (
          <Card key={item.name} className="p-6 py-4 w-full">
            <CardContent className="p-0">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-sm font-medium text-muted-foreground whitespace-pre-line">
                  {item.name}
                </dt>
                {item.change && (
                  <Badge
                    variant={
                      item.changeType === "positive" ? "success" :
                      item.changeType === "negative" ? "destructive" :
                      "neutral"
                    }
                    appearance="outline"
                  >
                    {item.changeType === "positive" && <TrendingUp className="w-3 h-3 mr-1" />}
                    {item.changeType === "negative" && <TrendingDown className="w-3 h-3 mr-1" />}
                    {item.changeType === "neutral"}
                    {item.change}
                  </Badge>
                )}
              </div>
              <dd className="text-3xl font-semibold text-foreground mt-2 truncate">
                {item.stat}
              </dd>
              {item.subtext && (
                <p className="text-xs text-muted-foreground mt-1">
                  {item.subtext}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </dl>
    </div>
  );
}