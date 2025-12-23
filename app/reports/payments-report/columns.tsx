// app/reports/payments-report/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate } from "@/utils/formatters/date";

// --- Interfaces ---

export interface PaymentTransactionData {
  date: string;
  journalNumber: string;
  referenceType: string;
  referenceNumber?: string;
  partyType?: string;
  partyName?: string;
  paymentMethod?: string;
  inflow: number;
  outflow: number;
  narration: string;
  journalId: string;
}

export interface MonthlyReportData {
  month: string;
  rawDate: string;
  totalInflow: number;
  totalOutflow: number;
  netMovement: number;
  inflowCount: number;
  outflowCount: number;
}

export const getMonthlyColumns = (): ColumnDef<MonthlyReportData>[] => [
  {
    accessorKey: "month",
    header: "Month",
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.month}
      </div>
    ),
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.original.rawDate).getTime();
      const dateB = new Date(rowB.original.rawDate).getTime();
      return dateA - dateB;
    },
    meta: {
      label: "Date",
      placeholder: "Search date...",
      variant: "text",
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      return formatDisplayDate(row.original.month).toLowerCase().includes(value.toLowerCase());
    },
  },
  {
    accessorKey: "inflowCount",
    header: "Receipts (Qty)",
    cell: ({ row }) => (
      <div className="text-center text-muted-foreground">
        {row.original.inflowCount}
      </div>
    ),
  },
  {
    accessorKey: "totalInflow",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="w-full justify-end"
      >
        Total Inflow
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono text-green-600">
        {formatCurrency(row.original.totalInflow)}
      </div>
    ),
  },
  {
    accessorKey: "outflowCount",
    header: "Payments (Qty)",
    cell: ({ row }) => (
      <div className="text-center text-muted-foreground">
        {row.original.outflowCount}
      </div>
    ),
  },
  {
    accessorKey: "totalOutflow",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="w-full justify-end"
      >
        Total Outflow
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono text-red-600">
        {formatCurrency(row.original.totalOutflow)}
      </div>
    ),
  },
  {
    accessorKey: "netMovement",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="w-full justify-end"
      >
        Net Change
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = row.original.netMovement;
      return (
        <div className={`text-right font-mono font-medium ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {formatCurrency(amount)}
        </div>
      );
    },
  },
];
