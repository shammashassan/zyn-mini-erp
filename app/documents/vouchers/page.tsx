// app/documents/vouchers/page.tsx - UPDATED: Added Silent Background Fetch on Focus

"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useQueryStates, parseAsInteger } from "nuqs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getColumns, type Voucher } from "./columns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { VoucherForm } from "./voucher-form";
import { toast } from "sonner";
import { Ticket, Trash2, BarChart3, Plus, CalendarIcon } from "lucide-react";
import Link from "next/link";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useVoucherPermissions, useReportPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { getSortingStateParser, getFiltersStateParser } from "@/lib/data-table/parsers";
import type { ExtendedColumnSort, ExtendedColumnFilter } from "@/types/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");
  const [activeTab, setActiveTab] = useState("receipt");
  const [isVoucherFormOpen, setIsVoucherFormOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Date Range State (Default 6 months)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date()),
  });

  const isSubmittingRef = useRef(false);

  const {
    permissions: {
      canRead,
      canCreate,
      canDelete,
      canViewTrash,
    },
    isPending,
  } = useVoucherPermissions();

  const { permissions: { canRead: canViewReports } } = useReportPermissions();

  const [urlState, setUrlState] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(10),
    sort: getSortingStateParser<Voucher>().withDefault([]),
    filters: getFiltersStateParser<Voucher>().withDefault([]),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ UPDATED: Added 'background' param. If true, skips loading state (silent fetch).
  const fetchVouchers = useCallback(async (background = false) => {
    if (!canRead) return;
    try {
      // Only show loading spinner/skeleton if it's NOT a background fetch
      if (!background) {
        setIsLoading(true);
      }

      const params = new URLSearchParams({
        page: urlState.page.toString(),
        pageSize: urlState.pageSize.toString(),
        populate: 'true',
        voucherType: activeTab,
      });

      // Add Date Range to params
      if (dateRange?.from) {
        params.append('startDate', dateRange.from.toISOString());
      }
      if (dateRange?.to) {
        params.append('endDate', dateRange.to.toISOString());
      }

      if (urlState.sort && urlState.sort.length > 0) {
        params.append('sort', JSON.stringify(urlState.sort));
      }

      if (urlState.filters && urlState.filters.length > 0) {
        params.append('filters', JSON.stringify(urlState.filters));
      }

      const res = await fetch(`/api/vouchers?${params.toString()}`);

      if (!res.ok) throw new Error("Failed to fetch vouchers");

      const result = await res.json();

      if (result.data && result.pageCount !== undefined) {
        setVouchers(result.data);
        setPageCount(result.pageCount);
        setTotalCount(result.totalCount);
      } else {
        setVouchers(result.filter((v: Voucher) => v.voucherType === activeTab));
      }
    } catch (error) {
      // Only show toast error if it's a user interaction, not a background poll
      if (!background) {
        toast.error("Could not load vouchers.");
      }
    } finally {
      if (!background) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  }, [canRead, urlState.page, urlState.pageSize, urlState.sort, urlState.filters, activeTab, dateRange]);

  // Standard fetch on dependency change
  useEffect(() => {
    if (isMounted && canRead) {
      fetchVouchers();
    }
  }, [isMounted, canRead, fetchVouchers]);

  // ✅ NEW: Window Focus Listener - SILENT MODE
  // This triggers a silent "background" fetch when you tab back to this page.
  useEffect(() => {
    const onFocus = () => {
      if (isMounted && canRead) {
        // Pass true to indicate this is a background fetch (no loading UI/opacity change)
        fetchVouchers(true);
      }
    };

    window.addEventListener("focus", onFocus);
    
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchVouchers, isMounted, canRead]);

  useEffect(() => {
    setUrlState({ page: 1 });
  }, [activeTab]);

  const handleDelete = async (selectedVouchers: Voucher[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete vouchers");
      return;
    }

    try {
      const deletePromises = selectedVouchers.map((voucher) =>
        fetch(`/api/vouchers/${voucher._id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      toast.success(
        `${selectedVouchers.length} ${selectedVouchers.length === 1 ? 'voucher' : 'vouchers'} moved to trash.`,
      );

      fetchVouchers();
    } catch (error) {
      console.error('Failed to delete vouchers:', error);
      toast.error('Failed to delete vouchers.');
    }
  };

  const handleViewPdf = (doc: any) => {
    if (!doc || !doc._id) {
      toast.error("Cannot view PDF. Document data is missing.");
      return;
    }

    let url = "";

    if (doc.documentType === 'invoice') {
      url = `/api/invoices/${doc._id}/pdf`;
    } else {
      const type = doc.voucherType || activeTab;
      url = `/api/vouchers/${doc._id}/pdf?type=${type}`;
    }

    setSelectedPdfUrl(url);
    setSelectedPdfTitle(doc.invoiceNumber || "Document");
    setIsModalOpen(true);
  };

  const handleVoucherFormSubmit = async (data: any) => {
    if (isSubmittingRef.current) return;

    if (!canCreate) {
      toast.error("You don't have permission to create vouchers");
      return;
    }

    isSubmittingRef.current = true;

    try {
      const res = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Failed to create voucher.");
        return;
      }

      const newVoucherId = result.voucher._id;
      const voucherNumber = result.voucher.invoiceNumber;

      const voucherTypeLabel = data.voucherType === 'receipt' 
        ? 'Receipt' 
        : data.voucherType === 'payment' 
          ? 'Payment' 
          : 'Refund';

      toast.success(`${voucherTypeLabel} Voucher ${voucherNumber} created!`);

      setIsVoucherFormOpen(false);
      fetchVouchers();

      const pdfUrl = `/api/vouchers/${newVoucherId}/pdf?type=${data.voucherType}`;
      setSelectedPdfUrl(pdfUrl);
      setSelectedPdfTitle(voucherNumber || "Voucher");
      setIsModalOpen(true);

    } catch (error) {
      console.error("Error creating voucher:", error);
      toast.error("An error occurred while creating voucher.");
    } finally {
      isSubmittingRef.current = false;
    }
  };

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
    setUrlState({ page: 1 });
  };

  const columns = useMemo(() => getColumns(
    handleViewPdf,
    (voucherOrId: Voucher | string) => {
      const id = typeof voucherOrId === 'object' ? voucherOrId._id : voucherOrId;
      const voucherToDelete = vouchers.find((v: Voucher) => v._id === id);
      if (voucherToDelete) {
        handleDelete([voucherToDelete]);
      }
    },
    { canDelete },
    fetchVouchers,
  ), [vouchers, canDelete]);

  const { table } = useDataTable<Voucher>({
    data: vouchers,
    columns,
    pageCount,
    initialState: {
      sorting: urlState.sort,
      pagination: {
        pageSize: urlState.pageSize,
        pageIndex: urlState.page - 1,
      },
      columnFilters: urlState.filters,
    },
    onPaginationChange: (pagination) => {
      setUrlState({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      });
    },
    onSortingChange: (sorting) => {
      setUrlState({ sort: sorting as ExtendedColumnSort<Voucher>[] });
    },
    onColumnFiltersChange: (filters) => {
      setUrlState({
        filters: filters as ExtendedColumnFilter<Voucher>[],
        page: 1,
      });
    },
    getRowId: (row) => row._id,
  });

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
            <div className="flex flex-col lg:flex-row lg:justify-between px-4 lg:px-6 gap-4">
              
              {/* Left: Title */}
              <div className="flex items-center gap-3 self-start lg:self-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Ticket className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Vouchers</h1>
                    {totalCount > 0 && (
                      <Badge variant="primary" appearance="outline">
                        {totalCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Manage receipt, payment, and refund vouchers
                  </p>
                </div>
              </div>
              
              {/* Right: Actions & Filters Group */}
              <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
                
                {/* Row 1: Actions */}
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {canViewTrash && (
                   <Link href="./vouchers/trash" className="w-full sm:w-auto">
                     <Button variant="outline" className="gap-2 w-full sm:w-auto">
                       <Trash2 className="h-4 w-4" />
                       Trash
                     </Button>
                   </Link>
                  )}
                   {canViewReports && (
                    <Link href="/reports/payments-report" className="w-full sm:w-auto">
                      <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <BarChart3 className="h-4 w-4" /> Reports
                      </Button>
                    </Link>
                   )}
                   {canCreate && (
                    <Button
                      onClick={() => setIsVoucherFormOpen(true)}
                      className="gap-2 w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4" />
                      New Voucher
                    </Button>
                   )}
                </div>

                {/* Row 2: Date Filters */}
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {/* Date Range Picker */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full sm:w-[260px] justify-between px-3 font-normal"
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

                  {/* Quick Select Dropdown */}
                  <Select onValueChange={handleQuickSelect} defaultValue="last6Months">
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
            </div>

            <div className="flex flex-col gap-4 px-4 lg:px-6 xl:gap-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex justify-center">
                  <TabsList className="flex justify-center w-full max-w-2xl grid-cols-3">
                    <TabsTrigger value="receipt" className="flex items-center gap-2">
                      Receipt
                    </TabsTrigger>
                    <TabsTrigger value="payment" className="flex items-center gap-2">
                      Payment
                    </TabsTrigger>
                    <TabsTrigger value="refund" className="flex items-center gap-2">
                      Refund
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="mt-6">
                  <Card>
                    <CardContent className="p-6">
                      {isInitialLoad ? (
                        <DataTableSkeleton
                          columnCount={columns.length}
                          rowCount={10}
                        />
                      ) : (
                        <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                          <DataTable table={table}>
                            <DataTableToolbar table={table} />
                          </DataTable>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </Tabs>

              {vouchers.length === 0 && !isLoading && !isInitialLoad && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Ticket className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No vouchers yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Your vouchers will appear here once you create them
                    </p>
                    {canCreate && (
                      <Button onClick={() => setIsVoucherFormOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Voucher
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <VoucherForm
        isOpen={isVoucherFormOpen}
        onClose={() => setIsVoucherFormOpen(false)}
        onSubmit={handleVoucherFormSubmit}
      />

      <PDFViewerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pdfUrl={selectedPdfUrl}
        title={selectedPdfTitle}
      />
    </>
  );
}