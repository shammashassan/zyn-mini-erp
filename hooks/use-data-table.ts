"use client";

import {
  type ColumnFiltersState,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
  type Updater,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";

import type { ExtendedColumnSort } from "@/types/data-table";

interface UseDataTableProps<TData>
  extends Omit<
      TableOptions<TData>,
      | "state"
      | "pageCount"
      | "getCoreRowModel"
      | "manualFiltering"
      | "manualPagination"
      | "manualSorting"
      | "onPaginationChange"
      | "onSortingChange"
      | "onColumnFiltersChange"
    > {
  /**
   * The total number of pages. Required for server-side pagination.
   * When provided, automatically enables server-side mode (manual pagination, sorting, filtering).
   */
  pageCount?: number;
  
  /**
   * Initial table state
   */
  initialState?: Omit<Partial<TableState>, "sorting"> & {
    sorting?: ExtendedColumnSort<TData>[];
  };
  
  /**
   * Callback fired when pagination state changes (server-side mode)
   */
  onPaginationChange?: (pagination: PaginationState) => void;
  
  /**
   * Callback fired when sorting state changes (server-side mode)
   */
  onSortingChange?: (sorting: SortingState) => void;
  
  /**
   * Callback fired when column filters change (server-side mode)
   */
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
}

export function useDataTable<TData>(props: UseDataTableProps<TData>) {
  const {
    columns,
    pageCount,
    initialState,
    onPaginationChange: externalOnPaginationChange,
    onSortingChange: externalOnSortingChange,
    onColumnFiltersChange: externalOnColumnFiltersChange,
    ...tableProps
  } = props;

  // ✅ DETECTION: Server-side mode is enabled when pageCount is provided
  const isServerSide = pageCount !== undefined;

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState?.rowSelection ?? {},
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialState?.columnVisibility ?? {});

  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: initialState?.pagination?.pageIndex ?? 0,
    pageSize: initialState?.pagination?.pageSize ?? 10,
  });

  const [sorting, setSorting] = React.useState<SortingState>(
    initialState?.sorting ?? [],
  );

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    initialState?.columnFilters ?? [],
  );

  // ✅ Wrapped handlers for server-side callbacks
  const handlePaginationChange = React.useCallback(
    (updater: Updater<PaginationState>) => {
      setPagination((old) => {
        const newValue = typeof updater === "function" ? updater(old) : updater;
        if (isServerSide && externalOnPaginationChange) {
          externalOnPaginationChange(newValue);
        }
        return newValue;
      });
    },
    [isServerSide, externalOnPaginationChange]
  );

  const handleSortingChange = React.useCallback(
    (updater: Updater<SortingState>) => {
      setSorting((old) => {
        const newValue = typeof updater === "function" ? updater(old) : updater;
        if (isServerSide && externalOnSortingChange) {
          externalOnSortingChange(newValue);
        }
        return newValue;
      });
    },
    [isServerSide, externalOnSortingChange]
  );

  const handleColumnFiltersChange = React.useCallback(
    (updater: Updater<ColumnFiltersState>) => {
      setColumnFilters((old) => {
        const newValue = typeof updater === "function" ? updater(old) : updater;
        if (isServerSide && externalOnColumnFiltersChange) {
          externalOnColumnFiltersChange(newValue);
        }
        return newValue;
      });
    },
    [isServerSide, externalOnColumnFiltersChange]
  );

  const table = useReactTable({
    ...tableProps,
    columns,
    // ✅ Only pass pageCount if server-side mode is enabled
    ...(isServerSide && { pageCount }),
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    defaultColumn: {
      ...tableProps.defaultColumn,
      enableColumnFilter: false,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: handlePaginationChange,
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    // ✅ CLIENT-SIDE MODELS: Only enabled when NOT in server-side mode
    getFilteredRowModel: isServerSide ? undefined : getFilteredRowModel(),
    getPaginationRowModel: isServerSide ? undefined : getPaginationRowModel(),
    getSortedRowModel: isServerSide ? undefined : getSortedRowModel(),
    getFacetedRowModel: isServerSide ? undefined : getFacetedRowModel(),
    getFacetedUniqueValues: isServerSide ? undefined : getFacetedUniqueValues(),
    getFacetedMinMaxValues: isServerSide ? undefined : getFacetedMinMaxValues(),
    // ✅ MANUAL FLAGS: Automatically set based on server-side mode
    manualPagination: isServerSide,
    manualSorting: isServerSide,
    manualFiltering: isServerSide,
  });

  return { table };
}