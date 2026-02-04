// app/reports/payments-report/page.tsx - UPDATED: Added Suspense, Silent Fetch & Skeleton

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { Wallet, CalendarIcon } from "lucide-react";
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
import { PaymentsChart } from "./payments-chart";
import { StatsCards, type StatItem } from "@/components/stats-cards";
import { getMonthlyColumns, type MonthlyReportData, type PaymentTransactionData } from "./columns";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { formatCompactCurrency } from "@/utils/formatters/currency";
import { useReportPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";

interface PaymentsSummary {
  totalCashIn: number;
  totalCashOut: number;
  netCashMovement: number;
  openingBalance: number;
  closingBalance: number;
  totalTransactions: number;
  receiptCount: number;
  paymentCount: number;
}

interface ApiResponse {
  summary: PaymentsSummary;
  transactions: PaymentTransactionData[];
  monthlyBreakdown: MonthlyReportData[];
}

// ✅ ADDED: Payments Report Skeleton Component
function PaymentsReportSkeleton() {
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
export default function PaymentsReportPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center min-h-[400px]">
        <Spinner className="size-10" />
      </div>
    }>
      <PaymentsReportPageContent />
    </Suspense>
  );
}

/**
 * The main page component content
 */
function PaymentsReportPageContent() {
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

      const response = await fetch(`/api/payments-report?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch payments data");
      }

      const apiData: ApiResponse = await response.json();
      setData(apiData);
    } catch (error) {
      if (!background) toast.error(error instanceof Error ? error.message : "Failed to load payments data");
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
      toast.error("You don't have permission to view payments reports", {
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

  const columns = useMemo(() => getMonthlyColumns(), []);

  const { table } = useDataTable({
    data: data?.monthlyBreakdown || [],
    columns: columns,
    initialState: {
      sorting: [],
      pagination: {
        pageSize: 10,
        pageIndex: 0
      },
    },
    getRowId: (row) => row.month,
  });

  const cardsData: StatItem[] = useMemo(() => {
    if (!data) return [];

    const { summary } = data;

    return [
      {
        name: "Total Inflow",
        stat: formatCompactCurrency(summary.totalCashIn),
        change: `${summary.receiptCount} txns`,
        changeType: "positive",
        subtext: "Total Cash Received"
      },
      {
        name: "Total Outflow",
        stat: formatCompactCurrency(summary.totalCashOut),
        change: `${summary.paymentCount} txns`,
        changeType: "negative",
        subtext: "Total Cash Paid"
      },
      {
        name: "Net Cash Flow",
        stat: formatCompactCurrency(Math.abs(summary.netCashMovement)),
        change: summary.netCashMovement >= 0 ? "Positive" : "Negative",
        changeType: summary.netCashMovement >= 0 ? "positive" : "negative",
        subtext: "Period movement"
      },
      {
        name: "Closing Balance",
        stat: formatCompactCurrency(summary.closingBalance),
        changeType: "neutral",
        subtext: "Cash on Hand"
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
    redirect('/login');
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
              <Wallet className="h-12 w-12 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Payments Report</h1>
                <p className="text-muted-foreground">
                  Monthly summary of cash inflows and outflows.
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
                <PaymentsReportSkeleton />
              ) : (
                <>
                  {/* Summary Cards */}
                  <div className="mb-6">
                    <StatsCards data={cardsData} columns={4} />
                  </div>

                  {/* Chart */}
                  <div className="mb-6">
                    {dateRange?.from && dateRange?.to && data?.monthlyBreakdown && data.monthlyBreakdown.length > 0 && (
                      <PaymentsChart
                        data={data.monthlyBreakdown}
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
                <CardTitle>Monthly Breakdown</CardTitle>
                <CardDescription>
                  Summary of cash movements by month for {formatDateRange()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* ✅ UPDATED: Applied transition-opacity for smooth updates */}
                <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                  {isLoading && !data ? (
                    <DataTableSkeleton
                      columnCount={columns.length}
                      rowCount={6}
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