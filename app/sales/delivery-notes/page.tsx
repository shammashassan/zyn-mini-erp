// app/sales/delivery-notes/page.tsx - FIXED: Proper invoice linking in form submission

"use client";

import { useEffect, useState, useMemo, useCallback, Suspense, useRef } from "react";
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
import { DeliveryNoteViewModal } from "./DeliveryNoteViewModal";
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");

  const [isDeliveryFormOpen, setIsDeliveryFormOpen] = useState(false);
  const [selectedDeliveryNote, setSelectedDeliveryNote] = useState<DeliveryNote | null>(null);

  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [deliveryNoteToView, setDeliveryNoteToView] = useState<DeliveryNote | null>(null);

  const [isMounted, setIsMounted] = useState(false);

  const isSubmittingRef = useRef(false);

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

  const fetchDeliveryNotes = useCallback(async (background = false) => {
    if (!canRead) return;
    try {
      if (!background) {
        setIsLoading(true);
      }

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

  useEffect(() => {
    if (isMounted && canRead) {
      fetchDeliveryNotes();
    }
  }, [isMounted, canRead, fetchDeliveryNotes]);

  useEffect(() => {
    const onFocus = () => {
      if (isMounted && canRead) {
        fetchDeliveryNotes(true);
      }
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchDeliveryNotes, isMounted, canRead]);

  const handleOpenForm = (deliveryNote: DeliveryNote | null = null) => {
    if (deliveryNote && !canUpdate) {
      toast.error("You don't have permission to edit delivery notes");
      return;
    }

    if (!deliveryNote && !canCreate) {
      toast.error("You don't have permission to create delivery notes");
      return;
    }

    setSelectedDeliveryNote(deliveryNote);
    setIsDeliveryFormOpen(true);
  };

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

    let pdfUrl = '';

    if (doc.voucherType) {
      pdfUrl = `/api/vouchers/${doc._id}/pdf`;
    } else if (doc.documentType === 'quotation' || (!doc.documentType && doc.invoiceNumber?.startsWith('QUO'))) {
      pdfUrl = `/api/quotations/${doc._id}/pdf`;
    } else if (doc.documentType === 'invoice' || (!doc.documentType && doc.invoiceNumber?.startsWith('INV'))) {
      pdfUrl = `/api/invoices/${doc._id}/pdf`;
    } else {
      pdfUrl = `/api/delivery-notes/${doc._id}/pdf`;
    }

    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(doc.invoiceNumber || "Document");
    setIsModalOpen(true);
  };

  const handleViewDeliveryNote = (deliveryNote: DeliveryNote) => {
    setDeliveryNoteToView(deliveryNote);
    setViewModalOpen(true);
  };

  const handleDeliveryNoteFormSubmit = async (data: any, id?: string) => {
    if (isSubmittingRef.current) return;

    if (id && !canUpdate) {
      toast.error("You don't have permission to update delivery notes");
      return;
    }
    if (!id && !canCreate) {
      toast.error("You don't have permission to create delivery notes");
      return;
    }

    isSubmittingRef.current = true;

    try {
      const url = id ? `/api/delivery-notes/${id}` : "/api/delivery-notes";
      const method = id ? "PUT" : "POST";

      // ✅ FIXED: Properly format the payload
      let payload;
      
      if (id) {
        // Edit mode - just send the updates
        payload = data;
      } else {
        // Create mode - ensure proper structure
        payload = {
          ...data,
          connectedDocuments: {
            // ✅ CRITICAL: Send invoiceId (singular) for the API to process
            invoiceId: data.connectedDocuments?.invoiceId || null
          }
        };
        
        console.log('📤 Submitting delivery note with payload:', JSON.stringify(payload, null, 2));
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || `Failed to ${id ? 'update' : 'create'} delivery note.`);
        return;
      }

      const savedDeliveryNote = result.deliveryNote || result;
      const deliveryNoteNumber = savedDeliveryNote.invoiceNumber;

      console.log('✅ Delivery note saved:', savedDeliveryNote);

      setIsDeliveryFormOpen(false);
      setSelectedDeliveryNote(null);

      fetchDeliveryNotes();

      toast.success(`Delivery Note ${deliveryNoteNumber} ${id ? 'updated' : 'created'} successfully!`);

      // Show view modal
      setDeliveryNoteToView(savedDeliveryNote);
      setViewModalOpen(true);

      // Auto-open PDF viewer if it's a new delivery note
      if (!id) {
        setSelectedPdfUrl(`/api/delivery-notes/${savedDeliveryNote._id}/pdf`);
        setSelectedPdfTitle(deliveryNoteNumber || "Delivery Note");
        setIsModalOpen(true);
      }

    } catch (error) {
      console.error("Error saving delivery note:", error);
      toast.error("An error occurred while saving delivery note.");
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
    (noteOrId: DeliveryNote | string) => {
      const id = typeof noteOrId === 'object' ? noteOrId._id : noteOrId;
      const noteToDelete = deliveryNotes.find((n: DeliveryNote) => n._id === id);
      if (noteToDelete) {
        handleDelete([noteToDelete]);
      }
    },
    { canDelete, canUpdate },
    fetchDeliveryNotes,
    handleOpenForm,
    handleViewDeliveryNote
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

              <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
                
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
                      onClick={() => handleOpenForm()}
                      className="gap-2 w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4" />
                      New Delivery Note
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
                      <Button onClick={() => handleOpenForm()} className="gap-2">
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
        onClose={() => {
          setIsDeliveryFormOpen(false);
          setSelectedDeliveryNote(null);
        }}
        onSubmit={(data) => handleDeliveryNoteFormSubmit(data, selectedDeliveryNote?._id)}
        defaultValues={selectedDeliveryNote}
      />

      <PDFViewerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pdfUrl={selectedPdfUrl}
        title={selectedPdfTitle}
      />

      <DeliveryNoteViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setDeliveryNoteToView(null);
        }}
        deliveryNote={deliveryNoteToView}
        onViewPdf={handleViewPdf}
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