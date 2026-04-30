// app/inventory-report/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters/currency";
import { cn } from "@/lib/utils";

export interface InventoryItemData {
  id: string;
  name: string;
  type: string;
  category: string;
  openingQty: number;
  purchased: number;
  sold: number;
  adjusted: number;
  closingQty: number;
  unitCost: number;
  stockValue: number;
  status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'In Stock': return 'success';
    case 'Low Stock': return 'warning';
    case 'Out of Stock': return 'destructive';
    default: return 'gray';
  }
};

export const getInventoryColumns = (): ColumnDef<InventoryItemData>[] => [
  {
    accessorKey: "name",
    header: "Material Name",
    cell: ({ row }) => (
      <div className="min-w-[150px]">
        <div className="font-medium">{row.original.name}</div>
        <div className="text-xs text-muted-foreground">{row.original.category}</div>
      </div>
    ),
    meta: {
      label: "Name / Category",
      placeholder: "Search material or category...",
      variant: "text",
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      const searchValue = value.toLowerCase();
      return (
        row.original.name.toLowerCase().includes(searchValue) ||
        row.original.category.toLowerCase().includes(searchValue)
      );
    },
  },
  {
    accessorKey: "openingQty",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="w-full justify-end"
      >
        Opening
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        {row.original.openingQty.toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: "purchased",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="w-full justify-end"
      >
        Purchased
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const qty = row.original.purchased;
      if (qty === 0) {
        return <div className="text-center text-muted-foreground">—</div>;
      }
      return (
        <div className="text-center text-green-600">
          +{qty.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "adjusted",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="w-full justify-end"
      >
        Adjusted
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const qty = row.original.adjusted;
      if (qty === 0) {
        return <div className="text-center text-muted-foreground">—</div>;
      }
      return (
        <div className={cn(
          "text-center font-medium",
          qty > 0 ? "text-green-600" : "text-red-600"
        )}>
          {qty > 0 ? '+' : ''}{qty.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "closingQty",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="w-full justify-end"
      >
        Closing
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center text-blue-600">
        {row.original.closingQty.toLocaleString()}
      </div>
    ),
  },
  {
    accessorKey: "unitCost",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="w-full justify-end"
      >
        Unit Cost
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono">
        {formatCurrency(row.original.unitCost)}
      </div>
    ),
  },
  {
    accessorKey: "stockValue",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="w-full justify-end"
      >
        Stock Value
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono">
        {formatCurrency(row.original.stockValue)}
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(status)} appearance="outline">
            {status}
          </Badge>
        </div>
      );
    },
  },
];