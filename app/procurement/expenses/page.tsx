// app/procurement/expenses/page.tsx - UPDATED: Added Silent Background Fetch on Focus

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { toast } from "sonner";
import { Banknote, Plus, BarChart3, Trash2, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { ExpenseForm } from "./expense-form";
import { ExpenseViewModal } from "./ExpenseViewModal";
import { getColumns } from "./columns";
import type { IExpense } from "@/models/Expense";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useExpensePermissions, useReportPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { useQueryStates, parseAsInteger } from "nuqs";
import { getSortingStateParser, getFiltersStateParser } from "@/lib/data-table/parsers";
import type { ExtendedColumnSort, ExtendedColumnFilter } from "@/types/data-table";
import { Badge } from "@/components/ui/badge";
import { PDFViewerModal } from "@/components/PDFViewerModal";
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

function ExpensesPageContent() {
  const [expenses, setExpenses] = useState<IExpense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<IExpense | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [expenseToView, setExpenseToView] = useState<IExpense | null>(null);
  
  // PDF Modal State
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfTitle, setPdfTitle] = useState("");

  // Date Range State (Default 6 months)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date()),
  });

  const [activeTab, setActiveTab] = useState("all");
  const [isMounted, setIsMounted] = useState(false);
  const isSubmittingRef = useRef(false);

  const {
    permissions: {
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      canViewTrash,
    },
    isPending,
  } = useExpensePermissions();

  const { permissions: { canRead: canViewReports } } = useReportPermissions();

  const [urlState, setUrlState] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(10),
    sort: getSortingStateParser<IExpense>().withDefault([{ id: "createdAt", desc: true }]),
    filters: getFiltersStateParser<IExpense>().withDefault([]),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ UPDATED: Added 'background' param. If true, skips loading state (silent fetch).
  const fetchExpenses = useCallback(async (background = false) => {
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
      
      if (activeTab !== "all") {
        params.append("type", activeTab);
      }

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

      const res = await fetch(`/api/expenses?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch expenses");

      const result = await res.json();
      
      if (result.data || result.expenses) {
        setExpenses(result.data || result.expenses || []);
        setPageCount(result.pageCount || 0);
        setTotalCount(result.totalCount || 0);
      } else if (Array.isArray(result)) {
        setExpenses(result);
        setTotalCount(result.length);
        setPageCount(1);
      } else {
        setExpenses([]);
        setTotalCount(0);
      }
    } catch (error) {
      // Only show toast error if it's a user interaction, not a background poll
      if (!background) {
        console.error("Error fetching expenses:", error);
        toast.error("Could not load expenses.");
      }
    } finally {
      if (!background) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  }, [canRead, urlState.page, urlState.pageSize, urlState.sort, urlState.filters, activeTab, dateRange]);

  // Standard fetch on dependency change
  useEffect(() => {
    if (isMounted && canRead) {
      fetchExpenses();
    }
  }, [isMounted, canRead, fetchExpenses]);

  // ✅ NEW: Window Focus Listener - SILENT MODE
  // This triggers a silent "background" fetch when you tab back to this page.
  useEffect(() => {
    const onFocus = () => {
      if (isMounted && canRead) {
        // Pass true to indicate this is a background fetch (no loading UI/opacity change)
        fetchExpenses(true);
      }
    };

    window.addEventListener("focus", onFocus);
    
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchExpenses, isMounted, canRead]);

  useEffect(() => {
    setUrlState({ page: 1 });
  }, [activeTab]);

  const handleDelete = async (selectedExpenses: IExpense[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete expenses");
      return;
    }

    try {
      const deletePromises = selectedExpenses.map((expense) =>
        fetch(`/api/expenses/${expense._id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);
      toast.success(`${selectedExpenses.length} expenses moved to trash.`);
      fetchExpenses();
    } catch (error) {
      console.error('Failed to delete expenses:', error);
      toast.error('Failed to delete expenses.');
    }
  };

  const handleOpenForm = (expense?: IExpense) => {
    setSelectedExpense(expense || null);
    setIsFormOpen(true);
  };

  const handleDuplicate = (expense: IExpense) => {
    if (!canCreate) {
      toast.error("You don't have permission to create expenses");
      return;
    }

    const plainExpense = JSON.parse(JSON.stringify(expense));
    const duplicateExpense = {
      ...plainExpense,
      date: new Date(),
      _id: undefined,
      referenceNumber: undefined,
      status: 'pending',
      paymentStatus: 'Pending',
      paidAmount: 0,
      remainingAmount: plainExpense.amount,
      connectedDocuments: { paymentIds: [] },
    };
    setSelectedExpense(duplicateExpense as unknown as IExpense);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: any, id?: string) => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;

    try {
      const url = id ? `/api/expenses/${id}` : "/api/expenses";
      const method = id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to save expense");
      }

      toast.success(id ? "Expense updated successfully" : "Expense created successfully");
      setIsFormOpen(false);
      fetchExpenses();

      // Open view modal after creation
      if (!id) {
        const savedExpense = result.expense || result;
        // Fetch full details to ensure population
        const fullRes = await fetch(`/api/expenses/${savedExpense._id}`);
        if (fullRes.ok) {
          const fullExpense = await fullRes.json();
          setExpenseToView(fullExpense);
          setViewModalOpen(true);
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  // View PDF Handler
  const handleViewPdf = (doc: any) => {
    if (!doc || !doc._id) return;
    
    // Determine URL based on document type
    const url = `/api/vouchers/${doc._id}/pdf?type=payment`; 
    
    setPdfUrl(url);
    setPdfTitle(doc.invoiceNumber || "Payment Voucher");
    setIsPdfModalOpen(true);
  };

  // Fetch full expense details when viewing
  const handleViewExpense = async (expense: IExpense) => {
    try {
      // Always fetch full details to ensure connectedDocuments are populated
      const res = await fetch(`/api/expenses/${expense._id}`);
      if (res.ok) {
        const fullExpense = await res.json();
        setExpenseToView(fullExpense);
        setViewModalOpen(true);
      } else {
        // Fallback to the expense we have
        setExpenseToView(expense);
        setViewModalOpen(true);
      }
    } catch (error) {
      console.error("Error fetching full expense:", error);
      // Fallback to the expense we have
      setExpenseToView(expense);
      setViewModalOpen(true);
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
    handleOpenForm,
    handleViewExpense, // Use new handler that fetches full details
    (id: string) => {
        const expenseToDelete = expenses.find(e => e._id === id);
        if(expenseToDelete) handleDelete([expenseToDelete]);
    },
    { 
      canUpdate, 
      canDelete, 
      canCreatePayment: canUpdate,
      canCreate 
    }, 
    fetchExpenses,
    handleViewPdf,
    canCreate ? handleDuplicate : undefined
  ), [expenses, canUpdate, canDelete, canCreate, fetchExpenses]);

  const { table } = useDataTable<IExpense>({
    data: expenses,
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
      setUrlState({ sort: sorting as ExtendedColumnSort<IExpense>[] });
    },
    onColumnFiltersChange: (filters) => {
      setUrlState({
        filters: filters as ExtendedColumnFilter<IExpense>[],
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
                  <Banknote className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
                    {totalCount > 0 && (
                      <Badge variant="primary" appearance="outline">
                        {totalCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Track and manage your business expenses
                  </p>
                </div>
              </div>

              {/* Right: Actions & Filters Group */}
              <div className="flex flex-col gap-3 w-full lg:w-auto lg:items-end">
                
                {/* Row 1: Actions */}
                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  {canViewTrash && (
                    <Link href="./expenses/trash" className="w-full sm:w-auto">
                      <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <Trash2 className="h-4 w-4" />
                        Trash
                      </Button>
                    </Link>
                  )}
                  {canViewReports && (
                    <Link href="/reports/expense-report" className="w-full sm:w-auto">
                      <Button variant="outline" className="gap-2 w-full sm:w-auto">
                        <BarChart3 className="h-4 w-4" /> Reports
                      </Button>
                    </Link>
                  )}
                  {canCreate && (
                    <Button onClick={() => handleOpenForm()} className="gap-2 w-full sm:w-auto">
                      <Plus className="h-4 w-4" />
                      Record Expense
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
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex justify-center">
                  <TabsList className="grid w-full max-w-md grid-cols-3">
                    <TabsTrigger value="all">All Expenses</TabsTrigger>
                    <TabsTrigger value="single">One-time</TabsTrigger>
                    <TabsTrigger value="period">Recurring</TabsTrigger>
                  </TabsList>
                </div>

                <div className="mt-6">
                   <Card>
                    <CardContent className="p-6">
                      {isInitialLoad ? (
                        <DataTableSkeleton columnCount={columns.length} rowCount={10} />
                      ) : (
                        <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                          <DataTable table={table}>
                            <DataTableToolbar table={table} />
                          </DataTable>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </Tabs>

              {/* Empty State Card */}
              {expenses.length === 0 && !isInitialLoad && !isLoading && canCreate && (
                <Card className="mt-6 mx-4 lg:mx-6">
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Banknote className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No expenses yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Start tracking your business expenses by adding your first expense record.
                    </p>
                    <Button onClick={() => handleOpenForm()} className="gap-2">
                      <Plus className="h-4 w-4" /> Add Your First Expense
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {canCreate && (
        <ExpenseForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedExpense(null);
          }}
          onSubmit={handleFormSubmit}
          defaultValues={selectedExpense}
        />
      )}

      <ExpenseViewModal
        isOpen={viewModalOpen}
        onClose={() => {
          setViewModalOpen(false);
          setExpenseToView(null);
        }}
        expense={expenseToView}
        onViewPdf={handleViewPdf}
      />
      
      <PDFViewerModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        pdfUrl={pdfUrl}
        title={pdfTitle}
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
      <ExpensesPageContent />
    </Suspense>
  );
}