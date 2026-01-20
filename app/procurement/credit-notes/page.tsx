// app/procurement/credit-notes/page.tsx - UPDATED: Proper PDF handlers

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
import { CreditNoteForm } from "./credit-note-form";
import { getColumns, type CreditNote } from "./columns";
import { CreditNoteViewModal } from "./CreditNoteViewModal";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { CreatePaymentModal } from "./CreatePaymentModal";
import Link from "next/link";
import { useCreditNotePermissions } from "@/hooks/use-permissions";
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

function CreditNotesPageContent() {
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNote | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [creditNoteToView, setCreditNoteToView] = useState<CreditNote | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [creditNoteForPayment, setCreditNoteForPayment] = useState<CreditNote | null>(null);

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
    sort: getSortingStateParser<CreditNote>().withDefault([{ id: "creditDate", desc: true }]),
    filters: getFiltersStateParser<CreditNote>().withDefault([]),
  });

  const {
    permissions: {
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      canViewTrash,
      canUpdateStatus,
      canCreatePayment,
    },
    session,
    isPending,
  } = useCreditNotePermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchCreditNotes = useCallback(
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

        const res = await fetch(`/api/credit-notes?${params.toString()}`);

        if (res.status === 403) {
          if (!background) toast.error("You don't have permission to view credit notes");
          return;
        }

        if (!res.ok) throw new Error("Failed to fetch credit notes");

        const result = await res.json();

        if (result.data && result.pageCount !== undefined) {
          setCreditNotes(result.data);
          setPageCount(result.pageCount);
          setTotalCount(result.totalCount);
        } else {
          setCreditNotes(result);
        }
      } catch (error) {
        if (!background) {
          toast.error("Could not load credit notes.");
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
      fetchCreditNotes();
    } else if (session && !canRead) {
      toast.error("You don't have permission to view credit notes", {
        description: "Only authorized users can access this page",
      });
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [canRead, fetchCreditNotes, session]);

  useEffect(() => {
    const onFocus = () => {
      if (session && canRead) {
        fetchCreditNotes(true);
      }
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchCreditNotes, session, canRead]);

  const handleOpenForm = (creditNote: CreditNote | null = null) => {
    if (creditNote && !canUpdate) {
      toast.error("You don't have permission to edit credit notes");
      return;
    }

    if (creditNote && creditNote.status !== "pending") {
      toast.error("Cannot edit credit note", {
        description: "Only pending credit notes can be edited.",
      });
      return;
    }

    if (!creditNote && !canCreate) {
      toast.error("You don't have permission to create credit notes");
      return;
    }

    setSelectedCreditNote(creditNote);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: any, id?: string) => {
    if (isSubmittingRef.current) return;

    if (id && !canUpdate) {
      toast.error("You don't have permission to update credit notes");
      return;
    }
    if (!id && !canCreate) {
      toast.error("You don't have permission to create credit notes");
      return;
    }

    isSubmittingRef.current = true;

    const url = id ? `/api/credit-notes/${id}` : "/api/credit-notes";
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
        throw new Error(result.error || result.message || "Failed to save credit note");
      }

      toast.success(`Credit note ${id ? "updated" : "created"} successfully.`);
      fetchCreditNotes();
      setIsFormOpen(false);
      setSelectedCreditNote(null);

      const savedCreditNote = result.creditNote || result;

      setSelectedPdfUrl(`/api/credit-notes/${savedCreditNote._id}/pdf`);
      setSelectedPdfTitle(savedCreditNote.creditNoteNumber || "Credit Note");
      setIsModalOpen(true);
    } catch (error: any) {
      toast.error(error.message || `Failed to ${id ? "update" : "create"} credit note.`);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleDelete = async (selectedCreditNotes: CreditNote[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete credit notes");
      return;
    }

    try {
      const deletePromises = selectedCreditNotes.map((creditNote) =>
        fetch(`/api/credit-notes/${creditNote._id}`, { method: "DELETE" }).then(
          async (res) => {
            if (res.status === 403) {
              throw new Error("You don't have permission to delete credit notes");
            }
            if (!res.ok) throw new Error("Failed to delete");
            return res.json();
          }
        )
      );

      await Promise.all(deletePromises);

      toast.success(`${selectedCreditNotes.length} credit note(s) moved to trash.`);
      fetchCreditNotes();
    } catch (error: any) {
      console.error("Failed to delete credit notes:", error);
      toast.error(error.message || "Failed to delete credit notes.");
    }
  };

  const handleViewCreditNote = (creditNote: CreditNote) => {
    setCreditNoteToView(creditNote);
    setViewModalOpen(true);
  };

  const handleViewPdf = useCallback((creditNote: CreditNote) => {
    if (!creditNote || !creditNote._id) {
      toast.error("Cannot view PDF. Credit note data is missing.");
      return;
    }

    const pdfUrl = `/api/credit-notes/${creditNote._id}/pdf`;
    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(creditNote.creditNoteNumber || "Credit Note");
    setIsModalOpen(true);
  }, []);

  const handleViewPaymentPdf = useCallback((payment: any) => {
    if (!payment || !payment._id) {
      toast.error("Cannot view PDF. Payment data is missing.");
      return;
    }

    const pdfUrl = `/api/vouchers/${payment._id}/pdf`;
    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(payment.invoiceNumber || "Payment");
    setIsModalOpen(true);
  }, []);

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

  const handleCreatePayment = (creditNote: CreditNote) => {
    if (!canCreatePayment) {
      toast.error("You don't have permission to create payments");
      return;
    }

    if (creditNote.status !== "approved") {
      toast.error("Can only create payments for approved credit notes");
      return;
    }

    if (creditNote.paymentStatus === "paid") {
      toast.error("This credit note has already been fully paid");
      return;
    }

    setCreditNoteForPayment(creditNote);
    setIsPaymentModalOpen(true);
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
          const creditNoteToDelete = creditNotes.find((c) => String(c._id) === id);
          if (creditNoteToDelete) {
            handleDelete([creditNoteToDelete]);
          }
        },
        { canUpdate, canDelete, canUpdateStatus, canCreatePayment },
        handleViewCreditNote,
        handleViewPdf,
        fetchCreditNotes,
        handleViewPaymentPdf,
        handleViewReturnNotePdf
      ),
    [creditNotes, canUpdate, canDelete, canUpdateStatus, canCreatePayment, handleViewPdf, fetchCreditNotes, handleViewPaymentPdf, handleViewReturnNotePdf]
  );

  const { table } = useDataTable<CreditNote>({
    data: creditNotes,
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
      setUrlState({ sort: sorting as ExtendedColumnSort<CreditNote>[] });
    },
    onColumnFiltersChange: (filters) => {
      setUrlState({
        filters: filters as ExtendedColumnFilter<CreditNote>[],
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
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Credit Notes</h1>
                    {totalCount > 0 && (
                      <Badge variant="primary" appearance="outline">
                        {totalCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Track customer credit notes and payment refunds
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {canViewTrash && (
                    <Link href="./credit-notes/trash" className="w-full sm:w-auto">
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
                      <Plus className="h-4 w-4" /> Create Credit Note
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

              {creditNotes.length === 0 && !isInitialLoad && !isLoading && canCreate && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No credit notes yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Start tracking credit notes by creating your first one.
                    </p>
                    <Button onClick={() => handleOpenForm()} className="gap-2">
                      <Plus className="h-4 w-4" /> Create Credit Note
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {canCreate && (
        <CreditNoteForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedCreditNote(null);
          }}
          onSubmit={handleFormSubmit}
          defaultValues={selectedCreditNote}
        />
      )}

      <CreditNoteViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setCreditNoteToView(null);
        }}
        creditNote={creditNoteToView}
        onCreatePayment={handleCreatePayment}
        canCreatePayment={canCreatePayment}
        onViewPaymentPdf={handleViewPaymentPdf}
        onViewReturnNotePdf={handleViewReturnNotePdf}
      />

      <PDFViewerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pdfUrl={selectedPdfUrl}
        title={selectedPdfTitle}
      />

      {canCreatePayment && creditNoteForPayment && (
        <CreatePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => {
            setIsPaymentModalOpen(false);
            setCreditNoteForPayment(null);
          }}
          creditNote={creditNoteForPayment}
          onRefresh={fetchCreditNotes}
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
      <CreditNotesPageContent />
    </Suspense>
  );
}