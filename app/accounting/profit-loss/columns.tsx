"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency, formatCompactCurrency } from "@/utils/formatters/currency";

export interface ProfitLossData {
  period: string;
  orders: number;
  purchases: number;
  revenue: number;
  expenses: number;
  salesTax: number;
  purchaseTax: number;
  profit: number;
  orderAmount?: number;
  purchaseAmount?: number;
  expenseCount?: number;
}

export const getColumns = (): ColumnDef<ProfitLossData>[] => [
  {
    accessorKey: "period",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Month
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    meta: {
      label: "Period",
      placeholder: "Search month...",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "orderAmount",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Revenue
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">
        <div className="text-green-600">{formatCurrency(row.original.orderAmount || 0)}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.orders} orders
        </div>
      </div>
    ),
  },
  {
    accessorKey: "purchaseAmount",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Purchases
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium text-yellow-600">
        <div>{formatCurrency(row.original.purchaseAmount || 0)}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.purchases} purchases
        </div>
      </div>
    ),
  },
  {
    accessorKey: "expenses",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Expenses
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center font-medium">
        <div className="text-red-600">{formatCurrency(row.original.expenses)}</div>
        <div className="text-xs text-muted-foreground">
          {row.original.expenseCount || 0} expenses
        </div>
      </div>
    ),
  },
  {
    accessorKey: "salesTax",
    header: "Sales Tax",
    cell: ({ row }) => (
      <div className="text-center font-medium text-orange-600">
        {formatCurrency(row.original.salesTax)}
      </div>
    ),
  },
  {
    accessorKey: "purchaseTax",
    header: "Purchase Tax",
    cell: ({ row }) => (
      <div className="text-center font-medium text-orange-600">
        {formatCurrency(row.original.purchaseTax)}
      </div>
    ),
  },
  {
    accessorKey: "profit",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="float-right p-0 hover:bg-transparent">
        Net Profit/Loss
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const profit = row.original.profit;
      return (
        <div className={cn(
          "text-center font-bold",
          profit >= 0 ? "text-green-600" : "text-red-600"
        )}>
          <div>{formatCurrency(profit)}</div>
        </div>
      );
    },
  },
];