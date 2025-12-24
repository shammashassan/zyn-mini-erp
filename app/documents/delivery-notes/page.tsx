// app/documents/delivery-notes/page.tsx - UPDATED: Enabled Silent Background Fetch on Focus

"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useQueryStates, parseAsInteger } from "nuqs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getColumns, type DeliveryNote } from "./columns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { DeliveryNoteForm } from "./delivery-note-form";
import { toast } from "sonner";
import { Truck, Trash2, Plus, CalendarIcon } from "lucide-react";
import Link from "next/link";
import { useDeliveryNotePermissions } from "@/hooks/use-permissions";
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

function DeliveryNotesPageContent() {
  const [deliveryNotes, setDeliveryNotes] = useState<DeliveryNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // PDF Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");

  // Form Modal State
  const [isDeliveryFormOpen, setIsDeliveryFormOpen] = useState(false);

  const [isMounted, setIsMounted] = useState(false);

  // Date Range State (Default 6 months)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date()),
  });

  const {
    permissions: {
      canRead,
      canCreate,
      canDelete,
      canViewTrash,
      canUpdate
    },
    isPending,
  } = useDeliveryNotePermissions();

  const [urlState, setUrlState] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(10),
    sort: getSortingStateParser<DeliveryNote>().withDefault([]),
    filters: getFiltersStateParser<DeliveryNote>().withDefault([]),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ UPDATED: Added 'background' param. If true, skips loading state (silent fetch).
  const fetchDeliveryNotes = useCallback(async (background = false) => {
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

      const res = await fetch(`/api/delivery-notes?${params.toString()}`);

      if (!res.ok) throw new Error("Failed to fetch delivery notes");

      const result = await res.json();

      if (result.data && result.pageCount !== undefined) {
        setDeliveryNotes(result.data);
        setPageCount(result.pageCount);
        setTotalCount(result.totalCount);
      } else {
        setDeliveryNotes(result);
      }
    } catch (error) {
      if (!background) {
        toast.error("Could not load delivery notes.");
      }
    } finally {
      if (!background) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  }, [canRead, urlState.page, urlState.pageSize, urlState.sort, urlState.filters, dateRange]);

  // Standard fetch on dependency change (loading state visible)
  useEffect(() => {
    if (isMounted && canRead) {
      fetchDeliveryNotes();
    }
  }, [isMounted, canRead, fetchDeliveryNotes]);

  // ✅ NEW: Window Focus Listener - SILENT MODE
  // This triggers a background fetch (true) when you tab back to this page.
  // The table will NOT fade out or show a spinner.
  useEffect(() => {
    const onFocus = () => {
      if (isMounted && canRead) {
        fetchDeliveryNotes(true); // Pass true for silent background fetch
      }
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchDeliveryNotes, isMounted, canRead]);

  const handleDelete = async (selectedDeliveryNotes: DeliveryNote[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete delivery notes");
      return;
    }

    try {
      const deletePromises = selectedDeliveryNotes.map((note) =>
        fetch(`/api/delivery-notes/${note._id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      toast.success(
        `${selectedDeliveryNotes.length} ${selectedDeliveryNotes.length === 1 ? 'delivery note' : 'delivery notes'} moved to trash.`,
      );

      fetchDeliveryNotes();
    } catch (error) {
      console.error('Failed to delete delivery notes:', error);
      toast.error('Failed to delete delivery notes.');
    }
  };

  const handleViewPdf = (doc: any) => {
    if (!doc || !doc._id) {
      toast.error("Cannot view PDF. Document data is missing.");
      return;
    }

    // ✅ Route to correct endpoint based on document type
    let pdfUrl = '';

    if (doc.voucherType) {
      pdfUrl = `/api/vouchers/${doc._id}/pdf`;
    } else if (doc.documentType === 'quotation' || (!doc.documentType && doc.invoiceNumber?.startsWith('QUO'))) {
      pdfUrl = `/api/quotations/${doc._id}/pdf`;
    } else if (doc.documentType === 'invoice' || (!doc.documentType && doc.invoiceNumber?.startsWith('INV'))) {
      pdfUrl = `/api/invoices/${doc._id}/pdf`;
    } else {
      // Default to delivery notes
      pdfUrl = `/api/delivery-notes/${doc._id}/pdf`;
    }

    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(doc.invoiceNumber || "Document");
    setIsModalOpen(true);
  };

  const handleDeliveryNoteFormSubmit = async (data: any) => {
    if (!canCreate) {
      toast.error("You don't have permission to create delivery notes");
      return;
    }

    try {
      const payload = {
        ...data,
        connectedDocuments: {
          invoiceIds: data.connectedDocuments?.invoiceId ? [data.connectedDocuments.invoiceId] : []
        }
      };

      const res = await fetch("/api/delivery-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || "Failed to create delivery note.");
        return;
      }

      const newDeliveryNoteId = result.deliveryNote._id;
      const deliveryNoteNumber = result.deliveryNote.invoiceNumber;
      const invoiceId = data.connectedDocuments?.invoiceId;

      if (invoiceId) {
        try {
          await fetch(`/api/invoices/${invoiceId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              "connectedDocuments.deliveryId": newDeliveryNoteId,
            }),
          });
        } catch (error) {
          console.error("Failed to update invoice:", error);
        }
      }

      // Close Form Modal
      setIsDeliveryFormOpen(false);

      // Refresh Data
      fetchDeliveryNotes();

      // Show Success Toast
      toast.success(`Delivery Note ${deliveryNoteNumber} created successfully!`);

      // ✅ AUTOMATICALLY OPEN PDF VIEWER
      setSelectedPdfUrl(`/api/delivery-notes/${newDeliveryNoteId}/pdf`);
      setSelectedPdfTitle(deliveryNoteNumber || "Delivery Note");
      setIsModalOpen(true);

    } catch (error) {
      console.error("Error creating delivery note:", error);
      toast.error("An error occurred while creating delivery note.");
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
    (noteOrId: DeliveryNote | string) => {
      const id = typeof noteOrId === 'object' ? noteOrId._id : noteOrId;
      const noteToDelete = deliveryNotes.find((n: DeliveryNote) => n._id === id);
      if (noteToDelete) {
        handleDelete([noteToDelete]);
      }
    },
    { canDelete, canUpdate },
    fetchDeliveryNotes
  ), [deliveryNotes, canDelete, canUpdate]);

  const { table } = useDataTable<DeliveryNote>({
    data: deliveryNotes,
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
      setUrlState({ sort: sorting as ExtendedColumnSort<DeliveryNote>[] });
    },
    onColumnFiltersChange: (filters) => {
      setUrlState({
        filters: filters as ExtendedColumnFilter<DeliveryNote>[],
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
    return <AccessDenied />;
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
                  <Truck className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Delivery Notes</h1>
                    {totalCount > 0 && (
                      <Badge variant="primary" appearance="outline">
                        {totalCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Track product deliveries and shipments to customers
                  </p>
                </div>
              </div>

              {/* Right: Actions & Filters Group */}
              <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
                
                {/* Row 1: Actions */}
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {canViewTrash && (
                    <Link href="./delivery-notes/trash" className="w-full sm:w-auto">
                      <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <Trash2 className="h-4 w-4" />
                        Trash
                      </Button>
                    </Link>
                  )}
                  {canCreate && (
                    <Button
                      onClick={() => setIsDeliveryFormOpen(true)}
                      className="gap-2 w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4" />
                      New Delivery Note
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
                    <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                      <DataTable table={table}>
                        <DataTableToolbar table={table} />
                      </DataTable>
                    </div>
                  )}
                </CardContent>
              </Card>

              {deliveryNotes.length === 0 && !isLoading && !isInitialLoad && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No delivery notes yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Delivery notes will appear here once created
                    </p>
                    {canCreate && (
                      <Button onClick={() => setIsDeliveryFormOpen(true)} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Delivery Note
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <DeliveryNoteForm
        isOpen={isDeliveryFormOpen}
        onClose={() => setIsDeliveryFormOpen(false)}
        onSubmit={handleDeliveryNoteFormSubmit}
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
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10" />
      </div>
    }>
      <DeliveryNotesPageContent />
    </Suspense>
  );
}