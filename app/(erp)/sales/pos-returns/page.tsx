"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { PackageX, CalendarIcon, Undo2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { getColumns, type POSReturn } from "./columns";
import { PDFViewerModal } from "@/components/shared/PDFViewerModal";
import { POSReturnViewModal } from "./pos-return-view-modal";
import { useReturnNotePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/shared/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { useQueryStates, parseAsInteger } from "nuqs";
import { getSortingStateParser, getFiltersStateParser } from "@/lib/data-table/parsers";
import type { ExtendedColumnSort, ExtendedColumnFilter } from "@/types/data-table";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { DateRange } from "react-day-picker";
import { redirect, usePathname } from "next/navigation";
import Link from "next/link";

function POSReturnsPageContent() {
  const pathname = usePathname();
  const [posReturns, setPosReturns] = useState<POSReturn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<POSReturn | null>(null);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 1)),
    to: endOfMonth(new Date()),
  });

  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [urlState, setUrlState] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(10),
    sort: getSortingStateParser<POSReturn>().withDefault([{ id: "createdAt", desc: true }]),
    filters: getFiltersStateParser<POSReturn>().withDefault([]),
  });

  const {
    permissions: {
      canRead,
      canDelete,
      canViewTrash,
    },
    session,
    isPending,
  } = useReturnNotePermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchPOSReturns = useCallback(
    async (background = false) => {
      if (!canRead) return;

      try {
        if (!background) {
          setIsLoading(true);
        }

        const params = new URLSearchParams({
          page: urlState.page.toString(),
          pageSize: urlState.pageSize.toString(),
          populate: "true",
          returnType: "posReturn",
        });

        if (dateRange?.from) {
          params.append("startDate", dateRange.from.toISOString());
        }
        if (dateRange?.to) {
          params.append("endDate", dateRange.to.toISOString());
        }

        if (urlState.sort && urlState.sort.length > 0) {
          params.append("sort", JSON.stringify(urlState.sort));
        }

        if (urlState.filters && urlState.filters.length > 0) {
          params.append("filters", JSON.stringify(urlState.filters));
        }

        const res = await fetch(`/api/return-notes?${params.toString()}`);

        if (res.status === 403) {
          if (!background) toast.error("You don't have permission to view POS returns");
          return;
        }

        if (!res.ok) throw new Error("Failed to fetch POS returns");

        const result = await res.json();

        if (result.data && result.pageCount !== undefined) {
          setPosReturns(result.data);
          setPageCount(result.pageCount);
          setTotalCount(result.totalCount);
        } else {
          setPosReturns(result);
        }
      } catch (error) {
        if (!background) {
          toast.error("Could not load POS returns.");
          console.error(error);
        }
      } finally {
        if (!background) {
          setIsLoading(false);
        }
        setIsInitialLoad(false);
      }
    },
    [canRead, urlState.page, urlState.pageSize, urlState.sort, urlState.filters, dateRange]
  );

  useEffect(() => {
    if (session && canRead) {
      fetchPOSReturns();
    } else if (session && !canRead) {
      toast.error("You don't have permission to view POS returns", {
        description: "Only authorized users can access this page",
      });
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [canRead, fetchPOSReturns]);

  useEffect(() => {
    const onFocus = () => {
      if (session && canRead) {
        fetchPOSReturns(true);
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchPOSReturns, session, canRead]);

  const handleDelete = async (id: string) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete POS returns");
      return;
    }

    try {
      const res = await fetch(`/api/return-notes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      toast.success(`POS Return deleted successfully.`);
      fetchPOSReturns();
    } catch (error: any) {
      console.error("Failed to delete POS return:", error);
      toast.error(error.message || "Failed to delete POS return.");
    }
  };

  const handleViewDetails = useCallback((posReturn: POSReturn) => {
    setSelectedReturn(posReturn);
    setIsViewModalOpen(true);
  }, []);

  const handleViewPdf = useCallback((posReturn: POSReturn) => {
    if (!posReturn || !posReturn._id) {
      toast.error("Cannot view PDF. Return data is missing.");
      return;
    }

    const pdfUrl = `/api/return-notes/${posReturn._id}/pdf`;
    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(posReturn.returnNumber || "POS Return");
    setIsModalOpen(true);
  }, []);

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

  const columns = useMemo(
    () => getColumns(handleDelete, handleViewDetails, handleViewPdf, canDelete),
    [canDelete, handleViewDetails, handleViewPdf]
  );

  const { table } = useDataTable<POSReturn>({
    data: posReturns,
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
      setUrlState({ sort: sorting as ExtendedColumnSort<POSReturn>[] });
    },
    onColumnFiltersChange: (filters) => {
      setUrlState({
        filters: filters as ExtendedColumnFilter<POSReturn>[],
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

  if (!session) {
    redirect(`/login?callbackURL=${encodeURIComponent(pathname)}`);
  }

  if (!canRead) {
    return <AccessDenied />;
  }

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex flex-col lg:flex-row lg:justify-between px-4 lg:px-6 gap-4">
              <div className="flex items-center gap-3 self-start lg:self-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Undo2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">POS Returns</h1>
                    {totalCount > 0 && (
                      <Badge variant="primary" appearance="outline">
                        {totalCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Track POS refunds and returns
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {canViewTrash && (
                    <Link href="./pos-returns/trash" className="w-full sm:w-auto">
                      <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <Trash2 className="h-4 w-4" />
                        Trash
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
                        <span
                          className={cn(
                            "truncate",
                            !dateRange && "text-muted-foreground"
                          )}
                        >
                          {dateRange?.from ? (
                            dateRange.to ? (
                              <>
                                {format(dateRange.from, "LLL dd, y")} -{" "}
                                {format(dateRange.to, "LLL dd, y")}
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

                  <Select onValueChange={handleQuickSelect} defaultValue="lastMonth">
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
              <div className={cn("transition-opacity duration-200", isInitialLoad ? "opacity-50" : "opacity-100")}>
                {isInitialLoad ? (
                  <Card>
                    <CardContent className="p-6">
                      <DataTableSkeleton columnCount={columns.length} rowCount={10} />
                    </CardContent>
                  </Card>
                ) : posReturns.length > 0 || (urlState.filters && urlState.filters.length > 0) ? (
                  <Card>
                    <CardContent className="p-6">
                      <div
                        className={cn(
                          "transition-opacity duration-200",
                          isLoading ? "opacity-50 pointer-events-none" : "opacity-100"
                        )}
                      >
                        <DataTable table={table}>
                          <DataTableToolbar table={table} />
                        </DataTable>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <PackageX className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No POS returns yet</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        Refunded POS sales will appear here.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
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

      <POSReturnViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        posReturn={selectedReturn}
        onViewPdf={handleViewPdf}
      />
    </>
  );
}

export default function Component() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-10" />
        </div>
      }
    >
      <POSReturnsPageContent />
    </Suspense>
  );
}
