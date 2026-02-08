// app/reports/expense-report/page.tsx - UPDATED: Fixed TypeScript null checks

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { PieChart, CalendarIcon } from "lucide-react";
import { Button as UIButton } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useDataTable } from "@/hooks/use-data-table";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { ExpenseChart } from "./expense-chart";
import { StatsCards, type StatItem } from "@/components/stats-cards";
import { getExpenseColumns, type ExpenseReportData } from "./columns";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { formatCompactCurrency } from "@/utils/formatters/currency";
import { useReportPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect, usePathname } from "next/navigation";

interface CategoryData {
  category: string;
  amount: number;
  count: number;
}

interface MonthlyTrendData {
  month: string;
  amount: number;
}

interface ExpenseSummary {
  totalAmount: number;
  totalCount: number;
  averageExpense: number;
}

interface Trends {
  amount: number;
  count: number;
  average: number;
}

interface ApiResponse {
  summary: ExpenseSummary;
  categoryData: CategoryData[];
  monthlyBreakdown: ExpenseReportData[];
  monthlyTrend: MonthlyTrendData[];
  trends?: Trends;
}

// ✅ ADDED: Expense Report Skeleton Component
function ExpenseReportSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* 1. Stats Cards Skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={`stat-${i}`} className="p-6 py-4">
            <CardContent className="p-0 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" /> {/* Label */}
                <Skeleton className="h-5 w-14 rounded-full" /> {/* Badge */}
              </div>
              <Skeleton className="h-9 w-32" /> {/* Value */}
              <Skeleton className="h-3 w-20" /> {/* Subtext */}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2. Chart Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

// ✅ FIXED: Wrapper component to provide Suspense boundary
export default function ExpenseReportPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center min-h-[400px]">
        <Spinner className="size-10" />
      </div>
    }>
      <ExpenseReportPageContent />
    </Suspense>
  );
}

/**
 * The main page component content
 */
function ExpenseReportPageContent() {
  const pathname = usePathname();
  const [data, setData] = useState<ApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date())
  });

  const {
    permissions: { canRead },
    session,
    isPending,
  } = useReportPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ UPDATED: Added 'background' param for silent refreshes
  const fetchData = useCallback(async (background = false) => {
    if (!canRead) return;

    if (!dateRange?.from || !dateRange?.to) {
      return;
    }

    try {
      // Only show spinner/skeleton if not a background fetch
      if (!background) {
        setIsLoading(true);
      }

      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString()
      });

      const response = await fetch(`/api/expense-report?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch expense data");
      }

      const apiData: ApiResponse = await response.json();
      setData(apiData);
    } catch (error) {
      if (!background) toast.error(error instanceof Error ? error.message : "Failed to load expense data");
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, [dateRange, canRead]);

  // ✅ UPDATED: Standard fetch on mount/date change
  // Removed 'session' dependency to prevent double-fetch on focus
  useEffect(() => {
    if (isMounted && canRead) {
      fetchData();
    } else if (isMounted && !canRead && !isPending) {
      toast.error("You don't have permission to view expense reports", {
        description: "Only managers and above can access this page",
      });
      setIsLoading(false);
    }
  }, [isMounted, canRead, isPending, fetchData]);

  // ✅ NEW: Window Focus Listener - SILENT MODE
  // Triggers silent background fetch when returning to the tab
  useEffect(() => {
    const onFocus = () => {
      if (isMounted && canRead) {
        fetchData(true);
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchData, isMounted, canRead]);

  const handleQuickSelect = (period: string) => {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (period) {
      case "thisMonth":
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case "lastMonth":
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        break;
      case "last3Months":
        from = startOfMonth(subMonths(now, 2));
        to = endOfMonth(now);
        break;
      case "last6Months":
        from = startOfMonth(subMonths(now, 5));
        to = endOfMonth(now);
        break;
      case "thisYear":
        from = new Date(now.getFullYear(), 0, 1);
        to = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        return;
    }

    setDateRange({ from, to });
  };

  const formatDateRange = () => {
    if (!dateRange?.from || !dateRange?.to) return "Select date range";
    return `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
  };

  const columns = useMemo(() => getExpenseColumns(), []);

  const { table } = useDataTable({
    data: data?.monthlyBreakdown || [],
    columns,
    initialState: {
      sorting: [],
      pagination: {
        pageSize: 10,
        pageIndex: 0
      },
    },
    getRowId: (row) => row.period,
  });

  const cardsData: StatItem[] = useMemo(() => {
    if (!data || !data.summary || data.summary.totalCount === 0) return [];

    const { summary, trends } = data;

    // Helper to format percentage with sign
    const formatTrend = (value: number | undefined) => {
      if (value === undefined) return "0%";
      const sign = value > 0 ? "+" : "";
      return `${sign}${value.toFixed(1)}%`;
    };

    return [
      {
        name: "Total Expenses",
        stat: formatCompactCurrency(summary.totalAmount),
        change: formatTrend(trends?.amount),
        changeType: (trends?.amount || 0) <= 0 ? "positive" : "negative",
        subtext: "Compared to previous period"
      },
      {
        name: "Top Category",
        stat: data.categoryData[0] ? data.categoryData[0].category : "No data",
        change: data.categoryData[0] ? formatCompactCurrency(data.categoryData[0].amount) : "-",
        subtext: data.categoryData[0] ? `${data.categoryData[0].count} transactions` : "No expenses",
        changeType: "neutral"
      },
      {
        name: "Avg Transaction",
        stat: formatCompactCurrency(summary.averageExpense),
        change: formatTrend(trends?.average),
        changeType: (trends?.average || 0) <= 0 ? "positive" : "negative",
        subtext: "Average per expense"
      },
      {
        name: "Transaction Volume",
        stat: summary.totalCount.toString(),
        change: formatTrend(trends?.count),
        changeType: "neutral",
        subtext: "Total number of expenses"
      }
    ];
  }, [data]);

  if (!isMounted || isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!session) {
    redirect(`/login?callbackURL=${encodeURIComponent(pathname)}`);
  }

  if (!canRead) {
    return <AccessDenied />
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 px-4 lg:px-6 gap-4">
            <div className="flex items-center gap-3">
              <PieChart className="h-12 w-12 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Expense Report</h1>
                <p className="text-muted-foreground">
                  Track and analyze your business expenses from journal entries.
                </p>
              </div>
            </div>

            {/* Date controls */}
            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <UIButton variant="outline" className="w-full sm:w-[300px] justify-between px-3 font-normal">
                    <span className={cn("truncate", !dateRange && "text-muted-foreground")}>
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Pick a date range"
                      )}
                    </span>
                    <CalendarIcon size={16} aria-hidden="true" />
                  </UIButton>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    captionLayout="dropdown"
                  />
                </PopoverContent>
              </Popover>

              <Select onValueChange={handleQuickSelect}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Quick select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="last3Months">Last 3 Months</SelectItem>
                  <SelectItem value="last6Months">Last 6 Months</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="px-4 lg:px-6">
            {/* ✅ UPDATED: Applied transition-opacity & Skeleton */}
            <div className={cn("transition-opacity duration-200", isLoading && !data ? "opacity-50" : "opacity-100")}>
              {isLoading && !data ? (
                <ExpenseReportSkeleton />
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="mb-6">
                    <StatsCards data={cardsData} columns={4} />
                  </div>

                  {/* Chart */}
                  <div className="mb-6">
                    {/* ✅ FIXED: Optional chaining for categoryData check */}
                    {dateRange?.from && dateRange?.to && data?.categoryData && data.categoryData.length > 0 && (
                      <ExpenseChart
                        categoryData={data.categoryData}
                        // ✅ FIXED: Optional chaining for monthlyTrend
                        monthlyTrend={data.monthlyTrend || []}
                        totalAmount={data.summary?.totalAmount || 0}
                        dateRange={{ from: dateRange.from, to: dateRange.to }}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle>Expense Report for {formatDateRange()}</CardTitle>
                <CardDescription>
                  Monthly breakdown of expenses by category (calculated from Journal entries)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* ✅ UPDATED: Applied transition-opacity for smooth updates */}
                <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                  {isLoading && !data ? (
                    <DataTableSkeleton
                      columnCount={columns.length}
                      rowCount={10}
                    />
                  ) : (
                    <DataTable table={table}>
                      <DataTableToolbar table={table} />
                    </DataTable>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}