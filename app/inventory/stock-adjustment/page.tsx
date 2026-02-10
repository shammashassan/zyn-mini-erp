// app/inventory/stock-adjustment/page.tsx - UPDATED: Added Silent Background Fetch on Focus

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Plus, Trash2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { AdjustmentForm } from "./adjustment-form";
import { getAdjustmentHistoryColumns, type IAdjustmentHistory } from "./columns"; // ✅ Import exported type
import type { IMaterial } from "@/models/Material";
import Link from "next/link";
import { useStockAdjustmentPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";
// ✅ Nuqs imports
import { useQueryStates, parseAsInteger } from "nuqs";
import { getSortingStateParser, getFiltersStateParser } from "@/lib/data-table/parsers";
import type { ExtendedColumnSort, ExtendedColumnFilter } from "@/types/data-table";
import { cn } from "@/lib/utils";
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
import { StockAdjustmentViewModal } from "./StockAdjustmentViewModal";

type AdjustmentFormData = {
  materialId: string;
  adjustmentType: "increment" | "decrement";
  value: number | "";
  newUnitCost?: number;
  adjustmentReason?: string;
};

function StockAdjustmentPageContent() {
  const pathname = usePathname();
  const [materials, setMaterials] = useState<IMaterial[]>([]);
  const [adjustmentHistory, setAdjustmentHistory] = useState<IAdjustmentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // ✅ Initial load state for the table specifically
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<IAdjustmentHistory | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // ✅ Server-side pagination state
  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Date Range State (Default 6 months)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date()),
  });

  // ✅ URL State Management
  const [urlState, setUrlState] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(10),
    sort: getSortingStateParser<IAdjustmentHistory>().withDefault([{ id: 'createdAt', desc: true }]),
    filters: getFiltersStateParser<IAdjustmentHistory>().withDefault([]),
  });

  const {
    permissions: {
      canRead,
      canCreate,
      canDelete,
      canViewTrash
    },
    isPending,
    session
  } = useStockAdjustmentPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ Separate fetch for Materials (Only runs once on mount)
  useEffect(() => {
    const fetchMaterials = async () => {
      if (!canRead) return;
      try {
        const res = await fetch("/api/materials");
        if (res.ok) {
          setMaterials(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch materials", error);
      }
    };
    if (canRead) fetchMaterials();
  }, [canRead]);

  // ✅ UPDATED: Added 'background' param. If true, skips loading state (silent fetch).
  const fetchAdjustments = useCallback(async (background = false) => {
    if (!canRead) return;
    try {
      // Only show loading spinner/skeleton if it's NOT a background fetch
      if (!background) {
        setIsLoading(true);
      }

      const params = new URLSearchParams({
        page: urlState.page.toString(),
        pageSize: urlState.pageSize.toString(),
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

      const res = await fetch(`/api/stock-adjustments?${params.toString()}`);

      if (!res.ok) throw new Error("Failed to fetch adjustment history");

      const result = await res.json();

      if (result.data && result.pageCount !== undefined) {
        setAdjustmentHistory(result.data);
        setPageCount(result.pageCount);
        setTotalCount(result.totalCount);
      } else {
        setAdjustmentHistory(result); // Fallback
      }
    } catch (error) {
      // Only show toast error if it's a user interaction, not a background poll
      if (!background) {
        toast.error("Could not load history.");
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
      fetchAdjustments();
    }
  }, [isMounted, canRead, fetchAdjustments]);

  // ✅ NEW: Window Focus Listener - SILENT MODE
  // This triggers a silent "background" fetch when you tab back to this page.
  useEffect(() => {
    const onFocus = () => {
      if (isMounted && canRead) {
        // Pass true to indicate this is a background fetch (no loading UI/opacity change)
        fetchAdjustments(true);
      }
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchAdjustments, isMounted, canRead]);

  const handleFormSubmit = async (data: AdjustmentFormData) => {
    if (!canCreate) {
      toast.error("You don't have permission to create stock adjustments");
      return;
    }

    try {
      const isStockAdjustment = data.value !== 0;
      const isPriceAdjustment = data.value === 0 && data.newUnitCost !== undefined;

      if (isStockAdjustment) {
        if (data.value === "" || typeof data.value !== "number" || data.value <= 0) {
          throw new Error("Please enter a valid quantity.");
        }
      } else if (isPriceAdjustment) {
        if (data.newUnitCost === undefined || data.newUnitCost === null || data.newUnitCost < 0) {
          throw new Error("Please enter a valid unit cost.");
        }
      } else {
        throw new Error("Please provide either a quantity or unit cost adjustment.");
      }

      const response = await fetch("/api/stock-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          value: Number(data.value),
        }),
      });

      const newAdjustment = await response.json();

      if (!response.ok) {
        throw new Error(newAdjustment.error || "An unknown error occurred.");
      }

      toast.success("Adjustment applied successfully.", {
        action: {
          label: "Undo",
          onClick: () => handleUndoSubmit(newAdjustment),
        },
      });

      setIsFormOpen(false);
      fetchAdjustments(); // Refresh table
    } catch (error) {
      toast.error(`Failed to apply adjustment: ${error instanceof Error ? error.message : "Please try again."}`);
    }
  };

  const handleUndoSubmit = useCallback(async (adjustmentToRevert: IAdjustmentHistory) => {
    if (!canCreate) return;

    toast.promise(
      fetch("/api/stock-adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "revert",
          payload: adjustmentToRevert,
        }),
      }),
      {
        loading: "Reverting adjustment...",
        success: () => {
          fetchAdjustments();
          return "Adjustment undone.";
        },
        error: "Failed to undo adjustment.",
      }
    );
  }, [fetchAdjustments, canCreate]);

  const handleDelete = async (selectedAdjustments: IAdjustmentHistory[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete adjustments");
      return;
    }

    try {
      const deletePromises = selectedAdjustments.map((adjustment) =>
        fetch(`/api/stock-adjustments/${adjustment._id}`, { method: "DELETE" })
      );

      await Promise.all(deletePromises);

      toast.success(`${selectedAdjustments.length} adjustment(s) moved to trash.`);
      fetchAdjustments();
    } catch (error) {
      console.error("Failed to delete adjustment records:", error);
      toast.error("Failed to delete records.");
    }
  };

  const handleView = (adjustment: IAdjustmentHistory) => {
    setSelectedAdjustment(adjustment);
    setIsViewModalOpen(true);
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

  const columns = useMemo(() => getAdjustmentHistoryColumns(
    (adjustmentOrId: IAdjustmentHistory | string) => {
      // Handle both object and string ID (for bulk delete support via table if added later)
      const id = typeof adjustmentOrId === "object" ? adjustmentOrId._id : adjustmentOrId;
      const adjustmentToDelete = adjustmentHistory.find((a) => a._id === id);
      if (adjustmentToDelete) {
        handleDelete([adjustmentToDelete]);
      }
    },
    { canDelete },
    handleView
  ), [adjustmentHistory, canDelete]);

  // ✅ Configured useDataTable
  const { table } = useDataTable<IAdjustmentHistory>({
    data: adjustmentHistory,
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
      setUrlState({ sort: sorting as ExtendedColumnSort<IAdjustmentHistory>[] });
    },
    onColumnFiltersChange: (filters) => {
      setUrlState({
        filters: filters as ExtendedColumnFilter<IAdjustmentHistory>[],
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
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 px-4 lg:px-6 gap-4">

              {/* Left: Title */}
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <ArrowRightLeft className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Stock Adjustment
                  </h1>
                  <p className="text-muted-foreground">
                    Review and manage all material inventory changes
                  </p>
                </div>
              </div>

              {/* Right: Actions & Filters Group */}
              <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">

                {/* Row 1: Actions */}
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {canViewTrash && (
                    <Link href="./stock-adjustment/trash" className="w-full sm:w-auto">
                      <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <Trash2 className="h-4 w-4" />
                        Trash
                      </Button>
                    </Link>
                  )}
                  {canCreate && (
                    <Button onClick={() => setIsFormOpen(true)} className="gap-2 w-full sm:w-auto">
                      <Plus className="h-4 w-4" /> Adjust Stock
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
                  {/* ✅ Opacity Transition */}
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

              {adjustmentHistory.length === 0 && !isLoading && !isInitialLoad && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <ArrowRightLeft className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      No adjustments yet
                    </h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Start managing your inventory by making your first adjustment.
                    </p>
                    {canCreate && (
                      <Button
                        onClick={() => setIsFormOpen(true)}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" /> Make Your First Adjustment
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <AdjustmentForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        materials={materials}
        isLoadingMaterials={false} // Materials loaded on mount
      />

      <StockAdjustmentViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedAdjustment(null);
        }}
        adjustment={selectedAdjustment}
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
      <StockAdjustmentPageContent />
    </Suspense>
  );
}