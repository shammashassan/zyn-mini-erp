// app/documents/quotations/page.tsx - UPDATED: Added Edit functionality

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQueryStates, parseAsInteger } from "nuqs";
import { toast } from "sonner";
import { FileClock, Plus, Trash2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { getColumns, type Quotation } from "./columns";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { QuotationForm } from "./quotation-form";
import Link from "next/link";
import { useQuotationPermissions } from "@/hooks/use-permissions";
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

export default function QuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");
  const [isQuotationFormOpen, setIsQuotationFormOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Date Range State (Default 6 months)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date()),
  });

  // Ref to prevent double submission
  const isSubmittingRef = useRef(false);

  const {
    permissions: {
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      canViewTrash,
      canUpdateStatus,
      canCreateInvoice
    },
    isPending,
  } = useQuotationPermissions();

  const [urlState, setUrlState] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(10),
    sort: getSortingStateParser<Quotation>().withDefault([]),
    filters: getFiltersStateParser<Quotation>().withDefault([]),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchQuotations = useCallback(async () => {
    if (!canRead) return;
    try {
      setIsLoading(true);

      const params = new URLSearchParams({
        page: urlState.page.toString(),
        pageSize: urlState.pageSize.toString(),
        populate: 'true',
      });

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

      const res = await fetch(`/api/quotations?${params.toString()}`);

      if (!res.ok) throw new Error("Failed to fetch quotations");

      const result = await res.json();

      if (result.data && result.pageCount !== undefined) {
        setQuotations(result.data);
        setPageCount(result.pageCount);
        setTotalCount(result.totalCount);
      } else {
        setQuotations(result);
      }
    } catch (error) {
      toast.error("Could not load quotations.");
    } finally {
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [canRead, urlState.page, urlState.pageSize, urlState.sort, urlState.filters, dateRange]);

  useEffect(() => {
    if (isMounted && canRead) {
      fetchQuotations();
    }
  }, [isMounted, canRead, fetchQuotations]);

  const handleOpenForm = (quotation: Quotation | null = null) => {
    if (quotation && !canUpdate) {
      toast.error("You don't have permission to edit quotations");
      return;
    }

    // Prevent editing if status is not "pending"
    if (quotation && quotation.status !== 'pending') {
      toast.error("Cannot edit quotation", {
        description: "Only quotations with 'pending' status can be edited. Approved/cancelled quotations affect business records."
      });
      return;
    }

    if (!quotation && !canCreate) {
      toast.error("You don't have permission to create quotations");
      return;
    }

    setSelectedQuotation(quotation);
    setIsQuotationFormOpen(true);
  };

  const handleDelete = async (selectedQuotations: Quotation[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete quotations");
      return;
    }

    try {
      const deletePromises = selectedQuotations.map((quotation) =>
        fetch(`/api/quotations/${quotation._id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      toast.success(
        `${selectedQuotations.length} ${selectedQuotations.length === 1 ? 'quotation' : 'quotations'} moved to trash.`,
      );

      fetchQuotations();
    } catch (error) {
      console.error('Failed to delete quotations:', error);
      toast.error('Failed to delete quotations.');
    }
  };

  const handleViewPdf = (doc: any) => {
    if (!doc || !doc._id) {
      toast.error("Cannot view PDF. Document data is missing.");
      return;
    }

    const isInvoice = doc.documentType === 'invoice' || (doc.invoiceNumber && doc.invoiceNumber.startsWith('INV'));
    const endpoint = isInvoice ? 'invoices' : 'quotations';

    setSelectedPdfUrl(`/api/${endpoint}/${doc._id}/pdf`);
    setSelectedPdfTitle(doc.invoiceNumber || (isInvoice ? "Invoice" : "Quotation"));
    setIsModalOpen(true);
  };

  const handleQuotationFormSubmit = async (data: any, id?: string) => {
    if (isSubmittingRef.current) return;

    if (id && !canUpdate) {
      toast.error("You don't have permission to update quotations");
      return;
    }

    if (!id && !canCreate) {
      toast.error("You don't have permission to create quotations");
      return;
    }

    isSubmittingRef.current = true;

    const url = id ? `/api/quotations/${id}` : "/api/quotations";
    const method = id ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (res.ok) {
        const quotation = id ? result : result.quotation;
        toast.success(`Quotation ${quotation.invoiceNumber} ${id ? "updated" : "created"}!`);
        setIsQuotationFormOpen(false);
        setSelectedQuotation(null);
        fetchQuotations();
        
        // Automatically open PDF viewer
        setSelectedPdfUrl(`/api/quotations/${quotation._id}/pdf`);
        setSelectedPdfTitle(quotation.invoiceNumber || "Quotation");
        setIsModalOpen(true);
      } else {
        toast.error(result.error || `Failed to ${id ? "update" : "create"} quotation.`);
      }
    } catch (error) {
      console.error(`Error ${id ? "updating" : "creating"} quotation:`, error);
      toast.error(`An error occurred while ${id ? "updating" : "creating"} quotation.`);
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
    handleOpenForm,
    (id: string) => {
      const quotationToDelete = quotations.find((q: Quotation) => q._id === id);
      if (quotationToDelete) {
        handleDelete([quotationToDelete]);
      }
    },
    { canDelete, canUpdate, canUpdateStatus, canCreateInvoice },
    fetchQuotations
  ), [quotations, canDelete, canUpdate, canUpdateStatus, canCreateInvoice]);

  const { table } = useDataTable<Quotation>({
    data: quotations,
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
      setUrlState({ sort: sorting as ExtendedColumnSort<Quotation>[] });
    },
    onColumnFiltersChange: (filters) => {
      setUrlState({
        filters: filters as ExtendedColumnFilter<Quotation>[],
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
                  <FileClock className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
                    {totalCount > 0 && (
                      <Badge variant="primary" appearance="outline">
                        {totalCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Create and manage sales quotations for customers
                  </p>
                </div>
              </div>

              {/* Right: Actions & Filters Group */}
              <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
                
                {/* Row 1: Actions */}
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {canViewTrash && (
                    <Link href="./quotations/trash" className="w-full sm:w-auto">
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
                      <Plus className="h-4 w-4" />
                      New Quotation
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
              <Card>
                <CardContent className="p-6">
                  {isInitialLoad ? (
                    <DataTableSkeleton
                      columnCount={columns.length}
                      rowCount={10}
                    />
                  ) : (
                    <div className={isLoading ? "opacity-50 pointer-events-none transition-opacity" : ""}>
                      <DataTable table={table}>
                        <DataTableToolbar table={table} />
                      </DataTable>
                    </div>
                  )}
                </CardContent>
              </Card>

              {quotations.length === 0 && !isLoading && !isInitialLoad && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileClock className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No quotations yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create your first quotation from the billing page
                    </p>
                    {canCreate && (
                      <Button onClick={() => handleOpenForm()} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Quotation
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <QuotationForm
        isOpen={isQuotationFormOpen}
        onClose={() => {
          setIsQuotationFormOpen(false);
          setSelectedQuotation(null);
        }}
        onSubmit={handleQuotationFormSubmit}
        defaultValues={selectedQuotation}
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