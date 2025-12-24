// app/documents/invoices/page.tsx - UPDATED: Added Silent Background Fetch on Focus

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQueryStates, parseAsInteger } from "nuqs";
import { toast } from "sonner";
import { FileText, Plus, Trash2, BarChart3, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { getColumns, type Invoice } from "./columns";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { InvoiceForm } from "./invoice-form";
import Link from "next/link";
import { useInvoicePermissions, useReportPermissions } from "@/hooks/use-permissions";
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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Ref to prevent double submission
  const isSubmittingRef = useRef(false);

  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");
  const [isInvoiceFormOpen, setIsInvoiceFormOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Date Range State (Default 6 months)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date()),
  });

  const {
    permissions: rawPermissions,
    isPending,
  } = useInvoicePermissions();

  const permissions = useMemo(() => rawPermissions, [rawPermissions]);
  const {
    canRead, canCreate, canUpdate, canDelete, canViewTrash,
    canUpdateStatus, canCreateReceipt, canCreateDelivery
  } = permissions;

  const { permissions: { canRead: canViewReports } } = useReportPermissions();

  const [urlState, setUrlState] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(10),
    sort: getSortingStateParser<Invoice>().withDefault([]),
    filters: getFiltersStateParser<Invoice>().withDefault([]),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ UPDATED: Added 'background' param. If true, skips loading state (silent fetch).
  const fetchInvoices = useCallback(async (background = false) => {
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

      const res = await fetch(`/api/invoices?${params.toString()}`);

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`API Error (${res.status}):`, errorText);
        throw new Error(`Failed to fetch invoices: ${res.status} ${res.statusText}`);
      }

      const result = await res.json();

      if (result.data && result.pageCount !== undefined) {
        setInvoices(result.data);
        setPageCount(result.pageCount);
        setTotalCount(result.totalCount);
      } else {
        setInvoices(result);
      }
    } catch (error) {
      // Only show toast error if it's a user interaction, not a background poll
      if (!background) {
        console.error("Error fetching invoices:", error);
        toast.error("Could not load invoices.");
      }
    } finally {
      if (!background) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  }, [canRead, urlState.page, urlState.pageSize, urlState.sort, urlState.filters, dateRange]);

  // Standard fetch on dependency change
  useEffect(() => {
    if (isMounted && canRead) {
      fetchInvoices();
    }
  }, [isMounted, canRead, fetchInvoices]);

  // ✅ NEW: Window Focus Listener - SILENT MODE
  // This triggers a silent "background" fetch when you tab back to this page.
  useEffect(() => {
    const onFocus = () => {
      if (isMounted && canRead) {
        // Pass true to indicate this is a background fetch (no loading UI/opacity change)
        fetchInvoices(true);
      }
    };

    window.addEventListener("focus", onFocus);
    
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchInvoices, isMounted, canRead]);

  const handleOpenForm = (invoice: Invoice | null = null) => {
    if (invoice && !canUpdate) {
      toast.error("You don't have permission to edit invoices");
      return;
    }

    // Prevent editing if status is not "pending"
    if (invoice && invoice.status !== 'pending') {
      toast.error("Cannot edit invoice", {
        description: "Only invoices with 'pending' status can be edited. Approved/cancelled invoices affect accounting records."
      });
      return;
    }

    if (!invoice && !canCreate) {
      toast.error("You don't have permission to create invoices");
      return;
    }

    setSelectedInvoice(invoice);
    setIsInvoiceFormOpen(true);
  };

  const handleDelete = async (selectedInvoices: Invoice[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete invoices");
      return;
    }

    try {
      const deletePromises = selectedInvoices.map((invoice) =>
        fetch(`/api/invoices/${invoice._id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      toast.success(`${selectedInvoices.length} moved to trash.`);
      fetchInvoices();
    } catch (error) {
      console.error('Failed to delete invoices:', error);
      toast.error('Failed to delete invoices.');
    }
  };

  const handleViewPdf = useCallback((doc: any) => {
    if (!doc || !doc._id) {
      toast.error("Cannot view PDF. Document data is missing.");
      return;
    }

    let pdfUrl = '';

    if (doc.voucherType) {
      pdfUrl = `/api/vouchers/${doc._id}/pdf`;
    } else if (doc.documentType === 'quotation' || (!doc.documentType && doc.invoiceNumber?.startsWith('QUO'))) {
      pdfUrl = `/api/quotations/${doc._id}/pdf`;
    } else if (doc.documentType === 'delivery' || (!doc.documentType && doc.invoiceNumber?.startsWith('DN'))) {
      pdfUrl = `/api/delivery-notes/${doc._id}/pdf`;
    } else {
      pdfUrl = `/api/invoices/${doc._id}/pdf`;
    }

    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(doc.invoiceNumber || "Document");
    setIsModalOpen(true);
  }, []);

  const handleInvoiceFormSubmit = async (data: any, id?: string) => {
    // 1. Immediate Lock
    if (isSubmittingRef.current) return;

    if (id && !canUpdate) {
      toast.error("You don't have permission to update invoices");
      return;
    }

    if (!id && !canCreate) {
      toast.error("You don't have permission to create invoices");
      return;
    }

    // 2. Lock & Load
    isSubmittingRef.current = true;

    const url = id ? `/api/invoices/${id}` : "/api/invoices";
    const method = id ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        toast.error(result.error || `Failed to ${id ? "update" : "create"} invoice.`);
        return;
      }

      const invoice = id ? result : result.invoice;

      // If creating and linked to quotation, update quotation status
      if (!id && data.connectedDocuments?.quotationId) {
        try {
          await fetch(`/api/quotations/${data.connectedDocuments.quotationId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              "connectedDocuments.invoiceIds": [invoice._id],
              status: "converted"
            }),
          });
        } catch (err) {
          console.error("Failed to update quotation status", err);
        }
      }

      // Close Form Modal
      setIsInvoiceFormOpen(false);
      setSelectedInvoice(null);

      // Refresh Data
      fetchInvoices();

      // Show Success Toast
      toast.success(`Invoice ${invoice.invoiceNumber} ${id ? "updated" : "created"}!`);

      // ✅ AUTOMATICALLY OPEN PDF VIEWER
      setSelectedPdfUrl(`/api/invoices/${invoice._id}/pdf`);
      setSelectedPdfTitle(invoice.invoiceNumber || "Invoice");
      setIsModalOpen(true);

    } catch (error) {
      console.error(`Error ${id ? "updating" : "creating"} invoice:`, error);
      toast.error(`An error occurred while ${id ? "updating" : "creating"} invoice.`);
    } finally {
      // 3. Release Lock
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
      const invoiceToDelete = invoices.find((inv: Invoice) => inv._id === id);
      if (invoiceToDelete) {
        handleDelete([invoiceToDelete]);
      }
    },
    { canDelete, canUpdate, canUpdateStatus, canCreateReceipt, canCreateDelivery },
    fetchInvoices
  ), [invoices, canDelete, canUpdate, canUpdateStatus, canCreateReceipt, canCreateDelivery, handleViewPdf, fetchInvoices]);

  const { table } = useDataTable<Invoice>({
    data: invoices,
    columns,
    pageCount,
    initialState: {
      pagination: {
        pageSize: urlState.pageSize,
        pageIndex: urlState.page - 1,
      },
      sorting: urlState.sort,
      columnFilters: urlState.filters,
    },
    onPaginationChange: (pagination) => {
      setUrlState({
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
      });
    },
    onSortingChange: (sorting) => {
      setUrlState({ sort: sorting as ExtendedColumnSort<Invoice>[] });
    },
    onColumnFiltersChange: (filters) => {
      setUrlState({
        filters: filters as ExtendedColumnFilter<Invoice>[],
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
                  <FileText className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
                    {totalCount > 0 && (
                      <Badge variant="primary" appearance="outline">
                        {totalCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Manage and track your sales invoices
                  </p>
                </div>
              </div>

              {/* Right: Actions & Filters Group */}
              <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
                
                {/* Row 1: Actions */}
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {canViewTrash && (
                    <Link href="./invoices/trash" className="w-full sm:w-auto">
                      <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <Trash2 className="h-4 w-4" />
                        Trash
                      </Button>
                    </Link>
                  )}
                  {canViewReports && (
                    <Link href="/reports/sales-report" className="w-full sm:w-auto">
                      <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <BarChart3 className="h-4 w-4" /> Reports
                      </Button>
                    </Link>
                  )}
                  {canCreate && (
                    <Button
                      onClick={() => handleOpenForm()}
                      className="gap-2 w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4" />
                      New Invoice
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
                    <div
                      className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}
                    >
                      <DataTable table={table}>
                        <DataTableToolbar table={table} />
                      </DataTable>
                    </div>
                  )}
                </CardContent>
              </Card>

              {invoices.length === 0 && !isInitialLoad && !isLoading && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No invoices yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create your first invoice to get started
                    </p>
                    {canCreate && (
                      <Button onClick={() => handleOpenForm()} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Create Invoice
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <InvoiceForm
        isOpen={isInvoiceFormOpen}
        onClose={() => {
          setIsInvoiceFormOpen(false);
          setSelectedInvoice(null);
        }}
        onSubmit={handleInvoiceFormSubmit}
        defaultValues={selectedInvoice}
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