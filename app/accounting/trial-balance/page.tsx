// app/accounting/trial-balance/page.tsx - UPDATED: Uniform loading with Tax Report

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useDataTable } from "@/hooks/use-data-table";
import { StatsCards, type StatItem } from "@/components/stats-cards";
import { Scale, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatCompactCurrency } from "@/utils/formatters/currency";
import { columns, type TrialBalanceItem } from "./columns";
import { useTrialBalancePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { ExportMenu } from "@/components/export-menu";
import { exportTrialBalanceToPDF, exportTrialBalanceToExcel, type CompanyDetails } from "@/utils/reportExports";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";

interface TrialBalanceSummary {
  totalDebits: number;
  totalCredits: number;
  difference: number;
  isBalanced: boolean;
  accountsCount: number;
}

// ✅ UPDATED: Skeleton matching Tax Report style
function TrialBalanceSkeleton() {
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
    </div>
  );
}

export default function TrialBalancePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center min-h-[400px]">
        <Spinner className="size-10" />
      </div>
    }>
      <TrialBalancePageContent />
    </Suspense>
  );
}

function TrialBalancePageContent() {
  const [trialBalance, setTrialBalance] = useState<TrialBalanceItem[]>([]);
  const [summary, setSummary] = useState<TrialBalanceSummary | null>(null);
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [isMounted, setIsMounted] = useState(false);

  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [isPdfViewerOpen, setIsPdfViewerOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const {
    permissions: { canRead, canExport },
    session,
    isPending,
  } = useTrialBalancePermissions();

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

  const fetchTrialBalance = useCallback(async (background = false) => {
    if (!canRead) return;

    try {
      if (!background) {
        setIsLoading(true);
      }

      const params = new URLSearchParams();
      if (asOfDate) {
        params.append('asOfDate', asOfDate.toISOString());
      }

      const res = await fetch(`/api/trial-balance?${params.toString()}`);

      if (res.status === 403) {
        if (!background) toast.error("You don't have permission to view trial balance");
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch trial balance");

      const data = await res.json();
      setTrialBalance(data.accounts);
      setSummary(data.summary);
    } catch (error) {
      console.error("Error fetching trial balance:", error);
      if (!background) toast.error("Could not load trial balance");
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, [canRead, asOfDate]);

  useEffect(() => {
    if (isMounted && canRead) {
      fetchTrialBalance();
    } else if (isMounted && !canRead && !isPending) {
      toast.error("You don't have permission to view trial balance", {
        description: "Only managers and above can access this page",
      });
      setIsLoading(false);
    }
  }, [isMounted, canRead, isPending, asOfDate, fetchTrialBalance]);

  useEffect(() => {
    const onFocus = () => {
      if (isMounted && canRead) {
        fetchTrialBalance(true);
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchTrialBalance, isMounted, canRead]);

  const handleExportPDF = () => {
    if (!trialBalance.length) return;
    setIsExporting(true);
    try {
      const url = exportTrialBalanceToPDF(trialBalance, summary, asOfDate, companyDetails, 'blob');
      setPdfUrl(url);
      setIsPdfViewerOpen(true);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    if (!trialBalance.length) return;
    setIsExporting(true);
    try {
      exportTrialBalanceToExcel(trialBalance, asOfDate, companyDetails);
      toast.success("Exported to Excel");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export Excel");
    } finally {
      setIsExporting(false);
    }
  };

  const summaryCards: StatItem[] = useMemo(() => {
    if (!summary) return [];

    return [
      {
        name: "Total Debits",
        stat: formatCompactCurrency(summary.totalDebits),
        changeType: "neutral",
        subtext: `${summary.accountsCount} Active Accounts`,
      },
      {
        name: "Total Credits",
        stat: formatCompactCurrency(summary.totalCredits),
        changeType: "neutral",
        subtext: `As of ${format(asOfDate, "MMM dd")}`,
      },
      {
        name: "Difference",
        stat: formatCompactCurrency(Math.abs(summary.difference)),
        change: summary.isBalanced ? "Balanced" : "Unbalanced",
        changeType: summary.isBalanced ? "positive" : "negative",
        subtext: summary.isBalanced ? "Books are in balance" : "Review needed",
      },
      {
        name: "Active Accounts",
        stat: summary.accountsCount.toString(),
        changeType: "neutral",
        subtext: "With recorded transactions",
      },
    ];
  }, [summary, asOfDate]);

  const columnsWithOptions = useMemo(() => {
    const groupOptions = [
      { label: "Assets", value: "Assets", count: trialBalance.filter(item => item.groupName === "Assets").length },
      { label: "Liabilities", value: "Liabilities", count: trialBalance.filter(item => item.groupName === "Liabilities").length },
      { label: "Equity", value: "Equity", count: trialBalance.filter(item => item.groupName === "Equity").length },
      { label: "Income", value: "Income", count: trialBalance.filter(item => item.groupName === "Income").length },
      { label: "Expenses", value: "Expenses", count: trialBalance.filter(item => item.groupName === "Expenses").length },
    ].filter(opt => opt.count > 0);

    return columns.map((col: any) => {
      if (col.accessorKey === "groupName") {
        return { ...col, meta: { ...col.meta, options: groupOptions } };
      }
      return col;
    });
  }, [trialBalance]);

  const { table } = useDataTable({
    data: trialBalance,
    columns: columnsWithOptions,
    initialState: {
      sorting: [{ id: "accountCode", desc: false }],
      pagination: {
        pageSize: 20,
        pageIndex: 0
      },
    },
    getRowId: (row) => row.accountCode,
  });

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
    <>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 px-4 lg:px-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Scale className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Trial Balance</h1>
                  <p className="text-muted-foreground">
                    Validation report ensuring accounting integrity
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !asOfDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {asOfDate ? format(asOfDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={asOfDate}
                      onSelect={(date) => date && setAsOfDate(date)}
                      initialFocus
                      captionLayout="dropdown"
                    />
                  </PopoverContent>
                </Popover>

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
              <div className={cn("transition-opacity duration-200", isLoading && !summary ? "opacity-50" : "opacity-100")}>
                {isLoading && !summary ? (
                  <TrialBalanceSkeleton />
                ) : (
                  <StatsCards data={summaryCards} columns={4} />
                )}
              </div>
            </div>

            <div className="px-4 lg:px-6">
              {/* ✅ UPDATED: Smooth table transition */}
              <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                {trialBalance.length === 0 && !isLoading ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Scale className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
                      <p className="text-muted-foreground text-center max-w-md">
                        No journal entries exist for the selected date. Post some transactions to see the trial balance.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardHeader>
                      <CardTitle>Trial Balance as of {format(asOfDate, "PPP")}</CardTitle>
                      <CardDescription>
                        Showing {trialBalance.length} accounts with non-zero balances
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                        {isLoading && !trialBalance.length ? (
                          <DataTableSkeleton columnCount={columns.length} rowCount={20} />
                        ) : (
                          <DataTable table={table}>
                            <DataTableToolbar table={table} />
                          </DataTable>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <PDFViewerModal
        isOpen={isPdfViewerOpen}
        onClose={() => setIsPdfViewerOpen(false)}
        pdfUrl={pdfUrl}
        title={`Trial Balance - ${format(asOfDate, 'yyyy-MM-dd')}`}
      />
    </>
  );
}