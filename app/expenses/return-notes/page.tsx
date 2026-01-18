// app/expenses/return-notes/page.tsx - COMPLETE: Multi-Type Support with Invoice & Credit Note Viewing

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { toast } from "sonner";
import { PackageX, Plus, Trash2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { ReturnNoteForm } from "./return-note-form";
import { getColumns, type ReturnNote } from "./columns";
import { ReturnNoteViewModal } from "./ReturnNoteViewModal";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { PurchaseViewModal } from "@/app/expenses/purchases/PurchaseViewModal";
import Link from "next/link";
import { useReturnNotePermissions } from "@/hooks/use-permissions";
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

function ReturnNotesPageContent() {
  const [returnNotes, setReturnNotes] = useState<ReturnNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReturnNote, setSelectedReturnNote] = useState<ReturnNote | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [returnNoteToView, setReturnNoteToView] = useState<ReturnNote | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");

  // Purchase View Modal States
  const [purchaseViewModalOpen, setPurchaseViewModalOpen] = useState(false);
  const [purchaseToView, setPurchaseToView] = useState<any | null>(null);

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
    sort: getSortingStateParser<ReturnNote>().withDefault([{ id: "returnDate", desc: true }]),
    filters: getFiltersStateParser<ReturnNote>().withDefault([]),
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

  // Fetch return notes with optional background mode
  const fetchReturnNotes = useCallback(
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

        const res = await fetch(`/api/return-notes?${params.toString()}`);

        if (res.status === 403) {
          if (!background) toast.error("You don't have permission to view return notes");
          return;
        }

        if (!res.ok) throw new Error("Failed to fetch return notes");

        const result = await res.json();

        if (result.data && result.pageCount !== undefined) {
          setReturnNotes(result.data);
          setPageCount(result.pageCount);
          setTotalCount(result.totalCount);
        } else {
          setReturnNotes(result);
        }
      } catch (error) {
        if (!background) {
          toast.error("Could not load return notes.");
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
      fetchReturnNotes();
    } else if (session && !canRead) {
      toast.error("You don't have permission to view return notes", {
        description: "Only authorized users can access this page",
      });
      setIsLoading(false);
      setIsInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead, fetchReturnNotes]);

  // Window Focus Listener - SILENT MODE
  useEffect(() => {
    const onFocus = () => {
      if (session && canRead) {
        fetchReturnNotes(true);
      }
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchReturnNotes, session, canRead]);

  const handleOpenForm = (returnNote: ReturnNote | null = null) => {
    if (returnNote && !canUpdate) {
      toast.error("You don't have permission to edit return notes");
      return;
    }

    if (returnNote && returnNote.status !== "pending") {
      toast.error("Cannot edit return note", {
        description: "Only pending return notes can be edited.",
      });
      return;
    }

    if (!returnNote && !canCreate) {
      toast.error("You don't have permission to create return notes");
      return;
    }

    setSelectedReturnNote(returnNote);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: any, id?: string) => {
    if (isSubmittingRef.current) return;

    if (id && !canUpdate) {
      toast.error("You don't have permission to update return notes");
      return;
    }
    if (!id && !canCreate) {
      toast.error("You don't have permission to create return notes");
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
        throw new Error(result.error || result.message || "Failed to save return note");
      }

      toast.success(`Return note ${id ? "updated" : "created"} successfully.`);
      fetchReturnNotes();
      setIsFormOpen(false);
      setSelectedReturnNote(null);

      const savedReturnNote = result.returnNote || result;
      
      // Automatically open PDF viewer
      setSelectedPdfUrl(`/api/return-notes/${savedReturnNote._id}/pdf`);
      setSelectedPdfTitle(savedReturnNote.returnNumber || "Return Note");
      setIsModalOpen(true);

    } catch (error: any) {
      toast.error(error.message || `Failed to ${id ? "update" : "create"} return note.`);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleDelete = async (selectedReturnNotes: ReturnNote[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete return notes");
      return;
    }

    try {
      const deletePromises = selectedReturnNotes.map((returnNote) =>
        fetch(`/api/return-notes/${returnNote._id}`, { method: "DELETE" }).then(
          async (res) => {
            if (res.status === 403) {
              throw new Error("You don't have permission to delete return notes");
            }
            if (!res.ok) throw new Error("Failed to delete");
            return res.json();
          }
        )
      );

      await Promise.all(deletePromises);

      toast.success(`${selectedReturnNotes.length} return note(s) moved to trash.`);
      fetchReturnNotes();
    } catch (error: any) {
      console.error("Failed to delete return notes:", error);
      toast.error(error.message || "Failed to delete return notes.");
    }
  };

  const handleViewReturnNote = (returnNote: ReturnNote) => {
    setReturnNoteToView(returnNote);
    setViewModalOpen(true);
  };

  const handleViewPdf = useCallback((returnNote: ReturnNote) => {
    if (!returnNote || !returnNote._id) {
      toast.error("Cannot view PDF. Return note data is missing.");
      return;
    }

    const pdfUrl = `/api/return-notes/${returnNote._id}/pdf`;
    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(returnNote.returnNumber || "Return Note");
    setIsModalOpen(true);
  }, []);

  // Handler for viewing connected purchase
  const handleViewPurchase = useCallback(async (purchase: any) => {
    if (!purchase || !purchase._id) {
      toast.error("Cannot view purchase. Purchase data is missing.");
      return;
    }

    try {
      // Fetch full purchase details
      const res = await fetch(`/api/purchases/${purchase._id}`);
      if (res.ok) {
        const fullPurchase = await res.json();
        setPurchaseToView(fullPurchase);
        setPurchaseViewModalOpen(true);
      } else {
        toast.error("Failed to load purchase details");
      }
    } catch (error) {
      console.error("Error fetching purchase:", error);
      toast.error("Error loading purchase details");
    }
  }, []);

  // Handler for viewing connected invoice
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

  // Handler for viewing PDFs of documents connected to purchases (from inside PurchaseViewModal)
  const handleViewPurchaseDocumentPdf = useCallback((bill: any) => {
    if (!bill || !bill._id) {
      toast.error("Cannot view PDF. Document data is missing.");
      return;
    }

    let url = "";

    const type = bill.documentType || bill.voucherType;
    const number = bill.invoiceNumber || "";

    if (type === 'payment' || number.startsWith('PAY')) {
      url = `/api/vouchers/${bill._id}/pdf?type=payment`;
    } else if (type === 'receipt' || number.startsWith('RCT')) {
      url = `/api/vouchers/${bill._id}/pdf?type=receipt`;
    } else if (number.startsWith('RTN')) {
      url = `/api/return-notes/${bill._id}/pdf`;
    } else {
      toast.error("Unknown document type. Cannot generate PDF.");
      return;
    }

    setSelectedPdfUrl(url);
    setSelectedPdfTitle(bill.invoiceNumber || bill.returnNumber || "Document");
    setIsModalOpen(true);
  }, []);

  // Handler for viewing PDFs of documents connected to invoices
  const handleViewInvoiceDocumentPdf = useCallback((doc: any) => {
    if (!doc || !doc._id) {
      toast.error("Cannot view PDF. Document data is missing.");
      return;
    }

    let pdfUrl = '';

    if (doc.voucherType) {
      pdfUrl = `/api/vouchers/${doc._id}/pdf`;
    } else if (doc.documentType === 'returnNote' || doc.returnNumber) {
      pdfUrl = `/api/return-notes/${doc._id}/pdf`;
    } else if (doc.documentType === 'quotation' || doc.invoiceNumber?.startsWith('QUO')) {
      pdfUrl = `/api/quotations/${doc._id}/pdf`;
    } else if (doc.documentType === 'delivery' || doc.invoiceNumber?.startsWith('DN')) {
      pdfUrl = `/api/delivery-notes/${doc._id}/pdf`;
    } else {
      pdfUrl = `/api/invoices/${doc._id}/pdf`;
    }

    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(doc.invoiceNumber || doc.returnNumber || "Document");
    setIsModalOpen(true);
  }, []);

  // Handler for viewing debit note PDFs
  const handleViewDebitNotePdf = useCallback((debitNote: any) => {
    if (!debitNote || !debitNote._id) {
      toast.error("Cannot view PDF. Debit note data is missing.");
      return;
    }
    const pdfUrl = `/api/debit-notes/${debitNote._id}/pdf`;
    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(debitNote.debitNoteNumber || "Debit Note");
    setIsModalOpen(true);
  }, []);

  // Handler for viewing credit note PDFs
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
          const returnNoteToDelete = returnNotes.find((r) => String(r._id) === id);
          if (returnNoteToDelete) {
            handleDelete([returnNoteToDelete]);
          }
        },
        { canUpdate, canDelete, canUpdateStatus: canUpdate },
        handleViewReturnNote,
        handleViewPdf,
        fetchReturnNotes,
        handleViewPurchase,
        handleViewInvoicePdf,
        handleViewDebitNotePdf,
        handleViewCreditNotePdf
      ),
    [returnNotes, canUpdate, canDelete, handleViewPdf, fetchReturnNotes, handleViewPurchase, handleViewInvoicePdf, handleViewDebitNotePdf, handleViewCreditNotePdf]
  );

  const { table } = useDataTable<ReturnNote>({
    data: returnNotes,
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
      setUrlState({ sort: sorting as ExtendedColumnSort<ReturnNote>[] });
    },
    onColumnFiltersChange: (filters) => {
      setUrlState({
        filters: filters as ExtendedColumnFilter<ReturnNote>[],
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
                  <PackageX className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Return Notes</h1>
                    {totalCount > 0 && (
                      <Badge variant="primary" appearance="outline">
                        {totalCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Track material and product returns
                  </p>
                </div>
              </div>

              {/* Right: Actions & Filters Group */}
              <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
                {/* Row 1: Actions */}
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {canViewTrash && (
                    <Link href="./return-notes/trash" className="w-full sm:w-auto">
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
                      <Plus className="h-4 w-4" /> Create Return Note
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
              {returnNotes.length === 0 && !isInitialLoad && !isLoading && canCreate && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <PackageX className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No return notes yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Start tracking returns by creating your first return note.
                    </p>
                    <Button onClick={() => handleOpenForm()} className="gap-2">
                      <Plus className="h-4 w-4" /> Create Return Note
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {canCreate && (
        <ReturnNoteForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedReturnNote(null);
          }}
          onSubmit={handleFormSubmit}
          defaultValues={selectedReturnNote}
        />
      )}

      <ReturnNoteViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setReturnNoteToView(null);
        }}
        returnNote={returnNoteToView}
        onViewPurchase={handleViewPurchase}
        onViewInvoicePdf={handleViewInvoicePdf}
        onViewDebitNotePdf={handleViewDebitNotePdf}
        onViewCreditNotePdf={handleViewCreditNotePdf}
      />

      <PDFViewerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pdfUrl={selectedPdfUrl}
        title={selectedPdfTitle}
      />

      <PurchaseViewModal
        isOpen={purchaseViewModalOpen}
        onClose={() => {
          setPurchaseViewModalOpen(false);
          setPurchaseToView(null);
        }}
        purchase={purchaseToView}
        onViewPdf={handleViewPurchaseDocumentPdf}
        onViewReturnNotePdf={handleViewPdf}
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
      <ReturnNotesPageContent />
    </Suspense>
  );
}