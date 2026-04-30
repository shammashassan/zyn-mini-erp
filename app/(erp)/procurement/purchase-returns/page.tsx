// app/procurement/purchase-returns/page.tsx

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { toast } from "sonner";
import { PackageX, Plus, Trash2, CalendarIcon, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { PurchaseReturnForm } from "./purchase-return-form";
import { getColumns, type PurchaseReturn } from "./columns";
import { PurchaseReturnViewModal } from "./PurchaseReturnViewModal";
import { PDFViewerModal } from "@/components/shared/PDFViewerModal";
import { PurchaseViewModal } from "@/app/(erp)/procurement/purchases/PurchaseViewModal";
import Link from "next/link";
import { useReturnNotePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/shared/access-denied";
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

function PurchaseReturnsPageContent() {
  const pathname = usePathname();
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [returnToView, setReturnToView] = useState<PurchaseReturn | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");

  const [purchaseViewModalOpen, setPurchaseViewModalOpen] = useState(false);
  const [purchaseToView, setPurchaseToView] = useState<any | null>(null);

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
    sort: getSortingStateParser<PurchaseReturn>().withDefault([{ id: "returnDate", desc: true }]),
    filters: getFiltersStateParser<PurchaseReturn>().withDefault([]),
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

  const fetchPurchaseReturns = useCallback(
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
          returnType: "purchaseReturn",
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
          if (!background) toast.error("You don't have permission to view purchase returns");
          return;
        }

        if (!res.ok) throw new Error("Failed to fetch purchase returns");

        const result = await res.json();

        if (result.data && result.pageCount !== undefined) {
          setPurchaseReturns(result.data);
          setPageCount(result.pageCount);
          setTotalCount(result.totalCount);
        } else {
          setPurchaseReturns(result);
        }
      } catch (error) {
        if (!background) {
          toast.error("Could not load purchase returns.");
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
      fetchPurchaseReturns();
    } else if (session && !canRead) {
      toast.error("You don't have permission to view purchase returns", {
        description: "Only authorized users can access this page",
      });
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [canRead, fetchPurchaseReturns]);

  useEffect(() => {
    const onFocus = () => {
      if (session && canRead) {
        fetchPurchaseReturns(true);
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchPurchaseReturns, session, canRead]);

  const handleOpenForm = (purchaseReturn: PurchaseReturn | null = null) => {
    if (purchaseReturn && !canUpdate) {
      toast.error("You don't have permission to edit purchase returns");
      return;
    }

    if (purchaseReturn && purchaseReturn.status !== "pending") {
      toast.error("Cannot edit purchase return", {
        description: "Only pending purchase returns can be edited.",
      });
      return;
    }

    if (!purchaseReturn && !canCreate) {
      toast.error("You don't have permission to create purchase returns");
      return;
    }

    setSelectedReturn(purchaseReturn);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: any, id?: string) => {
    if (isSubmittingRef.current) return;

    if (id && !canUpdate) {
      toast.error("You don't have permission to update purchase returns");
      return;
    }
    if (!id && !canCreate) {
      toast.error("You don't have permission to create purchase returns");
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
        throw new Error(result.error || result.message || "Failed to save purchase return");
      }

      toast.success(`Purchase return ${id ? "updated" : "created"} successfully.`);
      fetchPurchaseReturns();
      setIsFormOpen(false);
      setSelectedReturn(null);

      const savedReturn = result.returnNote || result;

      setSelectedPdfUrl(`/api/return-notes/${savedReturn._id}/pdf`);
      setSelectedPdfTitle(savedReturn.returnNumber || "Purchase Return");
      setIsModalOpen(true);

    } catch (error: any) {
      toast.error(error.message || `Failed to ${id ? "update" : "create"} purchase return.`);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleDelete = async (selectedReturns: PurchaseReturn[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete purchase returns");
      return;
    }

    try {
      const deletePromises = selectedReturns.map((returnNote) =>
        fetch(`/api/return-notes/${returnNote._id}`, { method: "DELETE" }).then(
          async (res) => {
            if (res.status === 403) {
              throw new Error("You don't have permission to delete purchase returns");
            }
            if (!res.ok) throw new Error("Failed to delete");
            return res.json();
          }
        )
      );

      await Promise.all(deletePromises);

      toast.success(`${selectedReturns.length} purchase return(s) moved to trash.`);
      fetchPurchaseReturns();
    } catch (error: any) {
      console.error("Failed to delete purchase returns:", error);
      toast.error(error.message || "Failed to delete purchase returns.");
    }
  };

  const handleViewReturn = (purchaseReturn: PurchaseReturn) => {
    setReturnToView(purchaseReturn);
    setViewModalOpen(true);
  };

  const handleViewPdf = useCallback((purchaseReturn: PurchaseReturn) => {
    if (!purchaseReturn || !purchaseReturn._id) {
      toast.error("Cannot view PDF. Return data is missing.");
      return;
    }

    const pdfUrl = `/api/return-notes/${purchaseReturn._id}/pdf`;
    setSelectedPdfUrl(pdfUrl);
    setSelectedPdfTitle(purchaseReturn.returnNumber || "Purchase Return");
    setIsModalOpen(true);
  }, []);

  const handleViewPurchase = useCallback(async (purchase: any) => {
    if (!purchase || !purchase._id) {
      toast.error("Cannot view purchase. Purchase data is missing.");
      return;
    }

    try {
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

  const handleViewPurchaseDocumentPdf = useCallback((doc: any) => {
    if (!doc || !doc._id) {
      toast.error("Cannot view PDF. Document data is missing.");
      return;
    }

    let url = "";
    const type = doc.documentType || doc.voucherType;
    const number = doc.invoiceNumber || "";

    if (type === 'payment' || number.startsWith('PAY')) {
      url = `/api/vouchers/${doc._id}/pdf?type=payment`;
    } else if (type === 'receipt' || number.startsWith('RCT')) {
      url = `/api/vouchers/${doc._id}/pdf?type=receipt`;
    } else if (number.startsWith('RTN')) {
      url = `/api/return-notes/${doc._id}/pdf`;
    } else {
      toast.error("Unknown document type. Cannot generate PDF.");
      return;
    }

    setSelectedPdfUrl(url);
    setSelectedPdfTitle(doc.invoiceNumber || doc.returnNumber || "Document");
    setIsModalOpen(true);
  }, []);

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
          const returnToDelete = purchaseReturns.find((r) => String(r._id) === id);
          if (returnToDelete) {
            handleDelete([returnToDelete]);
          }
        },
        { canUpdate, canDelete, canUpdateStatus: canUpdate },
        handleViewReturn,
        handleViewPdf,
        fetchPurchaseReturns,
        handleViewPurchase,
        handleViewDebitNotePdf
      ),
    [purchaseReturns, canUpdate, canDelete, handleViewPdf, fetchPurchaseReturns, handleViewPurchase, handleViewDebitNotePdf]
  );

  const { table } = useDataTable<PurchaseReturn>({
    data: purchaseReturns,
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
      setUrlState({ sort: sorting as ExtendedColumnSort<PurchaseReturn>[] });
    },
    onColumnFiltersChange: (filters) => {
      setUrlState({
        filters: filters as ExtendedColumnFilter<PurchaseReturn>[],
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
                  <Redo2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Purchase Returns</h1>
                    {totalCount > 0 && (
                      <Badge variant="primary" appearance="outline">
                        {totalCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Track material returns to suppliers
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {canViewTrash && (
                    <Link href="./purchase-returns/trash" className="w-full sm:w-auto">
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
                      <Plus className="h-4 w-4" /> Create Purchase Return
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
                ) : purchaseReturns.length > 0 || (urlState.filters && urlState.filters.length > 0) ? (
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
                      <h3 className="text-lg font-semibold mb-2">No purchase returns yet</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        Start tracking material returns by creating your first purchase return.
                      </p>
                      {canCreate && (
                        <Button onClick={() => handleOpenForm()} className="gap-2">
                          <Plus className="h-4 w-4" /> Create Purchase Return
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
        <PurchaseReturnForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedReturn(null);
          }}
          onSubmit={handleFormSubmit}
          defaultValues={selectedReturn}
        />
      )}

      <PurchaseReturnViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setReturnToView(null);
        }}
        purchaseReturn={returnToView}
        onViewPurchase={handleViewPurchase}
        onViewDebitNotePdf={handleViewDebitNotePdf}
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
      <PurchaseReturnsPageContent />
    </Suspense>
  );
}
