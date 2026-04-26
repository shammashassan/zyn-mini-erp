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
import { ProductSalesTable } from "./top-products-table";
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
import { Banknote, ChevronRight, FileClock, FileText, ShoppingBag, ShoppingCart, Ticket, Truck, LayoutGrid, List } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MiniStatsCards } from "@/components/mini-stats-card";

interface DailySummary {
  date: string;
  sales: number;
  expenses: number;
}

interface TrendData {
  trend: "up" | "down" | "neutral";
  change: number;
}

interface DashboardData {
  summary: {
    revenue: number;
    cogs: number;
    grossProfit: number;
    opex: number;
    netProfit: number;
    purchases: number;
    expenses: number;
    netTax: number;
    orders: number;
    totalCosts: number;
    salary: number;
    rent: number;
  };
  previousSummary: {
    revenue: number;
    purchases: number;
    expenses: number;
    netTax: number;
    orders: number;
    totalCosts: number;
    netProfit: number;
    salary: number;
    rent: number;
  };
  trends: {
    revenue: TrendData;
    cogs: TrendData;
    grossProfit: TrendData;
    opex: TrendData;
    netProfit: TrendData;
    purchases: TrendData;
    expenses: TrendData;
    orders: TrendData;
    totalCosts: TrendData;
    salary: TrendData;
    rent: TrendData;
  };
  chartData: DailySummary[];
  recentSales: RecentSale[];
  topProducts: any[];
}

// Removed hardcoded constants - now pulling from API

// ✅ ADDED: Dashboard Skeleton Component
function DashboardSkeleton({ isBasicUser, viewMode }: { isBasicUser: boolean; viewMode: "mini" | "section" }) {
  const cardCount = viewMode === "mini" ? 6 : 4;
  const gridCols = viewMode === "mini"
    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    : "grid-cols-1 md:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="space-y-6 animate-in fade-in-50 px-4 lg:px-6">
      {/* Metrics Cards Skeleton */}
      {!isBasicUser && (
        <div className={cn("grid gap-4", gridCols)}>
          {Array.from({ length: cardCount }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-[80px]" />
                <Skeleton className="h-4 w-4 rounded-full" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-[100px] mb-2" />
                <Skeleton className="h-3 w-[140px]" />
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

      {/* Recent Sales Table Skeleton */}
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

  const [showWelcome, setShowWelcome] = useState(() => searchParams.get("welcome") === "true");
  const [timeRange, setTimeRange] = useState<"daily" | "monthly">("daily");
  const [viewMode, setViewMode] = useState<"mini" | "section">("mini");

  useEffect(() => {
    if (searchParams.get("welcome") === "true") {
      const timeout = setTimeout(() => {
        router.replace("/dashboard", { scroll: false });
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [searchParams, router]);

  const {
    permissions: { canRead },
    session,
    isPending,
  } = useDashboardPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ UPDATED: Added 'background' param for silent refreshes
  const fetchDashboardData = useCallback(async (background = false, range = timeRange) => {
    if (!canRead) return;

    try {
      if (!background) {
        setIsLoading(true);
      }

      const response = await fetch(`/api/dashboard?range=${range}`);

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
  }, [canRead, timeRange]);

  // ✅ UPDATED: Standard fetch on mount & range change
  useEffect(() => {
    if (isMounted && session && canRead) {
      fetchDashboardData(false, timeRange);
    }
  }, [session, canRead, isMounted, fetchDashboardData, timeRange]);

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

    if (sale.documentType === 'pos_sale') {
      setSelectedPdfUrl(`/api/pos/${sale._id}/pdf`);
    } else {
      setSelectedPdfUrl(`/api/invoices/${sale._id}/pdf`);
    }
    setSelectedPdfTitle(sale.documentNumber || "Document");
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
    const profitMargin = summary.revenue > 0
      ? ((summary.netProfit / summary.revenue) * 100).toFixed(1)
      : '0';

    const formatTrend = (val: number) => {
      if (Math.abs(val) < 0.05) return "0.0%";
      const sign = val > 0 ? "+" : val < 0 ? "-" : "";
      return `${sign}${Math.abs(val).toFixed(1)}%`;
    };

    return [
      {
        label: "Revenue",
        value: formatCompactCurrency(summary?.revenue || 0),
        trend: trends?.revenue?.trend || "neutral",
        change: formatTrend(trends?.revenue?.change || 0),
        note: (trends?.revenue?.trend === "up") ? "Revenue trending up" : "Revenue declining",
        subtext: `Revenue excluding VAT`,
        href: "/sales/invoices",
      },
      {
        label: "Gross Profit",
        value: formatCompactCurrency(summary?.grossProfit || 0),
        trend: trends?.grossProfit?.trend || "neutral",
        change: formatTrend(trends?.grossProfit?.change || 0),
        note: `Margin: ${summary?.revenue > 0 ? ((summary.grossProfit / summary.revenue) * 100).toFixed(1) : '0'}%`,
        subtext: `After COGS (${formatCompactCurrency(summary?.cogs || 0)})`,
        href: "/procurement/purchases",
      },
      {
        label: "Operating Expenses",
        value: formatCompactCurrency(summary?.opex || 0),
        trend: trends?.opex?.trend || "neutral",
        change: formatTrend(trends?.opex?.change || 0),
        note: `Other + Salary + Rent`,
        subtext: "Operational overhead",
        href: "/procurement/expenses",
      },
      {
        label: "Net Profit",
        value: formatCompactCurrency(summary?.netProfit || 0),
        trend: trends?.netProfit?.trend || "neutral",
        change: formatTrend(trends?.netProfit?.change || 0),
        note: (summary?.netProfit || 0) >= 0 ? "Profitable performance" : "Operating loss",
        subtext: `Net Margin: ${profitMargin}%`,
        href: "/accounting/profit-loss",
      },
    ];
  }, [dashboardData]);

  const miniCards = useMemo(() => {
    if (!dashboardData) return [];
    const { summary, trends } = dashboardData;

    const netBalance = summary.netProfit;

    const formatTrend = (val: number) => {
      if (Math.abs(val) < 0.05) return "0.0%";
      const sign = val > 0 ? "+" : val < 0 ? "-" : "";
      return `${sign}${Math.abs(val).toFixed(1)}%`;
    };

    return [
      {
        label: "Revenue",
        value: formatCompactCurrency(summary?.revenue || 0),
        change: formatTrend(trends?.revenue?.change || 0),
        trend: trends?.revenue?.trend || "neutral",
        note: (trends?.revenue?.change || 0) >= 0 ? "Revenue increasing" : "Revenue decreasing",
        subtext: "Excluding VAT",
        href: "/sales/pos",
      },
      {
        label: "COGS",
        value: formatCompactCurrency(summary?.cogs || 0),
        change: formatTrend(trends?.cogs?.change || 0),
        trend: trends?.cogs?.trend || "neutral",
        note: "Direct Costs",
        subtext: "Stock acquisition",
        href: "/procurement/purchases",
      },
      {
        label: "Expenses",
        value: formatCompactCurrency(summary?.expenses || 0),
        change: formatTrend(trends?.expenses?.change || 0),
        trend: trends?.expenses?.trend || "neutral",
        note: "Operating spend",
        subtext: "Excl. Salary/Rent",
        href: "/procurement/expenses",
      },
      {
        label: "Rent",
        value: formatCompactCurrency(summary?.rent || 0),
        change: formatTrend(trends?.rent?.change || 0),
        trend: trends?.rent?.trend || "neutral",
        note: "Facility Cost",
        subtext: "Dynamic from Journal",
        href: "/procurement/expenses",
      },
      {
        label: "Salary",
        value: formatCompactCurrency(summary?.salary || 0),
        change: formatTrend(trends?.salary?.change || 0),
        trend: trends?.salary?.trend || "neutral",
        note: "Personnel Cost",
        subtext: "Dynamic from Journal",
        href: "/hrm/employees",
      },
      {
        label: "Net Profit",
        value: formatCompactCurrency(netBalance),
        change: formatTrend(trends?.netProfit?.change || 0),
        trend: trends?.netProfit?.trend || "neutral",
        note: netBalance >= 0 ? "Positive balance" : "Reflects deficit",
        subtext: "Final Balance",
        href: "/accounting/profit-loss",
      },
    ];
  }, [dashboardData, timeRange]);

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
              setShowWelcome(false);
            }}
          />
        )}

        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex flex-col gap-4 px-4 lg:px-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Welcome back, {session.user.name || session.user.email}!
                </h1>
                <p className="text-muted-foreground">
                  {isBasicUser
                    ? "Access your recent sales and quick actions."
                    : "Here's what's happening with your business today."}
                </p>
              </div>

              {!isBasicUser && (
                <div className="flex items-center gap-2">
                  <ToggleGroup
                    type="single"
                    value={timeRange}
                    onValueChange={(v) => v && setTimeRange(v as any)}
                  >
                    <ToggleGroupItem value="daily" className="px-3">Daily</ToggleGroupItem>
                    <ToggleGroupItem value="monthly" className="px-3">Monthly</ToggleGroupItem>
                  </ToggleGroup>

                  <Separator orientation="vertical" className="h-8 mx-1" />

                  <ToggleGroup
                    type="single"
                    value={viewMode}
                    onValueChange={(v) => v && setViewMode(v as any)}
                  >
                    <ToggleGroupItem value="mini" aria-label="Mini view">
                      <LayoutGrid className="h-4 w-4" />
                    </ToggleGroupItem>
                    <ToggleGroupItem value="section" aria-label="Section view">
                      <List className="h-4 w-4" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              )}
            </div>

            {/* ✅ UPDATED: Applied transition-opacity & Skeleton */}
            <div className={cn("transition-opacity duration-200", isLoading && !dashboardData ? "opacity-50" : "opacity-100")}>
              {isLoading && !dashboardData ? (
                <DashboardSkeleton isBasicUser={isBasicUser} viewMode={viewMode} />
              ) : (
                <>
                  {!isBasicUser && (
                    <div className="space-y-6">
                      {viewMode === "mini" ? (
                        <MiniStatsCards cards={miniCards} />
                      ) : (
                        <SectionCards cards={cards} />
                      )}
                    </div>
                  )}

                  <div className="flex flex-col gap-4 xl:gap-6 mt-4 md:mt-6 px-4 lg:px-6">
                    {!isBasicUser && (
                      <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] 2xl:grid-cols-[2fr_1fr] gap-4 xl:gap-6">
                        <div className="min-w-0 h-full">
                          <ChartAreaInteractive chartData={dashboardData?.chartData || []} />
                        </div>
                        <div className="min-w-0 h-full">
                          <ProductSalesTable products={dashboardData?.topProducts || []} />
                        </div>
                      </div>
                    )}

                    {isBasicUser && (
                      <>
                        <ItemGroup className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                          <Item
                            asChild
                            variant="outline"
                            className="cursor-pointer transition-all hover:bg-muted/50"
                          >
                            <button
                              onClick={() => router.push('/billing')}
                              className="w-full text-left"
                            >
                              <ItemMedia variant="icon">
                                <ShoppingBag className="h-5 w-5" />
                              </ItemMedia>
                              <ItemContent>
                                <ItemTitle>Create POS sales</ItemTitle>
                                <ItemDescription>Generate new POS sales for customers</ItemDescription>
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
                  <CardTitle>Recent Sales</CardTitle>
                  <CardDescription>
                    Latest approved sales and their details
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
                    <h3 className="text-lg font-semibold mb-2">No approved sales</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Your approved sales will appear here once you start creating and approving them.
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