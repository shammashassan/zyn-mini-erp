// app/dashboard/columns.tsx - UPDATED: Cleaned for Invoice data

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, Eye, FileText, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate, formatTime } from "@/utils/formatters/date";

export interface RecentSale {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  grandTotal: number;
  createdAt: string;
  documentType?: "invoice"; // Always invoice
  status?: string;
}

export const getColumns = (onViewPdf: (sale: RecentSale) => void): ColumnDef<RecentSale>[] => [
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return (
        <div className="text-left font-medium">
          <div>{formatDisplayDate(date)}</div>
          <div className="text-xs text-muted-foreground">
            {formatTime(date)}
          </div>
        </div>
      );
    },
    meta: {
      label: "Date",
      placeholder: "Search date...",
      variant: "text",
    },
  },
  {
    accessorKey: "invoiceNumber",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Invoice No.
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-mono font-medium text-foreground">
        {row.getValue("invoiceNumber")}
      </div>
    ),
  },
  {
    accessorKey: "customerName",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Customer
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium">
        {row.getValue("customerName")}
      </div>
    ),
    meta: {
      label: "Customer",
      placeholder: "Search customer...",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "grandTotal",
    header: ({ column }) => (
      <Button variant="ghost" className="text-right" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Amount
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const amount = row.getValue("grandTotal");
      if (typeof amount !== 'number' || isNaN(amount)) {
        return <div className="text-right font-medium text-muted-foreground">-</div>;
      }
      return (
        <div className="text-right font-medium text-green-600">
          {formatCurrency(amount)}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => {
      const sale = row.original;
      return (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-muted">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onViewPdf(sale)} className="cursor-pointer">
                <Eye className="mr-2 h-4 w-4" />
                View PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];