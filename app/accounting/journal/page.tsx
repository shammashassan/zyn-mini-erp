// app/accounting/journal/page.tsx - UPDATED: Added canPost permission for status updates

"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import { toast } from "sonner";
import { NotebookPen, Plus, Trash2, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useDataTable } from "@/hooks/use-data-table";
import { JournalForm } from "./journal-form";
import { JournalViewModal } from "./JournalViewModal";
import { getJournalColumns, type IJournal } from "./columns";
import Link from "next/link";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { CalendarIcon, ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DateRange } from "react-day-picker";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { PartyContactSelector } from "@/components/PartyContactSelector";
import { useJournalPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { useQueryStates, parseAsInteger } from "nuqs";
import { getSortingStateParser, getFiltersStateParser } from "@/lib/data-table/parsers";
import type { ExtendedColumnSort, ExtendedColumnFilter } from "@/types/data-table";

function JournalPageContent() {
  const [journals, setJournals] = useState<IJournal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedJournal, setSelectedJournal] = useState<IJournal | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPartyName, setSelectedPartyName] = useState("");

  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // ✅ UPDATED: Added canPost permission
  const {
    permissions: {
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      canPost,
      canVoid,
      canViewTrash,
    },
    session,
    isPending,
  } = useJournalPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [urlState, setUrlState] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    pageSize: parseAsInteger.withDefault(10),
    sort: getSortingStateParser<IJournal>().withDefault([{ id: 'entryDate', desc: true }]),
    filters: getFiltersStateParser<IJournal>().withDefault([]),
  });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [typeSearchQuery, setTypeSearchQuery] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState<string>("");
  const [selectedPartyType, setSelectedPartyType] = useState<'customer' | 'supplier' | 'payee' | 'vendor' | undefined>(undefined);

  const typeOptions = [
    { value: "all", label: "All Types" },
    { value: "General", label: "General" },
    { value: "Contra", label: "Contra" },
    { value: "Adjustment", label: "Adjustment" },
    { value: "Invoice", label: "Invoice" },
    { value: "Receipt", label: "Receipt" },
    { value: "Payment", label: "Payment" },
    { value: "Purchase", label: "Purchase" },
    { value: "Expense", label: "Expense" },
    { value: "CreditNote", label: "Credit Note" },
    { value: "DebitNote", label: "Debit Note" },
    { value: "ReturnNote", label: "Return Note" },
  ];



  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 5)),
    to: endOfMonth(new Date())
  });



  const fetchJournals = useCallback(async (background = false) => {
    if (!canRead) return;
    try {
      if (!background) {
        setIsLoading(true);
      }

      const params = new URLSearchParams({
        page: urlState.page.toString(),
        pageSize: urlState.pageSize.toString(),
      });

      if (urlState.sort && urlState.sort.length > 0) {
        params.append('sort', JSON.stringify(urlState.sort));
      }
      if (urlState.filters && urlState.filters.length > 0) {
        params.append('filters', JSON.stringify(urlState.filters));
      }

      if (statusFilter !== "all") params.append("status", statusFilter);
      if (typeFilter !== "all") params.append("referenceType", typeFilter);
      if (dateRange?.from) params.append("startDate", dateRange.from.toISOString());
      if (dateRange?.to) params.append("endDate", dateRange.to.toISOString());
      if (selectedPartyId) params.append("partyId", selectedPartyId);

      const res = await fetch(`/api/journal?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch journals");

      const result = await res.json();

      if (result.data && result.pageCount !== undefined) {
        setJournals(result.data);
        setPageCount(result.pageCount);
        setTotalCount(result.totalCount);
      } else {
        setJournals(result);
      }
    } catch (error) {
      if (!background) {
        toast.error("Could not load journal entries.");
      }
    } finally {
      if (!background) {
        setIsLoading(false);
      }
      setIsInitialLoad(false);
    }
  }, [
    canRead,
    urlState.page,
    urlState.pageSize,
    urlState.sort,
    urlState.filters,
    statusFilter,
    typeFilter,
    dateRange,
    selectedPartyId
  ]);

  useEffect(() => {
    if (session && canRead) {
      fetchJournals();
    } else if (session && !canRead) {
      toast.error("You don't have permission to view journal entries", {
        description: "Only authorized users can access this page",
      });
      setIsLoading(false);
      setIsInitialLoad(false);
    }
  }, [canRead, fetchJournals]);

  useEffect(() => {
    const onFocus = () => {
      if (session && canRead) {
        fetchJournals(true);
      }
    };

    window.addEventListener("focus", onFocus);

    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [fetchJournals, session, canRead]);

  const handleOpenForm = (journal: IJournal | null = null) => {
    if (!canCreate && !journal) {
      toast.error("You don't have permission to create journal entries");
      return;
    }
    if (!canUpdate && journal) {
      toast.error("You don't have permission to update journal entries");
      return;
    }

    setSelectedJournal(journal);
    setIsFormOpen(true);
  };

  const handleViewJournal = (journal: IJournal) => {
    setSelectedJournal(journal);
    setIsViewModalOpen(true);
  };

  const handleFormSubmit = async (data: any, id?: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    const url = id ? `/api/journal/${id}` : "/api/journal";
    const method = id ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || `Failed to ${id ? "update" : "create"} journal entry.`);
      }

      toast.success(`Journal entry ${id ? "updated" : "created"} successfully.`);
      fetchJournals();
      setIsFormOpen(false);
      setSelectedJournal(null);

      const savedJournal = result.journal || result;
      setSelectedJournal(savedJournal);
      setIsViewModalOpen(true);

    } catch (error: any) {
      toast.error(error.message || `Failed to ${id ? "update" : "create"} journal entry.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (selectedJournals: IJournal[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete journal entries");
      return;
    }

    try {
      const deletePromises = selectedJournals.map((journal) =>
        fetch(`/api/journal/${journal._id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      toast.success(`${selectedJournals.length} journal entry moved to trash.`);
      fetchJournals();
    } catch (error) {
      console.error('Failed to delete journals:', error);
      toast.error('Failed to delete journal entries.');
    }
  };

  const handleVoid = async (journal: IJournal) => {
    if (!canVoid) {
      toast.error("You don't have permission to void journal entries");
      return;
    }

    try {
      const res = await fetch(`/api/journal/${journal._id}/void`, {
        method: 'POST',
      });

      if (!res.ok) throw new Error("Failed to void journal entry");

      toast.success("Journal entry voided successfully.");
      fetchJournals();
    } catch (error) {
      toast.error("Failed to void journal entry.");
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

  const clearFilters = () => {
    setStatusFilter("all");
    setTypeFilter("all");
    setSelectedPartyId("");
    setSelectedPartyType(undefined);
    setDateRange({
      from: startOfMonth(subMonths(new Date(), 5)),
      to: endOfMonth(new Date())
    });
    setUrlState({ page: 1, filters: [] });
  };

  // ✅ UPDATED: Pass canPost permission to getJournalColumns
  const columns = useMemo(() => getJournalColumns(
    handleViewJournal,
    (journal) => handleOpenForm(journal),
    (journal) => handleDelete([journal]),
    handleVoid,
    { canUpdate, canDelete, canPost, canVoid },
    fetchJournals
  ), [journals, canUpdate, canDelete, canPost, canVoid, fetchJournals]);

  const { table } = useDataTable<IJournal>({
    data: journals,
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
      setUrlState({ sort: sorting as ExtendedColumnSort<IJournal>[] });
    },
    onColumnFiltersChange: (filters) => {
      setUrlState({
        filters: filters as ExtendedColumnFilter<IJournal>[],
        page: 1,
      });
    },
    getRowId: (row) => row._id,
  });



  const hasActiveFilters = statusFilter !== "all" || typeFilter !== "all" ||
    selectedPartyId !== "" ||
    (dateRange?.from?.getTime() !== startOfMonth(subMonths(new Date(), 5)).getTime()) ||
    (dateRange?.to?.getTime() !== endOfMonth(new Date()).getTime()) ||
    (urlState.filters && urlState.filters.length > 0);

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
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 px-4 lg:px-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <NotebookPen className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">Journal Entries</h1>
                    {totalCount > 0 && (
                      <Badge variant="primary" appearance="outline">
                        {totalCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    Double-entry accounting transactions
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canViewTrash && (
                  <Link href="/accounting/journal/trash">
                    <Button variant="outline" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Trash
                    </Button>
                  </Link>
                )}
                {canCreate && (
                  <Button
                    onClick={() => handleOpenForm()}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    New Entry
                  </Button>
                )}
              </div>
            </div>

            <div className="px-4 lg:px-6">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <h3 className="font-medium">Filters</h3>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearFilters}
                        className="ml-auto text-xs"
                      >
                        Clear Filters
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setUrlState({ page: 1 }); }}>
                        <SelectTrigger className="w-full justify-between font-normal px-3">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="posted">Posted</SelectItem>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="void">Void</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal px-3"
                          >
                            <span className="truncate">
                              {typeOptions.find((t) => t.value === typeFilter)?.label || "All types"}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Search type..." />
                            <CommandList className="max-h-[200px] overflow-y-auto">
                              <CommandEmpty>No type found.</CommandEmpty>
                              <CommandGroup>
                                {typeOptions.map((type) => (
                                  <CommandItem
                                    key={type.value}
                                    value={type.label}
                                    onSelect={() => {
                                      setTypeFilter(type.value);
                                      setUrlState({ page: 1 });
                                      setTypePopoverOpen(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        typeFilter === type.value
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    {type.label}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Date Range</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-between px-3 font-normal"
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
                            onSelect={(range) => { setDateRange(range); setUrlState({ page: 1 }); }}
                            captionLayout="dropdown"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Quick Select</Label>
                      <Select onValueChange={handleQuickSelect}>
                        <SelectTrigger className="w-full">
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

                  <div className="pt-4 border-t">
                    <div className="space-y-2">
                      <PartyContactSelector
                        allowedRoles={['customer', 'supplier', 'payee', 'vendor']}
                        value={{
                          partyId: selectedPartyId,
                          partyType: selectedPartyType,
                          partyName: selectedPartyName
                        }}
                        onChange={(val) => {
                          setSelectedPartyId(val.partyId ?? "");
                          setSelectedPartyType(val.partyType);
                          setSelectedPartyName(val.partyName ?? "");
                          setUrlState({ page: 1 });
                        }}
                        showContactSelector={false}
                        layout="horizontal"
                        className="w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col gap-4 px-4 lg:px-6 xl:gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                    {isInitialLoad ? (
                      <DataTableSkeleton
                        columnCount={columns.length}
                        rowCount={10}
                      />
                    ) : (
                      <DataTable table={table}>
                        <DataTableToolbar table={table} />
                      </DataTable>
                    )}
                  </div>
                </CardContent>
              </Card>

              {journals.length === 0 && !isInitialLoad && !isLoading && !hasActiveFilters && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <NotebookPen className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No journal entries yet</h3>
                    <p className="text-muted-foreground text-center mb-4 max-w-md">
                      Start recording your accounting transactions using double-entry bookkeeping.
                    </p>
                    {canCreate && (
                      <Button onClick={() => handleOpenForm()} className="gap-2">
                        <Plus className="h-4 w-4" /> Create First Entry
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <JournalForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedJournal(null);
        }}
        onSubmit={handleFormSubmit}
        defaultValues={selectedJournal}
      />

      <JournalViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedJournal(null);
        }}
        journal={selectedJournal}
      />
    </>
  );
}

export default function JournalPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10" />
      </div>
    }>
      <JournalPageContent />
    </Suspense>
  );
}