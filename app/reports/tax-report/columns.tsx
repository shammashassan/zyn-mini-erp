"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters/currency";

export interface TaxReportData {
  period: string;
  salesTransactions: number;
  purchaseTransactions: number;
  salesTax: number;
  purchaseTax: number;
  netTaxLiability: number;
  revenueAmount: number;
  purchaseAmount: number;
  salesTaxRate: number;
  purchaseTaxRate: number;
}

const formatPercentage = (percentage: number) => {
  return `${percentage.toFixed(2)}%`;
};

export const getTaxColumns = (taxView: "sales" | "purchase"): ColumnDef<TaxReportData>[] => [
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
  ...(taxView === "sales" ? [
    {
      accessorKey: "revenueAmount",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Revenue (Ex-Tax)
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <div className="font-mono">{formatCurrency(row.original.revenueAmount)}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.salesTransactions} sales
          </div>
        </div>
      ),
    } as ColumnDef<TaxReportData>,
    {
      accessorKey: "salesTax",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Sales Tax Collected
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <div className="text-green-600 font-mono">{formatCurrency(row.original.salesTax)}</div>
          <div className="text-xs text-muted-foreground">
            {formatPercentage(row.original.salesTaxRate)} effective rate
          </div>
        </div>
      ),
    } as ColumnDef<TaxReportData>,
    {
      accessorKey: "salesTaxRate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Tax Rate
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium text-blue-600">
          {formatPercentage(row.original.salesTaxRate)}
        </div>
      ),
    } as ColumnDef<TaxReportData>
  ] : [
    {
      accessorKey: "purchaseAmount",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Purchases (Inc-Tax)
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right">
          <div className="font-mono">{formatCurrency(row.original.purchaseAmount)}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.purchaseTransactions} purchases
          </div>
        </div>
      ),
    } as ColumnDef<TaxReportData>,
    {
      accessorKey: "purchaseTax",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Purchase Tax Paid
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium">
          <div className="text-blue-600 font-mono">{formatCurrency(row.original.purchaseTax)}</div>
          <div className="text-xs text-muted-foreground">
            Already paid to suppliers
          </div>
        </div>
      ),
    } as ColumnDef<TaxReportData>,
    {
      accessorKey: "purchaseTaxRate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Tax Rate
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right font-medium text-blue-600">
          {formatPercentage(row.original.purchaseTaxRate)}
        </div>
      ),
    } as ColumnDef<TaxReportData>
  ]),
  {
    accessorKey: "netTaxLiability",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="float-right p-0 hover:bg-transparent">
        {taxView === "sales" ? "Net Tax Liability" : "Tax Credit Available"}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const netTax = row.original.netTaxLiability;
      const purchaseTax = row.original.purchaseTax;

      if (taxView === "purchase") {
        // For purchase view, show the purchase tax as a credit
        return (
          <div className="text-right text-green-600">
            <div className="font-mono">{formatCurrency(purchaseTax)}</div>
            <div className="text-xs font-normal text-muted-foreground">
              Credit against sales tax
            </div>
            <div className="text-xs font-normal text-muted-foreground opacity-75">
              Reduces government liability
            </div>
          </div>
        );
      }

      // For sales view, show net liability
      return (
        <div className={cn(
          "text-right",
          netTax >= 0 ? "text-orange-600" : "text-green-600"
        )}>
          <div className="font-mono">{formatCurrency(Math.abs(netTax))}</div>
          <div className="text-xs font-normal text-muted-foreground">
            {netTax >= 0 ? "Owe government" : "Government owes you"}
          </div>
          <div className="text-xs font-normal text-muted-foreground opacity-75">
            Sales tax - Purchase tax credit
          </div>
        </div>
      );
    },
  },
];