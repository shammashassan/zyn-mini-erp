// app/accounting/profit-loss/page.tsx - UPDATED: Uniform loading with Tax Report

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { TrendingUp, CalendarIcon, Calculator } from "lucide-react";
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
import { ProfitLossChart } from "./profit-loss-chart";
import { StatsCards, type StatItem } from "@/components/stats-cards";
import { getColumns, type ProfitLossData } from "./columns";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { formatCurrency, formatCompactCurrency } from "@/utils/formatters/currency";
import { useProfitLossPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { ExportMenu } from "@/components/export-menu";
import { exportProfitLossToPDF, exportProfitLossToExcel, type CompanyDetails } from "@/utils/reportExports";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";

interface ProfitLossSummary {
  totalRevenueExTax: number;
  totalExpenses: number;
  totalPurchasesExTax: number;
  totalCosts: number;
  salesTax: number;
  purchaseTax: number;
  netTax: number;
  profit: number;
  profitMargin: number;
  totalOrders: number;
  totalOrderAmount: number;
}

interface MonthlyBreakdown {
  period: string;
  orders: number;
  purchases: number;
  orderAmount: number;
  purchaseAmount: number;
  revenue: number;
  expenses: number;
  expenseCount: number;
  salesTax: number;
  purchaseTax: number;
  profit: number;
}

interface Trends {
  revenue: number;
  costs: number;
  profit: number;
  netTax: number;
}

interface ApiResponse {
  summary: ProfitLossSummary;
  monthlyBreakdown: MonthlyBreakdown[];
  trends?: Trends;
  incomeDetails?: any[]; 
  expenseDetails?: any[];
}

// ✅ UPDATED: Skeleton matching Tax Report style
function ProfitLossSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={`stat-${i}`} className="p-6 py-4">
            <CardContent className="p-0 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart Card Skeleton */}
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

export default function ProfitLossPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center min-h-[400px]">
        <Spinner className="size-10" />
      </div>
    }>
      <ProfitLossPageContent />
    </Suspense>
  );
}

function ProfitLossPageContent() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [detailedData, setDetailedData] = useState<any>(null);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date())
  });
   
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const {
    permissions: { canRead, canExport },
    session,
    isPending,
  } = useProfitLossPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      if (!canRead) return;
      try {
        const res = await fetch("/api/company-details");
        if (res.ok) {
          const data = await res.json();
          setCompanyDetails(data);
        }
      } catch (error) {
        console.error("Failed to fetch company details:", error);
      }
    };

    if (canRead) {
      fetchCompanyDetails();
    }
  }, [canRead]);

  const fetchData = useCallback(async (background = false) => {
    if (!canRead) return;
    
    if (!dateRange?.from || !dateRange?.to) {
      return;
    }

    if (!background) {
      setIsLoading(true);
    }

    try {
      const params = new URLSearchParams({
        startDate: dateRange.from.toISOString(),
        endDate: dateRange.to.toISOString()
      });

      const response = await fetch(`/api/profit-loss?${params}`);
      const detailsRes = await fetch(`/api/financial-statements?${params}`);

      if (!response.ok) {
        throw new Error("Failed to fetch profit & loss data");
      }

      const apiData: ApiResponse = await response.json();
      const details = detailsRes.ok ? await detailsRes.json() : { income: [], expenses: [] };
      
      setData(apiData);
      setDetailedData(details);
    } catch (error) {
      if (!background) toast.error(error instanceof Error ? error.message : "Failed to load data");
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, [dateRange, canRead]);

  useEffect(() => {
    if (isMounted && canRead) {
      fetchData();
    } else if (isMounted && !canRead && !isPending) {
      toast.error("You don't have permission to view profit & loss", {
        description: "Only managers and above can access this page",
      });
      setIsLoading(false);
    }
  }, [isMounted, canRead, isPending, dateRange, fetchData]);

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
   
  const handleExportPDF = () => {
    if (!detailedData || !data || !dateRange?.from || !dateRange?.to) return;
    setIsExporting(true);
    try {
      const totals = { 
        income: data.summary.totalRevenueExTax, 
        expenses: data.summary.totalExpenses, 
        netProfit: data.summary.profit 
      };
      
      const url = exportProfitLossToPDF(
        detailedData.income, 
        detailedData.expenses, 
        totals, 
        { from: dateRange.from, to: dateRange.to }, 
        companyDetails,
        'blob'
      );
      setPdfUrl(url);
      setIsPdfViewerOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
     if (!detailedData || !dateRange?.from || !dateRange?.to) return;
     setIsExporting(true);
     try {
       exportProfitLossToExcel(
         detailedData.income, 
         detailedData.expenses, 
         { from: dateRange.from, to: dateRange.to },
         companyDetails
       );
       toast.success("Excel exported");
     } catch (e) {
       console.error(e);
       toast.error("Failed to export Excel");
     } finally {
       setIsExporting(false);
     }
  };

  const formatDateRange = () => {
    if (!dateRange?.from || !dateRange?.to) return "Select date range";
    return `${format(dateRange.from, "MMM dd, yyyy")} - ${format(dateRange.to, "MMM dd, yyyy")}`;
  };

  const columns = useMemo(() => getColumns(), []);

  const { table } = useDataTable({
    data: data?.monthlyBreakdown || [],
    columns,
    initialState: {
      sorting: [{ id: "period", desc: true }],
      pagination: {
        pageSize: 10,
        pageIndex: 0
      },
    },
    getRowId: (row) => row.period,
  });

  const cardsData: StatItem[] = useMemo(() => {
    if (!data) return [];

    const { summary, trends } = data;

    const formatTrend = (value: number | undefined) => {
      if (value === undefined) return "0%";
      const sign = value > 0 ? "+" : "";
      return `${sign}${value.toFixed(1)}%`;
    };
    
    return [
      {
        name: "Total Revenue",
        stat: formatCompactCurrency(summary.totalRevenueExTax),
        change: formatTrend(trends?.revenue),
        changeType: (trends?.revenue || 0) >= 0 ? "positive" : "negative",
        subtext: "Income from sales"
      },
      {
        name: "Total Costs",
        stat: formatCompactCurrency(summary.totalCosts),
        subtext: "Excluding VAT",
        change: formatTrend(trends?.costs),
        changeType: (trends?.costs || 0) <= 0 ? "positive" : "negative"
      },
      {
        name: "Net Profit",
        stat: formatCompactCurrency(summary.profit),
        change: formatTrend(trends?.profit),
        subtext: "Profit Margin",
        changeType: (trends?.profit || 0) >= 0 ? "positive" : "negative"
      },
      {
        name: "Tax Summary",
        stat: formatCompactCurrency(Math.abs(summary.netTax)),
        change: formatTrend(trends?.netTax),
        subtext: summary.netTax >= 0 ? "Payable (Due)" : "Recoverable",
        changeType: (trends?.netTax || 0) <= 0 ? "positive" : "negative"
      }
    ];
  }, [data]);

  if (!isMounted || isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10"/>
      </div>
    );
  }

  if (!canRead) {
    return <AccessDenied />
  }

  return (
    <>
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 px-4 lg:px-6 gap-4">
            <div className="flex items-center gap-3">
              <Calculator className="h-12 w-12 text-primary" />
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Profit & Loss</h1>
                <p className="text-muted-foreground">
                  Analyze your business performance and profitability.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <UIButton
                    variant="outline"
                    className="w-full sm:w-[300px] justify-between px-3 font-normal"
                  >
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
               
              <ExportMenu 
                 onExportPDF={handleExportPDF}
                 onExportExcel={handleExportExcel}
                 canExport={canExport ?? false}
                 isExporting={isExporting}
              />
            </div>
          </div>

          <div className="px-4 lg:px-6">
            {/* ✅ UPDATED: Matching Tax Report transition */}
            <div className={cn("transition-opacity duration-200", isLoading && !data ? "opacity-50" : "opacity-100")}>
              {isLoading && !data ? (
                <ProfitLossSkeleton />
              ) : (
                <>
                  {/* Stats Cards */}
                  <div className="mb-6">
                    <StatsCards data={cardsData} columns={4} />
                  </div>

                  {/* Chart */}
                  <div className="mb-6">
                    {dateRange?.from && dateRange?.to && data && (
                      <ProfitLossChart
                        profit={data.summary.profit}
                        expenses={data.summary.totalExpenses}
                        purchases={data.summary.totalPurchasesExTax}
                        netTax={data.summary.netTax}
                        dateRange={{ from: dateRange.from, to: dateRange.to }}
                      />
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="px-4 lg:px-6">
            <Card>
              <CardHeader>
                <CardTitle>Profit & Loss Report for {formatDateRange()}</CardTitle>
                <CardDescription>
                  Monthly breakdown of financial performance (calculated from Journal entries)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* ✅ UPDATED: Table transition like Tax Report */}
                <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                  {isLoading && !data ? (
                    <DataTableSkeleton columnCount={columns.length} rowCount={10} />
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
    <PDFViewerModal 
       isOpen={isPdfViewerOpen}
       onClose={() => setIsPdfViewerOpen(false)}
       pdfUrl={pdfUrl}
       title={`Profit & Loss - ${dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}`}
    />
    </>
  );
}