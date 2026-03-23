// app/dashboard/page.tsx - UPDATED: Smooth transitions like tax-report

"use client";

import * as React from "react";
import { useEffect, useState, useMemo, Suspense, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useDataTable } from "@/hooks/use-data-table";
import { ChartAreaInteractive } from "./dashboard-chart";
import { SectionCards, type CardData } from "@/components/section-cards";
import { getColumns, type RecentSale } from "./columns";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { formatCurrency, formatCompactCurrency } from "@/utils/formatters/currency";
import { useDashboardPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";
import Preloader from "@/components/preloader";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Banknote, ChevronRight, FileClock, FileText, ShoppingCart, Ticket, Truck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface DailySummary {
  date: string;
  sales: number;
  expenses: number;
}

interface TrendData {
  trend: "up" | "down";
  change: number;
}

interface DashboardData {
  summary: {
    currentRevenue: number;
    lastRevenue: number;
    currentCosts: number;
    lastCosts: number;
    currentProfit: number;
    lastProfit: number;
    currentOrders: number;
    lastOrders: number;
  };
  trends: {
    revenue: TrendData;
    costs: TrendData;
    profit: TrendData;
    orders: TrendData;
  };
  chartData: DailySummary[];
  recentSales: RecentSale[];
}

// ✅ ADDED: Dashboard Skeleton Component
function DashboardSkeleton({ isBasicUser }: { isBasicUser: boolean }) {
  return (
    <div className="space-y-6 animate-in fade-in-50 px-4 lg:px-6">
      {/* Metrics Cards Skeleton */}
      {!isBasicUser && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[120px] mb-2" />
                <Skeleton className="h-3 w-[160px]" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart Skeleton */}
      {!isBasicUser && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[200px] mb-2" />
            <Skeleton className="h-4 w-[300px]" />
          </CardHeader>
          <CardContent className="pl-2">
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Skeleton for Basic Users */}
      {isBasicUser && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[120px]" />
                  <Skeleton className="h-3 w-[180px]" />
                </div>
                <Skeleton className="h-5 w-5" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Invoices Table Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-[150px] mb-2" />
          <Skeleton className="h-4 w-[250px]" />
        </CardHeader>
        <CardContent>
          <DataTableSkeleton columnCount={5} rowCount={5} />
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardContent() {
  const pathname = usePathname();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");
  const [isMounted, setIsMounted] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const showWelcome = searchParams.get("welcome") === "true";

  const {
    permissions: { canRead },
    session,
    isPending,
  } = useDashboardPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ UPDATED: Added 'background' param for silent refreshes
  const fetchDashboardData = useCallback(async (background = false) => {
    if (!canRead) return;

    try {
      // Only show spinner if not a background fetch
      if (!background) {
        setIsLoading(true);
      }

      const response = await fetch("/api/dashboard");

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      if (!background) {
        toast.error("Could not load dashboard data.");
      }
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, [canRead]);

  // ✅ UPDATED: Standard fetch on mount
  useEffect(() => {
    if (isMounted && session && canRead) {
      fetchDashboardData();
    }
  }, [session, canRead, isMounted, fetchDashboardData]);

  // ✅ NEW: Window Focus Listener - SILENT MODE
  useEffect(() => {
    const onFocus = () => {
      if (isMounted && canRead) {
        fetchDashboardData(true);
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchDashboardData, isMounted, canRead]);

  // Redirect to login if not authenticated (after mount + auth check)
  useEffect(() => {
    if (isMounted && !isPending && !session) {
      router.push(`/login?callbackURL=${encodeURIComponent(pathname)}`);
    }
  }, [isMounted, isPending, session, router, pathname]);

  const handleViewPdf = (sale: RecentSale) => {
    if (!sale || !sale._id) {
      toast.error("Cannot view PDF. Document data is missing.");
      return;
    }

    setSelectedPdfUrl(`/api/invoices/${sale._id}/pdf`);
    setSelectedPdfTitle(sale.invoiceNumber || "Invoice");
    setIsModalOpen(true);
  };

  const columns = useMemo(() => getColumns(handleViewPdf), []);

  const columnsWithOptions = useMemo(() => {
    return columns;
  }, [columns]);

  const { table } = useDataTable({
    data: dashboardData?.recentSales || [],
    columns: columnsWithOptions,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      pagination: {
        pageSize: 10,
        pageIndex: 0
      },
    },
    getRowId: (row) => row._id,
  });

  const cards: CardData[] = useMemo(() => {
    if (!dashboardData) return [];

    const { summary, trends } = dashboardData;
    const profitMargin = summary.currentRevenue > 0
      ? ((summary.currentProfit / summary.currentRevenue) * 100).toFixed(1)
      : '0';

    return [
      {
        label: "Total Revenue",
        value: formatCompactCurrency(summary.currentRevenue),
        trend: trends.revenue.trend,
        change: `${trends.revenue.change >= 0 ? '+' : ''}${trends.revenue.change.toFixed(1)}%`,
        note: trends.revenue.trend === "up" ? "Revenue trending up" : "Revenue declining",
        subtext: `Revenue excluding VAT`,
      },
      {
        label: "Total Costs",
        value: formatCompactCurrency(summary.currentCosts),
        trend: trends.costs.trend,
        change: `${trends.costs.change >= 0 ? '+' : ''}${trends.costs.change.toFixed(1)}%`,
        note: trends.costs.trend === "up" ? "Costs increased" : "Costs reduced",
        subtext: "Including purchases & net taxes",
      },
      {
        label: "Net Profit",
        value: formatCompactCurrency(summary.currentProfit),
        trend: trends.profit.trend,
        change: `${trends.profit.change >= 0 ? '+' : ''}${trends.profit.change.toFixed(1)}%`,
        note: summary.currentProfit >= 0 ? "Profitable month" : "Loss this month",
        subtext: `Margin: ${profitMargin}%`,
      },
      {
        label: "Orders",
        value: summary.currentOrders.toString(),
        trend: trends.orders.trend,
        change: `${trends.orders.change >= 0 ? '+' : ''}${trends.orders.change.toFixed(1)}%`,
        note: "Approved invoices",
        subtext: summary.currentOrders > 0
          ? `Avg: ${formatCurrency(summary.currentRevenue / summary.currentOrders)} per order`
          : 'No orders yet',
      },
    ];
  }, [dashboardData]);

  if (!isMounted || isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  if (!canRead) {
    return <AccessDenied />;
  }

  // Check if user role is "user" for simplified dashboard
  const isBasicUser = session?.user?.role === "user";

  return (
    <>
      <div className="flex flex-1 flex-col">
        {showWelcome && (
          <Preloader
            mode="reveal"
            onComplete={() => {
              router.replace("/dashboard", { scroll: false });
            }}
          />
        )}

        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <h1 className="text-2xl font-bold tracking-tight">
                Welcome back, {session.user.name || session.user.email}!
              </h1>
              <p className="text-muted-foreground">
                {isBasicUser
                  ? "Access your recent invoices and quick actions."
                  : "Here's what's happening with your business today."}
              </p>
            </div>

            {/* ✅ UPDATED: Applied transition-opacity & Skeleton */}
            <div className={cn("transition-opacity duration-200", isLoading && !dashboardData ? "opacity-50" : "opacity-100")}>
              {isLoading && !dashboardData ? (
                <DashboardSkeleton isBasicUser={isBasicUser} />
              ) : (
                <>
                  {!isBasicUser && <SectionCards cards={cards} />}

                  <div className="flex flex-col gap-4 xl:gap-6 mt-4 md:mt-6 px-4 lg:px-6">
                    {!isBasicUser && <ChartAreaInteractive chartData={dashboardData?.chartData || []} />}

                    {isBasicUser && (
                      <>
                        <ItemGroup className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          <Item
                            asChild
                            variant="outline"
                            className="cursor-pointer transition-all hover:bg-muted/50"
                          >
                            <button
                              onClick={() => router.push('/sales/invoices')}
                              className="w-full text-left"
                            >
                              <ItemMedia variant="icon">
                                <FileText className="h-5 w-5" />
                              </ItemMedia>
                              <ItemContent>
                                <ItemTitle>Create Invoice</ItemTitle>
                                <ItemDescription>Generate new invoice for customers</ItemDescription>
                              </ItemContent>
                              <div className="ml-auto">
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </button>
                          </Item>

                          <Item
                            asChild
                            variant="outline"
                            className="cursor-pointer transition-all hover:bg-muted/50"
                          >
                            <button
                              onClick={() => router.push('/sales/quotations')}
                              className="w-full text-left"
                            >
                              <ItemMedia variant="icon">
                                <FileClock className="h-5 w-5" />
                              </ItemMedia>
                              <ItemContent>
                                <ItemTitle>Create Quotation</ItemTitle>
                                <ItemDescription>Prepare quotes for potential orders</ItemDescription>
                              </ItemContent>
                              <div className="ml-auto">
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </button>
                          </Item>

                          <Item
                            asChild
                            variant="outline"
                            className="cursor-pointer transition-all hover:bg-muted/50"
                          >
                            <button
                              onClick={() => router.push('/sales/receipts')}
                              className="w-full text-left"
                            >
                              <ItemMedia variant="icon">
                                <Ticket className="h-5 w-5" />
                              </ItemMedia>
                              <ItemContent>
                                <ItemTitle>Create Receipt</ItemTitle>
                                <ItemDescription>Issue receipt vouchers</ItemDescription>
                              </ItemContent>
                              <div className="ml-auto">
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </button>
                          </Item>

                          <Item
                            asChild
                            variant="outline"
                            className="cursor-pointer transition-all hover:bg-muted/50"
                          >
                            <button
                              onClick={() => router.push('/procurement/payments')}
                              className="w-full text-left"
                            >
                              <ItemMedia variant="icon">
                                <Truck className="h-5 w-5" />
                              </ItemMedia>
                              <ItemContent>
                                <ItemTitle>Create Payment</ItemTitle>
                                <ItemDescription>Issue payment vouchers</ItemDescription>
                              </ItemContent>
                              <div className="ml-auto">
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </button>
                          </Item>

                          <Item
                            asChild
                            variant="outline"
                            className="cursor-pointer transition-all hover:bg-muted/50"
                          >
                            <button
                              onClick={() => router.push('/procurement/purchases')}
                              className="w-full text-left"
                            >
                              <ItemMedia variant="icon">
                                <ShoppingCart className="h-5 w-5" />
                              </ItemMedia>
                              <ItemContent>
                                <ItemTitle>Create Purchase</ItemTitle>
                                <ItemDescription>Record purchases from suppliers</ItemDescription>
                              </ItemContent>
                              <div className="ml-auto">
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </button>
                          </Item>

                          <Item
                            asChild
                            variant="outline"
                            className="cursor-pointer transition-all hover:bg-muted/50"
                          >
                            <button
                              onClick={() => router.push('/procurement/expenses')}
                              className="w-full text-left"
                            >
                              <ItemMedia variant="icon">
                                <Banknote className="h-5 w-5" />
                              </ItemMedia>
                              <ItemContent>
                                <ItemTitle>Create Expense</ItemTitle>
                                <ItemDescription>Track and record business expenses</ItemDescription>
                              </ItemContent>
                              <div className="ml-auto">
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </button>
                          </Item>
                        </ItemGroup>
                        <Separator />
                      </>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* ✅ UPDATED: Table with smooth opacity transition */}
            <div className="px-4 lg:px-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>
                    Latest approved invoices and their details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                    {isLoading && !dashboardData ? (
                      <DataTableSkeleton columnCount={columns.length} rowCount={5} />
                    ) : (
                      <DataTable table={table}>
                        <DataTableToolbar table={table} />
                      </DataTable>
                    )}
                  </div>
                </CardContent>
              </Card>

              {dashboardData?.recentSales.length === 0 && !isLoading && (
                <Card className="mt-4">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <h3 className="text-lg font-semibold mb-2">No approved invoices</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Your approved invoices will appear here once you start creating and approving them.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <PDFViewerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pdfUrl={selectedPdfUrl}
        title={selectedPdfTitle}
      />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Spinner /></div>}>
      <DashboardContent />
    </Suspense>
  );
}