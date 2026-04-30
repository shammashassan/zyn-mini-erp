// app/expenses/columns.tsx - UPDATED: Center align trend column

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface ExpenseReportData {
  period: string;
  totalAmount: number;
  totalExpenses: number;
  categories: {
    category: string;
    amount: number;
    count: number;
  }[];
  topCategory: string;
  topCategoryAmount: number;
  averageExpense: number;
  highestExpense: number;
  trendVsLastMonth?: number; // percentage change from last month
}

const formatCurrency = (amount: number) => {
  return amount.toLocaleString('en-AE', { style: 'currency', currency: 'AED' });
};

const getCategoryColor = (category: string) => {
  const colors: { [key: string]: string } = {
    'Office Supplies': 'blue',
    'Travel': 'purple',
    'Marketing': 'pink',
    'Utilities': 'orange',
    'Software': 'indigo',
    'Equipment': 'green',
    'Meals': 'yellow',
    'Professional Services': 'cyan',
    'Rent': 'red',
    'Insurance': 'teal',
    'Training': 'violet',
    'Salary': 'orange',
    'Miscellaneous': 'gray'
  };
  return colors[category] || 'gray';
};

const formatTrendPercentage = (percentage?: number) => {
  // Return muted "N/A" if value is missing, matching the style of missing categories
  if (percentage === undefined || percentage === null) {
    return <span className="text-muted-foreground font-normal">N/A</span>;
  }
  
  const isPositive = percentage > 0;
  const isNegative = percentage < 0;

  return (
    <div className={cn(
      "flex items-center justify-center gap-1 text-sm font-medium", // Added justify-center
      isPositive && "text-red-600",
      isNegative && "text-green-600"
    )}>
      {isPositive && <TrendingUp className="h-3 w-3" />}
      {isNegative && <TrendingDown className="h-3 w-3" />}
      {percentage === 0 && <Minus className="h-3 w-3 text-muted-foreground" />}
      {Math.abs(percentage).toFixed(0)}%
    </div>
  );
};

export const getExpenseColumns = (): ColumnDef<ExpenseReportData>[] => [
  {
    accessorKey: "period",
    header: "Month",
    cell: ({ row }) => (
      <div className="font-medium">
        {row.original.period}
      </div>
    ),
    meta: {
      label: "Period",
      placeholder: "Search month...",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "topCategory",
    header: "Top Category",
    cell: ({ row }) => {
      const category = row.original.topCategory;
      return (
        <div className="space-y-1">
          <Badge 
            variant={(category ? getCategoryColor(category) : "secondary") as any} 
            appearance="outline"
            className={!category ? "text-muted-foreground font-normal" : ""}
          >
            {category || "N/A"}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "highestExpense",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Highest Expense
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-mono text-muted-foreground">
        {formatCurrency(row.original.highestExpense)}
      </div>
    ),
  },
  {
    accessorKey: "totalExpenses",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        No: of Expenses
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium text-center text-muted-foreground">
        {row.original.totalExpenses}
      </div>
    ),
  },
  {
    accessorKey: "totalAmount",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Total Expenses
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right font-mono text-red-600">
        {formatCurrency(row.original.totalAmount)}
      </div>
    ),
  },
  {
    accessorKey: "trendVsLastMonth",
    header: () => <div className="text-center">Trend vs Last Month</div>, // Centered Header
    cell: ({ row }) => (
      <div className="text-center flex justify-center"> {/* Centered Cell */}
        {formatTrendPercentage(row.original.trendVsLastMonth)}
      </div>
    ),
  },
];