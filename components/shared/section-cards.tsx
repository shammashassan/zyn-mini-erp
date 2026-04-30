import { TrendingDown, TrendingUp, MinusIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Link from "next/link"

type TrendType = "up" | "down" | "neutral"

export type CardData = {
  label: string
  value: string
  trend: TrendType
  change: string
  note: string
  subtext: string
  href?: string
}

export function SectionCards({ cards }: { cards: CardData[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      {cards.map((card, idx) => {
        const cardContent = (
          <Card className={cn(
            "@container/card transition-all duration-200 from-primary/5 to-card dark:bg-card bg-linear-to-t shadow-xs",
            card.href && "hover:border-primary/30 hover:bg-primary/5 hover:shadow-md cursor-pointer"
          )}>
            <CardHeader>
              <CardDescription>{card.label}</CardDescription>
              <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {card.value}
              </CardTitle>
              <CardAction>
                <Badge
                  variant={card.trend === "up" ? "success" : card.trend === "down" ? "destructive" : "secondary"}
                  appearance="outline"
                >
                  {card.trend === "up" ? <TrendingUp /> : card.trend === "down" ? <TrendingDown /> : <MinusIcon />}
                  {card.change}
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="flex-col items-start gap-1.5 text-sm">
              <div className="line-clamp-1 flex gap-2 font-medium">
                {card.note}{" "}
                {card.trend === "up" ? (
                  <TrendingUp className="size-4" />
                ) : card.trend === "down" ? (
                  <TrendingDown className="size-4" />
                ) : (
                  <MinusIcon className="size-4" />
                )}
              </div>
              <div className="text-muted-foreground">{card.subtext}</div>
            </CardFooter>
          </Card>
        );

        if (card.href) {
          return (
            <Link
              key={idx}
              href={card.href}
              className={cn(
                "group block transition-transform duration-200 active:scale-[0.98]"
              )}
            >
              {cardContent}
            </Link>
          );
        }

        return (
          <div key={idx} className="group block">
            {cardContent}
          </div>
        );
      })}
    </div>
  )
}
