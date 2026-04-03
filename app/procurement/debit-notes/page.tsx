// app/procurement/debit-notes/page.tsx - UPDATED: Proper PDF handler naming

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { toast } from "sonner";
import { FileText, Plus, Trash2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { DebitNoteForm } from "./debit-note-form";
import { getColumns, type DebitNote } from "./columns";
import { DebitNoteViewModal } from "./DebitNoteViewModal";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { CreateReceiptModal } from "./CreateReceiptModal";
import Link from "next/link";
import { useDebitNotePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
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

function DebitNotesPageContent() {
  const pathname = usePathname();
  const [debitNotes, setDebitNotes] = useState<DebitNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedDebitNote, setSelectedDebitNote] = useState<DebitNote | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [debitNoteToView, setDebitNoteToView] = useState<DebitNote | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [debitNoteForReceipt, setDebitNoteForReceipt] = useState<DebitNote | null>(null);

  // Date Range State (Default 6 months)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date()),
  });

  // Ref to prevent double submission
  const isSubmittingRef = useRef(false);

  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  const [urlState, setUrlState] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(10),
    sort: getSortingStateParser<DebitNote>().withDefault([{ id: "debitDate", desc: true }]),
    filters: getFiltersStateParser<DebitNote>().withDefault([]),
  });

  const {
    permissions: {
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      canViewTrash,
      canUpdateStatus,
      canCreateReceipt,
    },
    session,
    isPending,
  } = useDebitNotePermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Fetch debit notes with optional background mode
  const fetchDebitNotes = useCallback(
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
        });

        // Add Date Range to params
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

        const res = await fetch(`/api/debit-notes?${params.toString()}`);

        if (res.status === 403) {
          if (!background) toast.error("You don't have permission to view debit notes");
          return;
        }

        if (!res.ok) throw new Error("Failed to fetch debit notes");

        const result = await res.json();

        if (result.data && result.pageCount !== undefined) {
          setDebitNotes(result.data);
          setPageCount(result.pageCount);
          setTotalCount(result.totalCount);
        } else {
          setDebitNotes(result);
        }
      } catch (error) {
        if (!background) {
          toast.error("Could not load debit notes.");
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

  // Standard fetch on dependency change
  useEffect(() => {
    if (session && canRead) {
      fetchDebitNotes();
    } else if (session && !canRead) {
      toast.error("You don't have permission to view debit notes", {
        description: "Only authorized users can access this page",
      });
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [canRead, fetchDebitNotes, session]);

  // Window Focus Listener - SILENT MODE
  useEffect(() => {
    const onFocus = () => {
      if (session && canRead) {
        fetchDebitNotes(true);
      }
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchDebitNotes, session, canRead]);

  const handleOpenForm = (debitNote: DebitNote | null = null) => {
    if (debitNote && !canUpdate) {
      toast.error("You don't have permission to edit debit notes");
      return;
    }

    if (debitNote && debitNote.status !== "pending") {
      toast.error("Cannot edit debit note", {
        description: "Only pending debit notes can be edited.",
      });
      return;
    }

    if (!debitNote && !canCreate) {
      toast.error("You don't have permission to create debit notes");
      return;
    }

    setSelectedDebitNote(debitNote);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: any, id?: string) => {
    if (isSubmittingRef.current) return;

    if (id && !canUpdate) {
      toast.error("You don't have permission to update debit notes");
      return;
    }
    if (!id && !canCreate) {
      toast.error("You don't have permission to create debit notes");
      return;
    }

    isSubmittingRef.current = true;

    const url = id ? `/api/debit-notes/${id}` : "/api/debit-notes";
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
        throw new Error(result.error || result.message || "Failed to save debit note");
      }

      toast.success(`Debit note ${id ? "updated" : "created"} successfully.`);
      fetchDebitNotes();
      setIsFormOpen(false);
      setSelectedDebitNote(null);

      const savedDebitNote = result.debitNote || result;

      // Automatically open PDF viewer
      setSelectedPdfUrl(`/api/debit-notes/${savedDebitNote._id}/pdf`);
      setSelectedPdfTitle(savedDebitNote.debitNoteNumber || "Debit Note");
      setIsModalOpen(true);
    } catch (error: any) {
      toast.error(error.message || `Failed to ${id ? "update" : "create"} debit note.`);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleDelete = async (selectedDebitNotes: DebitNote[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete debit notes");
      return;
    }

    try {
      const deletePromises = selectedDebitNotes.map((debitNote) =>
        fetch(`/api/debit-notes/${debitNote._id}`, { method: "DELETE" }).then(
          async (res) => {
            if (res.status === 403) {
              throw new Error("You don't have permission to delete debit notes");
            }
            if (!res.ok) throw new Error("Failed to delete");
            return res.json();
          }
        )
      );

      await Promise.all(deletePromises);

      toast.success(`${selectedDebitNotes.length} debit note(s) moved to trash.`);
      fetchDebitNotes();
    } catch (error: any) {
      console.error("Failed to delete debit notes:", error);
      toast.error(error.message || "Failed to delete debit notes.");
    }
  };

  const handleViewDebitNote = (debitNote: DebitNote) => {
    setDebitNoteToView(debitNote);
    setViewModalOpen(true);
  };

  const handleViewPdf = useCallback((debitNote: DebitNote) => {
    if (!debitNote || !debitNote._id) {
      toast.error("Cannot view PDF. Debit note data is missing.");
      return;
    }

    const pdfUrl = `/api/debit-notes/${debitNote._id}/pdf`;
    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(debitNote.debitNoteNumber || "Debit Note");
    setIsModalOpen(true);
  }, []);

  // Handler for viewing receipt PDFs from connected documents
  const handleViewReceiptPdf = useCallback((receipt: any) => {
    if (!receipt || !receipt._id) {
      toast.error("Cannot view PDF. Receipt data is missing.");
      return;
    }

    const pdfUrl = `/api/vouchers/${receipt._id}/pdf`;
    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(receipt.invoiceNumber || "Receipt");
    setIsModalOpen(true);
  }, []);

  // NEW: Handler for viewing return note PDFs
  const handleViewReturnNotePdf = useCallback((returnNote: any) => {
    if (!returnNote || !returnNote._id) {
      toast.error("Cannot view PDF. Return note data is missing.");
      return;
    }
    const pdfUrl = `/api/return-notes/${returnNote._id}/pdf`;
    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(returnNote.returnNumber || "Return Note");
    setIsModalOpen(true);
  }, []);

  const handleCreateReceipt = (debitNote: DebitNote) => {
    if (!canCreateReceipt) {
      toast.error("You don't have permission to create receipts");
      return;
    }

    if (debitNote.status !== "approved") {
      toast.error("Can only create receipts for approved debit notes");
      return;
    }

    if (debitNote.paymentStatus === "paid") {
      toast.error("This debit note has already been fully paid");
      return;
    }

    setDebitNoteForReceipt(debitNote);
    setIsReceiptModalOpen(true);
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

  const columns = useMemo(
    () =>
      getColumns(
        handleOpenForm,
        (id: string) => {
          const debitNoteToDelete = debitNotes.find((d) => String(d._id) === id);
          if (debitNoteToDelete) {
            handleDelete([debitNoteToDelete]);
          }
        },
        { canUpdate, canDelete, canUpdateStatus, canCreateReceipt },
        handleViewDebitNote,
        handleViewPdf,
        fetchDebitNotes,
        handleViewReceiptPdf,
        handleViewReturnNotePdf // NEW: For return notes
      ),
    [debitNotes, canUpdate, canDelete, canUpdateStatus, canCreateReceipt, handleViewPdf, fetchDebitNotes, handleViewReceiptPdf, handleViewReturnNotePdf]
  );

  const { table } = useDataTable<DebitNote>({
    data: debitNotes,
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
      setUrlState({ sort: sorting as ExtendedColumnSort<DebitNote>[] });
    },
    onColumnFiltersChange: (filters) => {
      setUrlState({
        filters: filters as ExtendedColumnFilter<DebitNote>[],
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
              {/* Left: Title */}
              <div className="flex items-center gap-3 self-start lg:self-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Debit Notes</h1>
                    {totalCount > 0 && (
                      <Badge variant="primary" appearance="outline">
                        {totalCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Track supplier debit notes and payment refunds
                  </p>
                </div>
              </div>

              {/* Right: Actions & Filters Group */}
              <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
                {/* Row 1: Actions */}
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {canViewTrash && (
                    <Link href="./debit-notes/trash" className="w-full sm:w-auto">
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
                      <Plus className="h-4 w-4" /> Create Debit Note
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
                    <DataTableSkeleton columnCount={columns.length} rowCount={10} />
                  ) : (
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
                  )}
                </CardContent>
              </Card>

              {/* Empty State */}
              {debitNotes.length === 0 && !isInitialLoad && !isLoading && canCreate && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No debit notes yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Start tracking debit notes by creating your first one.
                    </p>
                    <Button onClick={() => handleOpenForm()} className="gap-2">
                      <Plus className="h-4 w-4" /> Create Debit Note
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {canCreate && (
        <DebitNoteForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedDebitNote(null);
          }}
          onSubmit={handleFormSubmit}
          defaultValues={selectedDebitNote}
        />
      )}

      <DebitNoteViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setDebitNoteToView(null);
        }}
        debitNote={debitNoteToView}
        onCreateReceipt={handleCreateReceipt}
        canCreateReceipt={canCreateReceipt}
        onViewReceiptPdf={handleViewReceiptPdf}
        onViewReturnNotePdf={handleViewReturnNotePdf}
      />

      <PDFViewerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pdfUrl={selectedPdfUrl}
        title={selectedPdfTitle}
      />

      {canCreateReceipt && debitNoteForReceipt && (
        <CreateReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => {
            setIsReceiptModalOpen(false);
            setDebitNoteForReceipt(null);
          }}
          debitNote={debitNoteForReceipt}
          onRefresh={fetchDebitNotes}
        />
      )}
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
      <DebitNotesPageContent />
    </Suspense>
  );
}