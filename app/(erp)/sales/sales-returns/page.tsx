// app/sales/sales-returns/page.tsx

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { toast } from "sonner";
import { PackageX, Plus, Trash2, CalendarIcon, Undo, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { SalesReturnForm } from "./sales-return-form";
import { getColumns, type SalesReturn } from "./columns";
import { SalesReturnViewModal } from "./SalesReturnViewModal";
import { PDFViewerModal } from "@/components/shared/PDFViewerModal";
import Link from "next/link";
import { useReturnNotePermissions } from "@/hooks/use-permissions";
import { forbidden } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { useQueryStates, parseAsInteger } from "nuqs";
import { getSortingStateParser, getFiltersStateParser } from "@/lib/data-table/parsers";
import type { ExtendedColumnSort, ExtendedColumnFilter } from "@/types/data-table";
import { cn } from "@/lib/utils";
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
import { redirect, usePathname } from "next/navigation";

function SalesReturnsPageContent() {
  const pathname = usePathname();
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [returnToView, setReturnToView] = useState<SalesReturn | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date()),
  });

  const isSubmittingRef = useRef(false);

  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [urlState, setUrlState] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(10),
    sort: getSortingStateParser<SalesReturn>().withDefault([{ id: "returnDate", desc: true }]),
    filters: getFiltersStateParser<SalesReturn>().withDefault([]),
  });

  const {
    permissions: {
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      canViewTrash,
    },
    session,
    isPending,
  } = useReturnNotePermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchSalesReturns = useCallback(
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
          returnType: "salesReturn",
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
          if (!background) toast.error("You don't have permission to view sales returns");
          return;
        }

        if (!res.ok) throw new Error("Failed to fetch sales returns");

        const result = await res.json();

        if (result.data && result.pageCount !== undefined) {
          setSalesReturns(result.data);
          setPageCount(result.pageCount);
          setTotalCount(result.totalCount);
        } else {
          setSalesReturns(result);
        }
      } catch (error) {
        if (!background) {
          toast.error("Could not load sales returns.");
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
      fetchSalesReturns();
    } else if (session && !canRead) {
      toast.error("You don't have permission to view sales returns", {
        description: "Only authorized users can access this page",
      });
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [canRead, fetchSalesReturns]);

  useEffect(() => {
    const onFocus = () => {
      if (session && canRead) {
        fetchSalesReturns(true);
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchSalesReturns, session, canRead]);

  const handleOpenForm = (salesReturn: SalesReturn | null = null) => {
    if (salesReturn && !canUpdate) {
      toast.error("You don't have permission to edit sales returns");
      return;
    }

    if (salesReturn && salesReturn.status !== "pending") {
      toast.error("Cannot edit sales return", {
        description: "Only pending sales returns can be edited.",
      });
      return;
    }

    if (!salesReturn && !canCreate) {
      toast.error("You don't have permission to create sales returns");
      return;
    }

    setSelectedReturn(salesReturn);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: any, id?: string) => {
    if (isSubmittingRef.current) return;

    if (id && !canUpdate) {
      toast.error("You don't have permission to update sales returns");
      return;
    }
    if (!id && !canCreate) {
      toast.error("You don't have permission to create sales returns");
      return;
    }

    isSubmittingRef.current = true;

    const url = id ? `/api/return-notes/${id}` : "/api/return-notes";
    const method = id ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.status === 403) {
        const errorData = await res.json();
        throw new Error(
          errorData.message || "You don't have permission to perform this action"
        );
      }

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || result.message || "Failed to save sales return");
      }

      toast.success(`Sales return ${id ? "updated" : "created"} successfully.`);
      fetchSalesReturns();
      setIsFormOpen(false);
      setSelectedReturn(null);

      const savedReturn = result.returnNote || result;

      setSelectedPdfUrl(`/api/return-notes/${savedReturn._id}/pdf`);
      setSelectedPdfTitle(savedReturn.returnNumber || "Sales Return");
      setIsModalOpen(true);

    } catch (error: any) {
      toast.error(error.message || `Failed to ${id ? "update" : "create"} sales return.`);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleDelete = async (selectedReturns: SalesReturn[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete sales returns");
      return;
    }

    try {
      const deletePromises = selectedReturns.map((returnNote) =>
        fetch(`/api/return-notes/${returnNote._id}`, { method: "DELETE" }).then(
          async (res) => {
            if (res.status === 403) {
              throw new Error("You don't have permission to delete sales returns");
            }
            if (!res.ok) throw new Error("Failed to delete");
            return res.json();
          }
        )
      );

      await Promise.all(deletePromises);

      toast.success(`${selectedReturns.length} sales return(s) moved to trash.`);
      fetchSalesReturns();
    } catch (error: any) {
      console.error("Failed to delete sales returns:", error);
      toast.error(error.message || "Failed to delete sales returns.");
    }
  };

  const handleViewReturn = (salesReturn: SalesReturn) => {
    setReturnToView(salesReturn);
    setViewModalOpen(true);
  };

  const handleViewPdf = useCallback((salesReturn: SalesReturn) => {
    if (!salesReturn || !salesReturn._id) {
      toast.error("Cannot view PDF. Return data is missing.");
      return;
    }

    const pdfUrl = `/api/return-notes/${salesReturn._id}/pdf`;
    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(salesReturn.returnNumber || "Sales Return");
    setIsModalOpen(true);
  }, []);

  const handleViewInvoicePdf = useCallback((invoice: any) => {
    if (!invoice || !invoice._id) {
      toast.error("Cannot view PDF. Invoice data is missing.");
      return;
    }

    const pdfUrl = `/api/invoices/${invoice._id}/pdf`;
    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(invoice.invoiceNumber || "Invoice");
    setIsModalOpen(true);
  }, []);

  const handleViewCreditNotePdf = useCallback((creditNote: any) => {
    if (!creditNote || !creditNote._id) {
      toast.error("Cannot view PDF. Credit note data is missing.");
      return;
    }
    const pdfUrl = `/api/credit-notes/${creditNote._id}/pdf`;
    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(creditNote.creditNoteNumber || "Credit Note");
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
    () =>
      getColumns(
        handleOpenForm,
        (id: string) => {
          const returnToDelete = salesReturns.find((r) => String(r._id) === id);
          if (returnToDelete) {
            handleDelete([returnToDelete]);
          }
        },
        { canUpdate, canDelete, canUpdateStatus: canUpdate },
        handleViewReturn,
        handleViewPdf,
        fetchSalesReturns,
        handleViewInvoicePdf,
        handleViewCreditNotePdf
      ),
    [salesReturns, canUpdate, canDelete, handleViewPdf, fetchSalesReturns, handleViewInvoicePdf, handleViewCreditNotePdf]
  );

  const { table } = useDataTable<SalesReturn>({
    data: salesReturns,
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
      setUrlState({ sort: sorting as ExtendedColumnSort<SalesReturn>[] });
    },
    onColumnFiltersChange: (filters) => {
      setUrlState({
        filters: filters as ExtendedColumnFilter<SalesReturn>[],
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
    forbidden();
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
                    <h1 className="text-3xl font-bold tracking-tight">Sales Returns</h1>
                    {totalCount > 0 && (
                      <Badge variant="primary" appearance="outline">
                        {totalCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Track product returns from customers
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {canViewTrash && (
                    <Link href="./sales-returns/trash" className="w-full sm:w-auto">
                      <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <Trash2 className="h-4 w-4" />
                        Trash
                      </Button>
                    </Link>
                  )}
                  {canCreate && (
                    <Button
                      onClick={() => handleOpenForm()}
                      className="gap-2 w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4" /> Create Sales Return
                    </Button>
                  )}
                </div>

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
              <div className={cn("transition-opacity duration-200", isInitialLoad ? "opacity-50" : "opacity-100")}>
                {isInitialLoad ? (
                  <Card>
                    <CardContent className="p-6">
                      <DataTableSkeleton columnCount={columns.length} rowCount={10} />
                    </CardContent>
                  </Card>
                ) : salesReturns.length > 0 || (urlState.filters && urlState.filters.length > 0) ? (
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
                      <h3 className="text-lg font-semibold mb-2">No sales returns yet</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        Start tracking product returns by creating your first sales return.
                      </p>
                      {canCreate && (
                        <Button onClick={() => handleOpenForm()} className="gap-2">
                          <Plus className="h-4 w-4" /> Create Sales Return
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {canCreate && (
        <SalesReturnForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedReturn(null);
          }}
          onSubmit={handleFormSubmit}
          defaultValues={selectedReturn}
        />
      )}

      <SalesReturnViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setReturnToView(null);
        }}
        salesReturn={returnToView}
        onViewInvoicePdf={handleViewInvoicePdf}
        onViewCreditNotePdf={handleViewCreditNotePdf}
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

export default function Component() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center">
          <Spinner className="size-10" />
        </div>
      }
    >
      <SalesReturnsPageContent />
    </Suspense>
  );
}