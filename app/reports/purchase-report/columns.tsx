// app/purchase-report/columns.tsx - Summary columns only (no breakdown)

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatMonthKey } from "@/utils/formatters/date";

export interface SummaryPurchaseData {
  month: string; // Format: "Jan 2024"
  totalAmount: number; // Purchase amount excluding tax
  totalTax: number; // Tax amount
  totalNetTotal: number; // Total including tax
  purchaseCount: number; // Number of purchases
  avgPurchaseValue: number; // Average value per purchase
}

export const getSummaryPurchaseColumns = (): ColumnDef<SummaryPurchaseData>[] => [
  {
    accessorKey: "month",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Month
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const monthStr = row.original.month;
      // If month is in format "2024-01", convert to "Jan 2024"
      let displayMonth = monthStr;
      if (monthStr.match(/^\d{4}-\d{2}$/)) {
        const [year, month] = monthStr.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        displayMonth = formatMonthKey(date);
      }
      return (
        <div className="font-medium">
          {displayMonth}
        </div>
      );
    },
    meta: {
      label: "Month",
      placeholder: "Search month...",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "purchaseCount",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Purchases
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">
        {row.original.purchaseCount}
        <div className="text-xs text-muted-foreground">
          received
        </div>
      </div>
    ),
  },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Amount
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-bold text-red-600">
        {formatCurrency(row.original.totalAmount)}
        <div className="text-xs text-muted-foreground">
          ex-tax
        </div>
      </div>
    ),
  },
  {
    accessorKey: "totalTax",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Tax
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium text-orange-600">
        {formatCurrency(row.original.totalTax)}
      </div>
    ),
  },
  {
    accessorKey: "totalNetTotal",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="float-right p-0 hover:bg-transparent">
        Net Total
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-bold text-blue-600">
        {formatCurrency(row.original.totalNetTotal)}
        <div className="text-xs text-muted-foreground">
          Avg: {formatCurrency(row.original.avgPurchaseValue)}
        </div>
      </div>
    ),
  },
];