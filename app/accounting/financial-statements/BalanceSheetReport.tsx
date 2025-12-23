// BalanceSheetReport.tsx - Fixed responsive summary card

import React from "react";
import { 
  Building2, 
  Scale, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Waves 
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCompactCurrency } from "@/utils/formatters/currency";
import { DateRange } from "react-day-picker";
import { AccountData } from "./page";
import { StatsCards, StatItem } from "@/components/stats-cards";

interface AccountSectionProps {
  title: string;
  items: AccountData[] | Record<string, number>;
  total: number;
  color?: "green" | "red" | "blue" | "purple" | "orange" | "cyan";
}

interface BalanceSheetData {
  assets: {
    currentAssets: Record<string, number>;
    fixedAssets: Record<string, number>;
  };
  liabilities: {
    currentLiabilities: Record<string, number>;
    longTermLiabilities: Record<string, number>;
  };
  equity: Record<string, number>;
  totals: {
    totalCurrentAssets: number;
    totalFixedAssets: number;
    totalAssets: number;
    totalCurrentLiabilities: number;
    totalLongTermLiabilities: number;
    totalLiabilities: number;
    totalEquity: number;
    totalLiabilitiesEquity: number;
    difference: number;
    isBalanced: boolean;
  };
}

interface BalanceSheetReportProps {
  balanceSheetData: BalanceSheetData | null;
  dateRange?: DateRange;
}

const groupBySubGroup = (items: AccountData[]) => {
  const grouped: Record<string, AccountData[]> = {};
  items.forEach(item => {
    if (!grouped[item.subGroup]) {
      grouped[item.subGroup] = [];
    }
    grouped[item.subGroup].push(item);
  });
  return grouped;
};

const AccountSection = ({
  title,
  items,
  total,
  color = "blue"
}: AccountSectionProps) => {
  const isArray = Array.isArray(items);
  const grouped = isArray ? groupBySubGroup(items) : null;
  
  // Check if there are any items to display
  const hasItems = isArray ? items.length > 0 : Object.keys(items).length > 0;

  const colorClasses = {
    green: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400",
    red: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400",
    cyan: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950/30 dark:text-cyan-400"
  };

  const textColorClasses = {
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
    purple: "text-purple-600",
    orange: "text-orange-600",
    cyan: "text-cyan-600"
  };

  const iconMap = {
    green: TrendingUp,
    red: TrendingDown,
    blue: Building2,
    purple: Scale,
    orange: DollarSign,
    cyan: Waves
  };

  const Icon = iconMap[color];

  return (
    <div className="mb-4 rounded-lg border bg-card">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", colorClasses[color])}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base sm:text-lg">{title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isArray ? `${items.length} accounts` : `${Object.keys(items).length} items`}
            </p>
          </div>
        </div>
        <div className={cn("text-lg sm:text-xl font-bold", textColorClasses[color])}>
          {formatCurrency(total)}
        </div>
      </div>

      {hasItems && (
        <div className="border-t">
          {isArray && grouped ? (
          Object.entries(grouped).map(([subGroup, accounts]) => {
            const subTotal = accounts.reduce((sum, acc) => sum + acc.amount, 0);

            return (
              <div key={subGroup} className="p-4 border-b last:border-b-0">
                <div className="font-medium text-sm text-muted-foreground mb-3 flex items-center justify-between">
                  <span>{subGroup}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(subTotal)}</span>
                </div>
                <div className="space-y-2 ml-2 sm:ml-4">
                  {accounts.map((account) => (
                    <div key={account.accountCode} className="flex items-center justify-between text-xs sm:text-sm py-1.5 gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="font-mono text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded whitespace-nowrap">
                          {account.accountCode}
                        </span>
                        <span className="truncate">{account.accountName}</span>
                      </div>
                      <span className="font-medium whitespace-nowrap">{formatCurrency(account.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4">
            <div className="space-y-2">
              {Object.entries(items as Record<string, number>).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-xs sm:text-sm py-1.5">
                  <span>{key}</span>
                  <span className={cn("font-medium", value < 0 ? "text-red-600" : "")}>{formatCurrency(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
};

export default function BalanceSheetReport({
  balanceSheetData,
  dateRange
}: BalanceSheetReportProps) {
  if (!balanceSheetData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No balance sheet data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { assets, liabilities, equity, totals } = balanceSheetData;

  const statsData: StatItem[] = [
    {
      name: "Total Assets",
      stat: formatCompactCurrency(totals.totalAssets),
      changeType: "positive",
      subtext: "Owned resources"
    },
    {
      name: "Total Liabilities",
      stat: formatCompactCurrency(totals.totalLiabilities),
      changeType: "negative",
      subtext: "Obligations"
    },
    {
      name: "Total Equity",
      stat: formatCompactCurrency(totals.totalEquity),
      changeType: "positive",
      subtext: "Ownership interest"
    },
    {
      name: "Balance Check",
      stat: totals.isBalanced ? "Balanced" : "Unbalanced",
      change: !totals.isBalanced && totals.difference !== 0 ? formatCompactCurrency(totals.difference) : undefined,
      changeType: totals.isBalanced ? "positive" : "negative",
      subtext: totals.isBalanced ? "Assets = Liability + Equity" : "Review needed"
    }
  ];

  return (
    <div className="space-y-6">
      <StatsCards data={statsData} columns={4} />

      <AccountSection
        title="Current Assets"
        items={assets.currentAssets}
        total={totals.totalCurrentAssets}
        color="blue"
      />

      <AccountSection
        title="Fixed Assets"
        items={assets.fixedAssets}
        total={totals.totalFixedAssets}
        color="cyan"
      />

      <AccountSection
        title="Current Liabilities"
        items={liabilities.currentLiabilities}
        total={totals.totalCurrentLiabilities}
        color="red"
      />

      <AccountSection
        title="Long-term Liabilities"
        items={liabilities.longTermLiabilities}
        total={totals.totalLongTermLiabilities}
        color="orange"
      />

      <AccountSection
        title="Equity"
        items={equity}
        total={totals.totalEquity}
        color="purple"
      />

      {/* Fixed Responsive Summary Card */}
      <Card className={cn("border-2", totals.isBalanced ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20" : "border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20")}>
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left side - Icon and title */}
            <div className="flex items-center gap-3">
              <div className={cn("p-3 rounded-lg shrink-0", totals.isBalanced ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" : "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400")}>
                <Building2 className="h-6 w-6 sm:h-7 sm:w-7" />
              </div>
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <h3 className="text-lg sm:text-xl font-semibold">Net Assets</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  As of {dateRange?.to && format(dateRange.to, "MMM dd, yyyy")}
                </p>
              </div>
            </div>
            
            {/* Right side - Amount (centered on mobile, right-aligned on desktop) */}
            <div className={cn(
              "text-3xl sm:text-4xl font-bold text-center sm:text-right",
              totals.isBalanced ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"
            )}>
              {formatCurrency(totals.totalAssets)}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}