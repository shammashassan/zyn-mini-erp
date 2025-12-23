// app/accounting/trial-balance/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters/currency";

export interface TrialBalanceItem {
  accountCode: string;
  accountName: string;
  groupName: string;
  subGroup: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  nature: 'debit' | 'credit';
}

const getGroupColor = (group: string) => {
  switch (group) {
    case 'Assets': return 'success';
    case 'Liabilities': return 'destructive';
    case 'Equity': return 'primary';
    case 'Income': return 'success';
    case 'Expenses': return 'warning';
    default: return 'gray';
  }
};

export const columns: ColumnDef<TrialBalanceItem>[] = [
  {
    accessorKey: "accountCode",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2"
      >
        Code
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-mono font-bold text-sm">
        {row.original.accountCode}
      </div>
    ),
    meta: {
      label: "Code / Name / Sub Group",
      placeholder: "Search code or name or subgroup...",
      variant: "text",
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      const searchValue = value.toLowerCase();
      return (
        row.original.accountCode.toLowerCase().includes(searchValue) ||
        row.original.accountName.toLowerCase().includes(searchValue) ||
        row.original.subGroup.toLowerCase().includes(searchValue)
      );
    },
  },
  {
    accessorKey: "accountName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2"
      >
        Account Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-medium">{row.original.accountName}</div>
    ),
  },
  {
    accessorKey: "groupName",
    header: "Group",
    cell: ({ row }) => (
      <Badge
        variant={getGroupColor(row.original.groupName)}
        appearance="outline"
      >
        {row.original.groupName}
      </Badge>
    ),
    meta: {
      label: "Group",
      variant: "select",
      options: [], // Will be updated from page.tsx
    },
    enableColumnFilter: true,
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },
  {
    accessorKey: "subGroup",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2"
      >
        Subgroup
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.original.subGroup}</span>
    ),
  },
  {
    accessorKey: "totalDebit",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 justify-end w-full"
      >
        Debit
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right text-green-600 font-medium">
        {row.original.totalDebit > 0 ? formatCurrency(row.original.totalDebit) : '—'}
      </div>
    ),
  },
  {
    accessorKey: "totalCredit",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 justify-end w-full"
      >
        Credit
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-right text-red-600 font-medium">
        {row.original.totalCredit > 0 ? formatCurrency(row.original.totalCredit) : '—'}
      </div>
    ),
  },
  {
    accessorKey: "balance",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 justify-end w-full"
      >
        Balance
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const balance = row.original.balance;
      return (
        <div className="text-right font-medium flex items-center justify-end gap-2">
          <span>{formatCurrency(Math.abs(balance))}</span>
          <Badge
            variant={balance >= 0 ? 'primary' : 'warning'}
            appearance="outline"
            className="text-xs"
          >
            {balance >= 0 ? 'Dr' : 'Cr'}
          </Badge>
        </div>
      );
    },
  },
];