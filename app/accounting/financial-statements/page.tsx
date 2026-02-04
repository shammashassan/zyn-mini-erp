// app/accounting/financial-statements/page.tsx - UPDATED: Uniform loading with Tax Report

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { toast } from "sonner";
import {
  TrendingUp,
  Calendar as CalendarIcon,
  Scale,
  Waves,
  Landmark,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear } from "date-fns";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProfitLossReport from "./ProfitLossReport";
import BalanceSheetReport from "./BalanceSheetReport";
import CashFlowReport from "./CashFlowReport";
import { useFinancialStatementsPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { ExportMenu } from "@/components/export-menu";
import {
  exportProfitLossToPDF, exportProfitLossToExcel,
  exportBalanceSheetToPDF, exportBalanceSheetToExcel,
  exportCashFlowToPDF, exportCashFlowToExcel,
  type CompanyDetails
} from "@/utils/reportExports";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";

export interface AccountData {
  accountCode: string;
  accountName: string;
  subGroup: string;
  amount: number;
}

interface FinancialData {
  income: AccountData[];
  expenses: AccountData[];
}

interface CFData {
  operating: Record<string, number>;
  investing: Record<string, number>;
  financing: Record<string, number>;
  totals: {
    operatingCash: number;
    investingCash: number;
    financingCash: number;
    netCashChange: number;
  };
}

interface BSData {
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

// ✅ UPDATED: Skeleton matching Tax Report style
function FinancialReportSkeleton() {
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

      {/* Account Sections Skeleton */}
      {[...Array(3)].map((_, i) => (
        <Card key={`section-${i}`} className="mb-4">
          <div className="p-4 flex items-center justify-between border-b">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-7 w-28" />
          </div>
          <div className="p-4 space-y-4">
            {[...Array(3)].map((_, j) => (
              <div key={`item-${j}`} className="flex justify-between items-center">
                <div className="flex gap-3 items-center w-full max-w-md">
                  <Skeleton className="h-5 w-16 rounded bg-muted" />
                  <Skeleton className="h-4 w-full max-w-[200px]" />
                </div>
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Bottom Summary Card Skeleton */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <Skeleton className="h-14 w-14 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-7 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <Skeleton className="h-10 w-48" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function FinancialStatementsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center min-h-[400px]">
        <Spinner className="size-10" />
      </div>
    }>
      <FinancialStatementsPageContent />
    </Suspense>
  );
}

function FinancialStatementsPageContent() {
  const [activeReport, setActiveReport] = useState<"profit-loss" | "balance-sheet" | "cash-flow">("profit-loss");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date())
  });
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<FinancialData | null>(null);
  const [cashFlowData, setCashFlowData] = useState<CFData | null>(null);
  const [balanceSheetData, setBalanceSheetData] = useState<BSData | null>(null);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const {
    permissions: { canRead, canExport },
    session,
    isPending,
  } = useFinancialStatementsPermissions();

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

  const fetchFinancialData = useCallback(async (background = false) => {
    if (!canRead) return;
    if (!dateRange?.from || !dateRange?.to) return;

    try {
      if (!background) {
        setIsLoading(true);
      }

      const params = new URLSearchParams();
      params.append('startDate', dateRange.from.toISOString());
      params.append('endDate', dateRange.to.toISOString());

      const res = await fetch(`/api/financial-statements?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch financial data");
      const result = await res.json();
      setData(result);

      const cfRes = await fetch(`/api/financial-statements/cash-flow?${params.toString()}`);
      if (cfRes.ok) {
        const cfResult = await cfRes.json();
        setCashFlowData(cfResult);
      }

      const bsParams = new URLSearchParams();
      bsParams.append('asOfDate', dateRange.to.toISOString());
      const bsRes = await fetch(`/api/financial-statements/balance-sheet?${bsParams.toString()}`);
      if (bsRes.ok) {
        const bsResult = await bsRes.json();
        setBalanceSheetData(bsResult);
      }
    } catch (error) {
      console.error("Error fetching financial data:", error);
      if (!background) toast.error("Could not load financial statements");
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, [canRead, dateRange]);

  useEffect(() => {
    if (isMounted && canRead) {
      fetchFinancialData();
    } else if (isMounted && !canRead && !isPending) {
      toast.error("You don't have permission to view financial statements", {
        description: "Only managers and above can access this page",
      });
      setIsLoading(false);
    }
  }, [isMounted, canRead, isPending, dateRange, fetchFinancialData]);

  useEffect(() => {
    const onFocus = () => {
      if (isMounted && canRead) {
        fetchFinancialData(true);
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchFinancialData, isMounted, canRead]);

  const handleQuickSelect = (period: string) => {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (period) {
      case 'thisMonth':
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case 'lastMonth':
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        break;
      case 'thisQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        from = new Date(now.getFullYear(), quarter * 3, 1);
        to = endOfMonth(new Date(now.getFullYear(), quarter * 3 + 2, 1));
        break;
      case 'thisYear':
        from = startOfYear(now);
        to = endOfMonth(now);
        break;
      default:
        return;
    }
    setDateRange({ from, to });
  };

  const totalIncome = useMemo(() =>
    data?.income.reduce((sum, item) => sum + item.amount, 0) || 0,
    [data]
  );

  const totalExpenses = useMemo(() =>
    data?.expenses.reduce((sum, item) => sum + item.amount, 0) || 0,
    [data]
  );

  const netProfit = totalIncome - totalExpenses;

  const handleExportPDF = () => {
    if (!dateRange?.from || !dateRange?.to) return;
    setIsExporting(true);
    try {
      let url = "";
      if (activeReport === "profit-loss" && data) {
        url = exportProfitLossToPDF(
          data.income,
          data.expenses,
          { income: totalIncome, expenses: totalExpenses, netProfit },
          { from: dateRange.from, to: dateRange.to },
          companyDetails,
          'blob'
        );
      } else if (activeReport === "balance-sheet" && balanceSheetData) {
        url = exportBalanceSheetToPDF(balanceSheetData, dateRange.to, companyDetails, 'blob');
      } else if (activeReport === "cash-flow" && cashFlowData) {
        url = exportCashFlowToPDF(cashFlowData, { from: dateRange.from, to: dateRange.to }, companyDetails, 'blob');
      } else {
        toast.info("Data not ready or export not available.");
        setIsExporting(false);
        return;
      }

      setPdfUrl(url);
      setIsPdfViewerOpen(true);
    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    if (!dateRange?.from || !dateRange?.to) return;
    setIsExporting(true);
    try {
      if (activeReport === "profit-loss" && data) {
        exportProfitLossToExcel(
          data.income,
          data.expenses,
          { from: dateRange.from, to: dateRange.to },
          companyDetails
        );
      } else if (activeReport === "balance-sheet" && balanceSheetData) {
        exportBalanceSheetToExcel(balanceSheetData, dateRange.to, companyDetails);
      } else if (activeReport === "cash-flow" && cashFlowData) {
        exportCashFlowToExcel(cashFlowData, { from: dateRange.from, to: dateRange.to }, companyDetails);
      } else {
        toast.info("Data not ready or export not available.");
        setIsExporting(false);
        return;
      }
      toast.success("Excel exported successfully");
    } catch (e) {
      console.error(e);
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  if (!isMounted || isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!session) {
    redirect("/company/select");
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
                <div className="p-3 bg-primary/10 rounded-full">
                  <Landmark className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Financial Statements</h1>
                  <p className="text-sm sm:text-base text-muted-foreground">Comprehensive financial reports</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal text-xs sm:text-sm", !dateRange && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">
                        {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}` : format(dateRange.from, "LLL dd, y")) : "Pick a date range"}
                      </span>
                      <span className="sm:hidden">
                        {dateRange?.from ? (dateRange.to ? `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}` : format(dateRange.from, "MMM dd")) : "Date"}
                      </span>
                    </Button>
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
                  <SelectTrigger className="w-[100px] sm:w-[140px] text-xs sm:text-sm"><SelectValue placeholder="Quick" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                    <SelectItem value="lastMonth">Last Month</SelectItem>
                    <SelectItem value="thisQuarter">This Quarter</SelectItem>
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
              <Tabs value={activeReport} onValueChange={(value) => setActiveReport(value as any)}>
                <div className="flex justify-center mb-6">
                  <TabsList className="flex justify-center w-full max-w-2xl grid-cols-3">
                    <TabsTrigger value="profit-loss" className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="hidden sm:inline">Profit & Loss</span>
                    </TabsTrigger>
                    <TabsTrigger value="balance-sheet" className="flex items-center gap-2">
                      <Scale className="h-4 w-4" />
                      <span className="hidden sm:inline">Balance Sheet</span>
                    </TabsTrigger>
                    <TabsTrigger value="cash-flow" className="flex items-center gap-2">
                      <Waves className="h-4 w-4" />
                      <span className="hidden sm:inline">Cash Flow</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="profit-loss">
                  {/* ✅ UPDATED: Matching Tax Report transition */}
                  <div className={cn("transition-opacity duration-200", isLoading && !data ? "opacity-50" : "opacity-100")}>
                    {isLoading && !data ? (
                      <FinancialReportSkeleton />
                    ) : (
                      <ProfitLossReport
                        data={data || { income: [], expenses: [] }}
                        totalIncome={totalIncome}
                        totalExpenses={totalExpenses}
                        netProfit={netProfit}
                        dateRange={dateRange}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="balance-sheet">
                  <div className={cn("transition-opacity duration-200", isLoading && !balanceSheetData ? "opacity-50" : "opacity-100")}>
                    {isLoading && !balanceSheetData ? (
                      <FinancialReportSkeleton />
                    ) : (
                      <BalanceSheetReport
                        balanceSheetData={balanceSheetData}
                        dateRange={dateRange}
                      />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="cash-flow">
                  <div className={cn("transition-opacity duration-200", isLoading && !cashFlowData ? "opacity-50" : "opacity-100")}>
                    {isLoading && !cashFlowData ? (
                      <FinancialReportSkeleton />
                    ) : (
                      <CashFlowReport
                        cashFlowData={cashFlowData}
                        dateRange={dateRange}
                      />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
      <PDFViewerModal
        isOpen={isPdfViewerOpen}
        onClose={() => setIsPdfViewerOpen(false)}
        pdfUrl={pdfUrl}
        title={`${activeReport === 'profit-loss' ? 'Profit & Loss' : activeReport === 'balance-sheet' ? 'Balance Sheet' : 'Cash Flow'} - ${dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : ''}`}
      />
    </>
  );
}