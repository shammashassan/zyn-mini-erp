import { TrendingDown, TrendingUp, MinusIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
    Card,
    CardAction,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";

export type MiniCardData = {
    label: string;
    value: string | number;
    change?: string | number;
    trend?: "up" | "down" | "neutral";
    note?: string;
    subtext?: string;
};

export function MiniStatsCards({ cards }: { cards: MiniCardData[] }) {
    return (
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @4xl/main:grid-cols-3 @7xl/main:grid-cols-6">
            {cards.map((card, idx) => {
                const Icon = card.trend === "up" ? TrendingUp : card.trend === "down" ? TrendingDown : MinusIcon;
                const badgeVariant = card.trend === "up" ? "success" : card.trend === "down" ? "destructive" : "secondary";

                return (
                    <Card key={idx} className="@container/card py-4">
                        <CardHeader className="px-4">
                            <CardDescription className="font-medium">{card.label}</CardDescription>
                            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                                {card.value}
                            </CardTitle>
                            {card.change && (
                                <CardAction>
                                    <Badge variant={badgeVariant} appearance="outline">
                                        <Icon className="size-3" />
                                        {card.change}
                                    </Badge>
                                </CardAction>
                            )}
                        </CardHeader>
                        {(card.note || card.subtext) && (
                            <CardFooter className="flex-col items-start gap-1.5 px-4 text-sm">
                                {card.note && (
                                    <div className="line-clamp-1 flex gap-2 font-medium">
                                        {card.note} <Icon className="size-4" />
                                    </div>
                                )}
                                {card.subtext && <div className="text-muted-foreground">{card.subtext}</div>}
                            </CardFooter>
                        )}
                    </Card>
                );
            })}
        </div>
    );
}