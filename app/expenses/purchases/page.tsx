// app/expenses/purchases/page.tsx - UPDATED: Added handleViewReturnNotePdf

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { toast } from "sonner";
import { ShoppingCart, Plus, BarChart3, Trash2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { PurchaseForm } from "./purchase-form";
import { getColumns, type IPurchase } from "./columns";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { PurchaseViewModal } from "./PurchaseViewModal";
import Link from "next/link";
import { usePurchasePermissions } from "@/hooks/use-permissions";
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

function PurchasesPageContent() {
  const [purchases, setPurchases] = useState<IPurchase[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<IPurchase | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [purchaseToView, setPurchaseToView] = useState<IPurchase | null>(null);
  const [isMounted, setIsMounted] = useState(false);

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
    sort: getSortingStateParser<IPurchase>().withDefault([{ id: 'createdAt', desc: true }]),
    filters: getFiltersStateParser<IPurchase>().withDefault([]),
  });

  const {
    permissions: {
      canRead,
      canCreate,
      canUpdate,
      canUpdateStatus,
      canDelete,
      canViewTrash,
      canCreatePayment,
    },
    session,
    isPending,
  } = usePurchasePermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchPurchases = useCallback(async (background = false) => {
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

      const res = await fetch(`/api/purchases?${params.toString()}`);

      if (res.status === 403) {
        if (!background) toast.error("You don't have permission to view purchases");
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch purchases");

      const result = await res.json();

      if (result.data && result.pageCount !== undefined) {
        setPurchases(result.data);
        setPageCount(result.pageCount);
        setTotalCount(result.totalCount);
      } else {
        setPurchases(result);
      }
    } catch (error) {
      if (!background) {
        toast.error("Could not load purchases.");
        console.error(error);
      }
    } finally {
      if (!background) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  }, [canRead, urlState.page, urlState.pageSize, urlState.sort, urlState.filters, dateRange]);

  useEffect(() => {
    if (session && canRead) {
      fetchPurchases();
    } else if (session && !canRead) {
      toast.error("You don't have permission to view purchases", {
        description: "Only authorized users can access this page",
      });
      setIsLoading(false);
      setIsInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canRead, fetchPurchases]);

  useEffect(() => {
    const onFocus = () => {
      if (session && canRead) {
        fetchPurchases(true);
      }
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchPurchases, session, canRead]);

  const handleOpenForm = (purchase: IPurchase | null = null) => {
    if (purchase && !canUpdate) {
      toast.error("You don't have permission to edit purchases");
      return;
    }

    if (purchase && purchase.purchaseStatus !== 'pending') {
      toast.error("Cannot edit purchase", {
        description: "Only purchases with 'pending' status can be edited. Other statuses affect stock and accounting records."
      });
      return;
    }

    if (!purchase && !canCreate) {
      toast.error("You don't have permission to create purchases");
      return;
    }

    setSelectedPurchase(purchase);
    setIsFormOpen(true);
  };

  const handleDuplicate = (purchase: IPurchase) => {
    if (!canCreate) {
      toast.error("You don't have permission to create purchases");
      return;
    }
    const plainPurchase = JSON.parse(JSON.stringify(purchase));
    const duplicatePurchase = {
      ...plainPurchase,
      date: new Date(),
      _id: undefined,
      purchaseStatus: 'pending',
      inventoryStatus: 'pending',
      paymentStatus: 'pending',
      paidAmount: 0,
      totalPaid: 0,
      remainingAmount: plainPurchase.totalAmount,
      connectedDocuments: { paymentIds: [] },
    };
    setSelectedPurchase(duplicatePurchase as unknown as IPurchase);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: any, id?: string) => {
    if (isSubmittingRef.current) return;

    if (id && !canUpdate) {
      toast.error("You don't have permission to update purchases");
      return;
    }
    if (!id && !canCreate) {
      toast.error("You don't have permission to create purchases");
      return;
    }

    isSubmittingRef.current = true;

    const url = id ? `/api/purchases/${id}` : "/api/purchases";
    const method = id ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.status === 403) {
        const errorData = await res.json();
        throw new Error(errorData.message || "You don't have permission to perform this action");
      }

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || result.message || "Failed to save purchase");
      }

      toast.success(`Purchase ${id ? "updated" : "added"} successfully.`);
      fetchPurchases();
      setIsFormOpen(false);
      setSelectedPurchase(null);

      const savedPurchase = result.purchase || result;
      setPurchaseToView(savedPurchase);
      setViewModalOpen(true);

    } catch (error: any) {
      toast.error(error.message || `Failed to ${id ? "update" : "add"} purchase.`);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleDelete = async (selectedPurchases: IPurchase[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete purchases");
      return;
    }

    try {
      const deletePromises = selectedPurchases.map((purchase) =>
        fetch(`/api/purchases/${purchase._id}`, { method: 'DELETE' }).then(
          async (res) => {
            if (res.status === 403) {
              throw new Error("You don't have permission to delete purchases");
            }
            if (!res.ok) throw new Error("Failed to delete");
            return res.json();
          }
        )
      );

      await Promise.all(deletePromises);

      toast.success(`${selectedPurchases.length} purchase(s) moved to trash.`);
      fetchPurchases();
    } catch (error: any) {
      console.error('Failed to delete purchases:', error);
      toast.error(error.message || 'Failed to delete purchases.');
    }
  };

  const handleViewPdf = (bill: any) => {
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
    } else if (type === 'invoice' || number.startsWith('INV')) {
      url = `/api/invoices/${bill._id}/pdf`;
    } else if (type === 'quotation' || number.startsWith('QUO')) {
      url = `/api/quotations/${bill._id}/pdf`;
    } else if (type === 'delivery' || number.startsWith('DEL')) {
      url = `/api/delivery-notes/${bill._id}/pdf`;
    } else if (number.startsWith('RTN')) {
      url = `/api/return-notes/${bill._id}/pdf`;
    } else {
      toast.error("Unknown document type. Cannot generate PDF.");
      return;
    }

    setSelectedPdfUrl(url);
    setSelectedPdfTitle(bill.invoiceNumber || bill.returnNumber || "Document");
    setIsModalOpen(true);
  };

  // ✅ NEW: Handler for viewing return note PDFs
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

  const handleViewPurchase = (purchase: IPurchase) => {
    setPurchaseToView(purchase);
    setViewModalOpen(true);
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
    handleOpenForm,
    (id: string) => {
      const purchaseToDelete = purchases.find(p => String(p._id) === id);
      if (purchaseToDelete) {
        handleDelete([purchaseToDelete]);
      }
    },
    canDelete,
    canCreate ? handleDuplicate : undefined,
    handleViewPurchase,
    fetchPurchases,
    handleViewPdf,
    canUpdate,
    canCreate,
    canUpdateStatus,
    canCreatePayment,
    handleViewReturnNotePdf // ✅ Pass the new handler
  ), [purchases, canDelete, canCreate, canUpdate, canUpdateStatus, canCreatePayment, handleViewReturnNotePdf]);

  const { table } = useDataTable<IPurchase>({
    data: purchases,
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
      setUrlState({ sort: sorting as ExtendedColumnSort<IPurchase>[] });
    },
    onColumnFiltersChange: (filters) => {
      setUrlState({
        filters: filters as ExtendedColumnFilter<IPurchase>[],
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

              <div className="flex items-center gap-3 self-start lg:self-center">
                <div className="p-3 bg-primary/10 rounded-full">
                  <ShoppingCart className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Purchases</h1>
                    {totalCount > 0 && (
                      <Badge variant="primary" appearance="outline">
                        {totalCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Track and manage material purchases from suppliers
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {canViewTrash && (
                    <Link href="./purchases/trash" className="w-full sm:w-auto">
                      <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <Trash2 className="h-4 w-4" />
                        Trash
                      </Button>
                    </Link>
                  )}
                  {canRead && (
                    <Link href="/reports/purchase-report" className="w-full sm:w-auto">
                      <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <BarChart3 className="h-4 w-4" /> Reports
                      </Button>
                    </Link>
                  )}
                  {canCreate && (
                    <Button onClick={() => handleOpenForm()} className="gap-2 w-full sm:w-auto">
                      <Plus className="h-4 w-4" /> Add Purchase
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

              {purchases.length === 0 && !isInitialLoad && !isLoading && canCreate && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No purchases yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Start tracking your material purchases by adding your first purchase record.
                    </p>
                    <Button onClick={() => handleOpenForm()} className="gap-2">
                      <Plus className="h-4 w-4" /> Add Your First Purchase
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {canCreate && (
        <PurchaseForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedPurchase(null);
          }}
          onSubmit={handleFormSubmit}
          defaultValues={selectedPurchase}
        />
      )}

      <PDFViewerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        pdfUrl={selectedPdfUrl}
        title={selectedPdfTitle}
      />

      <PurchaseViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setPurchaseToView(null);
        }}
        purchase={purchaseToView}
        onViewPdf={handleViewPdf}
        onViewReturnNotePdf={handleViewReturnNotePdf}
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
      <PurchasesPageContent />
    </Suspense>
  );
}