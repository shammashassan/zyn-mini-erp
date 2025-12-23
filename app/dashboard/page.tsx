// app/dashboard/page.tsx - UPDATED: Uses Invoice PDF route

"use client";

import * as React from "react";
import { useEffect, useState, useMemo, Suspense } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { ChartAreaInteractive } from "./dashboard-chart";
import { SectionCards, type CardData } from "@/components/section-cards";
import { getColumns, type RecentSale } from "./columns";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCurrency, formatCompactCurrency } from "@/utils/formatters/currency";
import { useDashboardPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";
import Preloader from "@/components/preloader";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Banknote, ChevronRight, FileClock, FileText, ShoppingCart, Ticket, Truck } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

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

function DashboardContent() {
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

  useEffect(() => {
    if (isMounted && !isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router, isMounted]);

  const fetchDashboardData = async () => {
    if (!canRead) return;

    try {
      setIsLoading(true);
      const response = await fetch("/api/dashboard");

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast.error("Could not load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted && session && canRead) {
      fetchDashboardData();
    }
  }, [session, canRead, isMounted]);

  const handleViewPdf = (sale: RecentSale) => {
    if (!sale || !sale._id) {
      toast.error("Cannot view PDF. Document data is missing.");
      return;
    }

    // ✅ UPDATED: Use the Invoice API route directly
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

  if (isLoading && !dashboardData) {
    return (
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
            {/* Header Skeleton */}
            <div className="px-4 lg:px-6 space-y-2">
              <Skeleton className="h-8 w-[250px]" />
              <Skeleton className="h-4 w-[350px]" />
            </div>

            {/* Metrics Cards Skeleton */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 px-4 lg:px-6">
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

            {/* Chart/Actions Area Skeleton */}
            <div className="flex flex-col gap-4 px-4 lg:px-6 xl:gap-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-[200px] mb-2" />
                  <Skeleton className="h-4 w-[300px]" />
                </CardHeader>
                <CardContent className="pl-2">
                  <Skeleton className="h-[300px] w-full" />
                </CardContent>
              </Card>

              {/* Recent Invoices Table Skeleton */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-[150px] mb-2" />
                  <Skeleton className="h-4 w-[250px]" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Table Header */}
                    <div className="flex items-center justify-between">
                       <Skeleton className="h-10 w-[250px]" />
                       <Skeleton className="h-10 w-[100px]" />
                    </div>
                    {/* Table Rows */}
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-4">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div className="space-y-2">
                            <Skeleton className="h-4 w-[150px]" />
                            <Skeleton className="h-3 w-[100px]" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-[80px]" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return null;
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

            {!isBasicUser && <SectionCards cards={cards} />}

            <div className="flex flex-col gap-4 px-4 lg:px-6 xl:gap-6">
              {!isBasicUser && <ChartAreaInteractive chartData={dashboardData.chartData} />}

              {isBasicUser && (
                <>
                  <ItemGroup className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Item
                      asChild
                      variant="outline"
                      className="cursor-pointer transition-all hover:bg-muted/50"
                    >
                      <button
                        onClick={() => router.push('/documents/invoices')}
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
                        onClick={() => router.push('/documents//quotations')}
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
                        onClick={() => router.push('/documents/vouchers')}
                        className="w-full text-left"
                      >
                        <ItemMedia variant="icon">
                          <Ticket className="h-5 w-5" />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>Create Voucher</ItemTitle>
                          <ItemDescription>Issue payment or receipt vouchers</ItemDescription>
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
                        onClick={() => router.push('/documents/delivery-notes')}
                        className="w-full text-left"
                      >
                        <ItemMedia variant="icon">
                          <Truck className="h-5 w-5" />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>Create Delivery Note</ItemTitle>
                          <ItemDescription>Track product deliveries to customers</ItemDescription>
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
                        onClick={() => router.push('/purchases')}
                        className="w-full text-left"
                      >
                        <ItemMedia variant="icon">
                          <ShoppingCart className="h-5 w-5" />
                        </ItemMedia>
                        <ItemContent>
                          <ItemTitle>Create Purchase</ItemTitle>
                          <ItemDescription>Record material purchases from suppliers</ItemDescription>
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
                        onClick={() => router.push('/expenses')}
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

              <Card>
                <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>
                    Latest approved invoices and their details
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <DataTable table={table}>
                    <DataTableToolbar table={table} />
                  </DataTable>
                </CardContent>
              </Card>

              {dashboardData.recentSales.length === 0 && !isLoading && (
                <Card>
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