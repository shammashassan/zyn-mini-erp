// app/sales/pos/page.tsx
"use client";

import React, {
    useState, useEffect, useMemo, useCallback, Suspense,
} from "react";
import { useQueryStates, parseAsInteger } from "nuqs";
import { toast } from "sonner";
import { ShoppingBag, Plus, CalendarIcon, Trash2, Undo2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { POSReturnModal } from "./pos-return-modal";
import { POSViewModal } from "./pos-view-modal";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { PDFViewerModal } from "@/components/shared/PDFViewerModal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { redirect, usePathname } from "next/navigation";
import { getSortingStateParser, getFiltersStateParser } from "@/lib/data-table/parsers";
import type { ExtendedColumnSort, ExtendedColumnFilter } from "@/types/data-table";
import { getColumns, type POSSale } from "./columns";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime } from "@/utils/formatters/date";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { usePOSPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/shared/access-denied";



// ─── Main page content ────────────────────────────────────────────────────────
function POSSalesPageContent() {
    const pathname = usePathname();

    // ── Permissions — identical pattern to invoice page ──────────────────────
    const {
        permissions: rawPermissions,
        isPending,
        session,
    } = usePOSPermissions();

    const permissions = useMemo(() => rawPermissions, [rawPermissions]);
    const {
        canRead,
        canCreate,
        canDelete,
        canViewTrash,
    } = permissions;

    // ── State ─────────────────────────────────────────────────────────────────
    const [isMounted, setIsMounted] = useState(false);
    const [sales, setSales] = useState<POSSale[]>([]);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [pageCount, setPageCount] = useState(0);
    const [totalCount, setTotalCount] = useState(0);

    const [pdfOpen, setPdfOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState("");
    const [pdfTitle, setPdfTitle] = useState("");

    const [detailOpen, setDetailOpen] = useState(false);
    const [returnModalOpen, setReturnModalOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<POSSale | null>(null);

    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: startOfMonth(subMonths(new Date(), 1)),
        to: endOfMonth(new Date()),
    });

    const [urlState, setUrlState] = useQueryStates({
        page: parseAsInteger.withDefault(1),
        pageSize: parseAsInteger.withDefault(10),
        sort: getSortingStateParser<POSSale>().withDefault([]),
        filters: getFiltersStateParser<POSSale>().withDefault([]),
    });

    useEffect(() => { setIsMounted(true); }, []);

    // ── Data fetching ─────────────────────────────────────────────────────────
    const fetchSales = useCallback(async (background = false) => {
        if (!canRead) return;
        try {
            if (!background) setIsLoading(true);

            const params = new URLSearchParams({
                page: urlState.page.toString(),
                pageSize: urlState.pageSize.toString(),
            });

            if (dateRange?.from) params.append("startDate", dateRange.from.toISOString());
            if (dateRange?.to) params.append("endDate", dateRange.to.toISOString());
            if (urlState.sort?.length) params.append("sort", JSON.stringify(urlState.sort));
            if (urlState.filters?.length) params.append("filters", JSON.stringify(urlState.filters));

            const res = await fetch(`/api/pos?${params}`);
            if (!res.ok) throw new Error(`API error: ${res.status}`);

            const result = await res.json();
            if (result.data) {
                setSales(result.data);
                setPageCount(result.pageCount);
                setTotalCount(result.totalCount);
            } else {
                setSales(result);
            }
        } catch {
            if (!background) toast.error("Could not load POS sales.");
        } finally {
            if (!background) setIsLoading(false);
            setIsInitialLoad(false);
        }
    }, [canRead, urlState.page, urlState.pageSize, urlState.sort, urlState.filters, dateRange]);

    useEffect(() => {
        if (isMounted && canRead) fetchSales();
    }, [isMounted, canRead, fetchSales]);

    useEffect(() => {
        const onFocus = () => { if (isMounted && canRead) fetchSales(true); };
        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [fetchSales, isMounted, canRead]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleViewPdf = useCallback((sale: POSSale) => {
        setPdfUrl(`/api/pos/${sale._id}/pdf`);
        setPdfTitle(sale.saleNumber);
        setPdfOpen(true);
    }, []);

    const handleView = useCallback((sale: POSSale) => {
        setSelectedSale(sale);
        setDetailOpen(true);
    }, []);

    const handleDelete = useCallback(async (id: string) => {
        if (!canDelete) {
            toast.error("You don't have permission to delete POS sales");
            return;
        }
        try {
            const res = await fetch(`/api/pos/${id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) { toast.error(data.error || "Failed to delete sale"); return; }
            toast.success("Sale moved to trash. Stock restored and journal voided.");
            fetchSales();
        } catch {
            toast.error("Failed to delete sale.");
        }
    }, [canDelete, fetchSales]);

    const handleQuickSelect = (period: string) => {
        const now = new Date();
        const presets: Record<string, { from: Date; to: Date }> = {
            today: { from: new Date(new Date().setHours(0, 0, 0, 0)), to: new Date(new Date().setHours(23, 59, 59, 999)) },
            thisWeek: { from: new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()), to: new Date() },
            thisMonth: { from: startOfMonth(new Date()), to: endOfMonth(new Date()) },
            lastMonth: { from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) },
            last3Months: { from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) },
        };
        if (presets[period]) { setDateRange(presets[period]); setUrlState({ page: 1 }); }
    };

    // ── Table ─────────────────────────────────────────────────────────────────
    const tablePermissions = { canDelete, canViewPdf: canRead };

    const columns = useMemo(() => getColumns(
        handleViewPdf,
        handleDelete,
        tablePermissions,
        fetchSales,
        handleView,
    ), [handleViewPdf, handleDelete, handleView, fetchSales, canDelete, canRead]);

    const { table } = useDataTable<POSSale>({
        data: sales,
        columns,
        pageCount,
        initialState: {
            pagination: { pageSize: urlState.pageSize, pageIndex: urlState.page - 1 },
            sorting: urlState.sort,
            columnFilters: urlState.filters,
        },
        onPaginationChange: p => setUrlState({ page: p.pageIndex + 1, pageSize: p.pageSize }),
        onSortingChange: s => setUrlState({ sort: s as ExtendedColumnSort<POSSale>[] }),
        onColumnFiltersChange: f => setUrlState({ filters: f as ExtendedColumnFilter<POSSale>[], page: 1 }),
        getRowId: row => row._id,
    });

    // ── Auth guards — identical pattern to invoice page ───────────────────────
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
        return <AccessDenied />;
    }

    const hasActiveFilters = urlState.filters && urlState.filters.length > 0;

    return (
        <>
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                        {/* ── Header ── */}
                        <div className="flex flex-col lg:flex-row lg:justify-between px-4 lg:px-6 gap-4">
                            <div className="flex items-center gap-3 self-start lg:self-center">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <ShoppingBag className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h1 className="text-3xl font-bold tracking-tight">POS Sales</h1>
                                        {totalCount > 0 && (
                                            <Badge variant="primary" appearance="outline">{totalCount}</Badge>
                                        )}
                                    </div>
                                    <p className="text-muted-foreground">Point of sale transaction history</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">

                                {/* Action buttons */}
                                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                                    {canViewTrash && (
                                        <Link href="./pos/trash" className="w-full sm:w-auto">
                                            <Button variant="outline" className="gap-2 w-full sm:w-auto">
                                                <Trash2 className="h-4 w-4" />
                                                Trash
                                            </Button>
                                        </Link>
                                    )}
                                    {canCreate && (
                                        <Link href="/billing" className="w-full sm:w-auto">
                                            <Button className="gap-2 w-full sm:w-auto">
                                                <Plus className="h-4 w-4" />
                                                New Sale
                                            </Button>
                                        </Link>
                                    )}
                                </div>

                                {/* Date range */}
                                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button
                                                variant="outline"
                                                className="w-full sm:w-[260px] justify-between px-3 font-normal"
                                            >
                                                <span className={cn("truncate", !dateRange && "text-muted-foreground")}>
                                                    {dateRange?.from
                                                        ? dateRange.to
                                                            ? `${format(dateRange.from, "LLL dd, y")} - ${format(dateRange.to, "LLL dd, y")}`
                                                            : format(dateRange.from, "LLL dd, y")
                                                        : "Pick a date range"}
                                                </span>
                                                <CalendarIcon size={16} aria-hidden="true" />
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

                                    <Select onValueChange={handleQuickSelect} defaultValue="lastMonth">
                                        <SelectTrigger className="w-full sm:w-[160px]">
                                            <SelectValue placeholder="Quick select" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="today">Today</SelectItem>
                                            <SelectItem value="thisWeek">This Week</SelectItem>
                                            <SelectItem value="thisMonth">This Month</SelectItem>
                                            <SelectItem value="lastMonth">Last Month</SelectItem>
                                            <SelectItem value="last3Months">Last 3 Months</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* ── Table / Empty state — mirrors invoice page pattern ── */}
                        <div className="flex flex-col gap-4 px-4 lg:px-6 xl:gap-6">
                            <div className={cn("transition-opacity duration-200", isInitialLoad ? "opacity-50" : "opacity-100")}>
                                {isInitialLoad ? (
                                    <Card>
                                        <CardContent className="p-6">
                                            <DataTableSkeleton columnCount={columns.length} rowCount={10} />
                                        </CardContent>
                                    </Card>
                                ) : sales.length > 0 || hasActiveFilters ? (
                                    <Card>
                                        <CardContent className="p-6">
                                            <div className={cn(
                                                "transition-opacity duration-200",
                                                isLoading ? "opacity-50 pointer-events-none" : "opacity-100"
                                            )}>
                                                <DataTable table={table}>
                                                    <DataTableToolbar table={table} />
                                                </DataTable>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <Card>
                                        <CardContent className="flex flex-col items-center justify-center py-12">
                                            <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4" />
                                            <h3 className="text-lg font-semibold mb-2">No POS sales yet</h3>
                                            <p className="text-muted-foreground text-center mb-4">
                                                Create your first sale at the POS terminal
                                            </p>
                                            {canCreate && (
                                                <Link href="/billing">
                                                    <Button className="gap-2">
                                                        <Plus className="h-4 w-4" />
                                                        Open POS Terminal
                                                    </Button>
                                                </Link>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            <PDFViewerModal
                isOpen={pdfOpen}
                onClose={() => setPdfOpen(false)}
                pdfUrl={pdfUrl}
                title={pdfTitle}
            />

            <POSViewModal
                isOpen={detailOpen}
                onClose={() => { setDetailOpen(false); setSelectedSale(null); }}
                sale={selectedSale}
                onViewPdf={handleViewPdf}
                onReturnItems={(sale) => {
                    setSelectedSale(sale);
                    setDetailOpen(false);
                    setReturnModalOpen(true);
                }}
            />

            <POSReturnModal
                isOpen={returnModalOpen}
                onClose={() => { setReturnModalOpen(false); setSelectedSale(null); }}
                sale={selectedSale}
                onSuccess={() => {
                    fetchSales(true);
                }}
            />
        </>
    );
}

export default function Component() {
    return (
        <Suspense fallback={
            <div className="flex flex-1 items-center justify-center">
                <Spinner className="size-10" />
            </div>
        }>
            <POSSalesPageContent />
        </Suspense>
    );
}