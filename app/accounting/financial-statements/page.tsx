// app/accounting/financial-statements/page.tsx - UPDATED: Added FinancialReportSkeleton

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

// ✅ ADDED: Financial Report Skeleton Component
function FinancialReportSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 py-4">
            <CardContent className="p-0 space-y-2">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" /> {/* Label */}
                <Skeleton className="h-5 w-12 rounded-full" /> {/* Badge */}
              </div>
              <Skeleton className="h-8 w-32" /> {/* Value */}
              <Skeleton className="h-3 w-40" /> {/* Subtext */}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Account Sections Skeleton */}
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="mb-4">
          <div className="p-4 flex items-center justify-between border-b">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-lg" /> {/* Icon */}
              <div className="space-y-1">
                <Skeleton className="h-5 w-32" /> {/* Title */}
                <Skeleton className="h-3 w-20" /> {/* Subtitle */}
              </div>
            </div>
            <Skeleton className="h-6 w-24" /> {/* Total */}
          </div>
          <div className="p-4 space-y-4">
            {[...Array(3)].map((_, j) => (
              <div key={j} className="flex justify-between items-center">
                <div className="flex gap-2 items-center">
                  <Skeleton className="h-5 w-16 rounded" /> {/* Code */}
                  <Skeleton className="h-4 w-48" /> {/* Name */}
                </div>
                <Skeleton className="h-4 w-24" /> {/* Amount */}
              </div>
            ))}
          </div>
        </Card>
      ))}

      {/* Bottom Summary Card Skeleton */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <Skeleton className="h-12 w-12 rounded-lg" /> {/* Icon */}
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-32" /> {/* Net Profit/Loss */}
                <Skeleton className="h-4 w-48" /> {/* Date Range */}
              </div>
            </div>
            <Skeleton className="h-10 w-40" /> {/* Total Amount */}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ✅ Wrapper component to provide Suspense boundary
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

/**
 * The main page component content
 */
function FinancialStatementsPageContent() {
  const [activeReport, setActiveReport] = useState<"profit-loss" | "balance-sheet" | "cash-flow">("profit-loss");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date())
  });
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<FinancialData>({
    income: [],
    expenses: [],
  });
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

  // ✅ UPDATED: Added 'background' param for silent refreshes
  const fetchFinancialData = useCallback(async (background = false) => {
    if (!canRead) return;
    if (!dateRange?.from || !dateRange?.to) return;

    try {
      // Only show spinner/skeleton if not a background fetch
      if (!background) {
        setIsLoading(true);
      }
      
      const params = new URLSearchParams();
      params.append('startDate', dateRange.from.toISOString());
      params.append('endDate', dateRange.to.toISOString());

      // 1. Fetch Profit & Loss Data
      const res = await fetch(`/api/financial-statements?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch financial data");
      const result = await res.json();
      setData(result);

      // 2. Fetch Cash Flow Data
      const cfRes = await fetch(`/api/financial-statements/cash-flow?${params.toString()}`);
      if (cfRes.ok) {
        const cfResult = await cfRes.json();
        setCashFlowData(cfResult);
      }

      // 3. Fetch Balance Sheet Data
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

  // ✅ UPDATED: Standard fetch on mount/date change
  // Removed 'session' dependency to prevent double-fetch on focus
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

  // ✅ NEW: Window Focus Listener - SILENT MODE
  // Triggers silent background fetch when returning to the tab
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
    data.income.reduce((sum, item) => sum + item.amount, 0),
    [data.income]
  );

  const totalExpenses = useMemo(() =>
    data.expenses.reduce((sum, item) => sum + item.amount, 0),
    [data.expenses]
  );

  const netProfit = totalIncome - totalExpenses;

  const handleExportPDF = () => {
    if (!dateRange?.from || !dateRange?.to) return;
    setIsExporting(true);
    try {
      let url = "";
      if (activeReport === "profit-loss") {
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
      if (activeReport === "profit-loss") {
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
                  {/* ✅ UPDATED: Use FinancialReportSkeleton */}
                  {isLoading ? (
                    <FinancialReportSkeleton />
                  ) : (
                    <ProfitLossReport
                      data={data}
                      totalIncome={totalIncome}
                      totalExpenses={totalExpenses}
                      netProfit={netProfit}
                      dateRange={dateRange}
                    />
                  )}
                </TabsContent>

                <TabsContent value="balance-sheet">
                  {/* ✅ UPDATED: Use FinancialReportSkeleton */}
                  {isLoading ? (
                    <FinancialReportSkeleton />
                  ) : (
                    <BalanceSheetReport
                      balanceSheetData={balanceSheetData}
                      dateRange={dateRange}
                    />
                  )}
                </TabsContent>

                <TabsContent value="cash-flow">
                  {/* ✅ UPDATED: Use FinancialReportSkeleton */}
                  {isLoading ? (
                    <FinancialReportSkeleton />
                  ) : (
                    <CashFlowReport
                      cashFlowData={cashFlowData}
                      dateRange={dateRange}
                    />
                  )}
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