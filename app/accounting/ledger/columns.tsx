// app/ledger/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/utils/formatters/currency";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDisplayDate, formatTime } from "@/utils/formatters/date";

export interface LedgerEntry {
  date: string;
  journalNumber: string;
  referenceType: string;
  referenceNumber?: string;
  narration: string;
  debit: number;
  credit: number;
  balance: number;
  journalId: string;
}

interface AccountColorConfig {
  accountCode: string;
  debitColor: 'green' | 'red';
  creditColor: 'green' | 'red';
}

// Account color configurations based on your chart
const ACCOUNT_COLORS: Record<string, AccountColorConfig> = {
  // Cash Accounts - Green inflow, Red outflow
  'A1001': { accountCode: 'A1001', debitColor: 'green', creditColor: 'red' },
  'A1002': { accountCode: 'A1002', debitColor: 'green', creditColor: 'red' },
  'A1003': { accountCode: 'A1003', debitColor: 'green', creditColor: 'red' },

  // Accounts Receivable - Red = owe more, Green = payment received
  'A1100': { accountCode: 'A1100', debitColor: 'red', creditColor: 'green' },

  // Inventory & Fixed Assets - Red = purchase, Green = sale/disposal
  'A1200': { accountCode: 'A1200', debitColor: 'red', creditColor: 'green' },
  'A2001': { accountCode: 'A2001', debitColor: 'red', creditColor: 'green' },
  'A2002': { accountCode: 'A2002', debitColor: 'red', creditColor: 'green' },
  'A2003': { accountCode: 'A2003', debitColor: 'red', creditColor: 'green' },
  'A2004': { accountCode: 'A2004', debitColor: 'red', creditColor: 'green' },

  // Equity - Green = capital added, Red = withdrawal
  'E1001': { accountCode: 'E1001', debitColor: 'green', creditColor: 'red' },
  'E1002': { accountCode: 'E1002', debitColor: 'green', creditColor: 'red' },
  'E1003': { accountCode: 'E1003', debitColor: 'green', creditColor: 'red' },

  // Income - Red = reversal, Green = revenue earned
  'I1001': { accountCode: 'I1001', debitColor: 'red', creditColor: 'green' },
  'I1002': { accountCode: 'I1002', debitColor: 'red', creditColor: 'green' },
  'I2001': { accountCode: 'I2001', debitColor: 'red', creditColor: 'green' },
  'I2002': { accountCode: 'I2002', debitColor: 'red', creditColor: 'green' },

  // Accounts Payable - Green = payment made, Red = owe more
  'L1001': { accountCode: 'L1001', debitColor: 'green', creditColor: 'red' },
  'L1002': { accountCode: 'L1002', debitColor: 'green', creditColor: 'red' },
  'L1003': { accountCode: 'L1003', debitColor: 'green', creditColor: 'red' },
  'L2001': { accountCode: 'L2001', debitColor: 'green', creditColor: 'red' },

  // Expenses - Red = expense incurred, Green = reversal/refund
  'X1001': { accountCode: 'X1001', debitColor: 'red', creditColor: 'green' },
  'X2001': { accountCode: 'X2001', debitColor: 'red', creditColor: 'green' },
  'X2002': { accountCode: 'X2002', debitColor: 'red', creditColor: 'green' },
  'X2003': { accountCode: 'X2003', debitColor: 'red', creditColor: 'green' },
  'X2004': { accountCode: 'X2004', debitColor: 'red', creditColor: 'green' },
  'X2005': { accountCode: 'X2005', debitColor: 'red', creditColor: 'green' },
  'X2006': { accountCode: 'X2006', debitColor: 'red', creditColor: 'green' },
  'X2007': { accountCode: 'X2007', debitColor: 'red', creditColor: 'green' },
  'X2008': { accountCode: 'X2008', debitColor: 'red', creditColor: 'green' },
  'X2009': { accountCode: 'X2009', debitColor: 'red', creditColor: 'green' },
  'X2010': { accountCode: 'X2010', debitColor: 'red', creditColor: 'green' },
  'X2011': { accountCode: 'X2011', debitColor: 'red', creditColor: 'green' },
  'X2012': { accountCode: 'X2012', debitColor: 'red', creditColor: 'green' },
  'X2013': { accountCode: 'X2013', debitColor: 'red', creditColor: 'green' },
  'X2014': { accountCode: 'X2014', debitColor: 'red', creditColor: 'green' },
  'X3001': { accountCode: 'X3001', debitColor: 'red', creditColor: 'green' },
  'X4001': { accountCode: 'X4001', debitColor: 'red', creditColor: 'green' },
};

// Get color class based on account and amount type
const getAmountColor = (accountCode: string, isDebit: boolean): string => {
  const config = ACCOUNT_COLORS[accountCode];
  if (!config) {
    // Default: debit=green, credit=red for debit nature accounts
    return isDebit ? 'text-green-600' : 'text-red-600';
  }

  if (isDebit) {
    return config.debitColor === 'green' ? 'text-green-600' : 'text-red-600';
  } else {
    return config.creditColor === 'green' ? 'text-green-600' : 'text-red-600';
  }
};

const getReferenceTypeVariant = (type: string) => {
  switch (type) {
    case 'Invoice': return 'primary';
    case 'Receipt': return 'success';
    case 'Payment': return 'destructive';
    case 'Purchase': return 'warning';
    case 'Expense': return 'info';
    case 'DebitNote': return 'cyan';
    case 'CreditNote': return 'orange';
    case 'ReturnNote': return 'destructive';
    case 'Manual': return 'secondary';
    default: return 'secondary';
  }
};

// Copy to clipboard function
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    toast.success(`Copied: ${text}`);
  }).catch(() => {
    toast.error("Failed to copy");
  });
};

export const getLedgerColumns = (
  accountCode: string
): ColumnDef<LedgerEntry>[] => [
    {
      accessorKey: "date",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-left font-medium min-w-[100px]">
          <div>{formatDisplayDate(row.original.date)}</div>
          <div className="text-xs text-muted-foreground">
            {formatTime(row.original.date)}
          </div>
        </div>
      ),
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(rowA.original.date);
        const dateB = new Date(rowB.original.date);
        return dateA.getTime() - dateB.getTime();
      },
    },
    {
      accessorKey: "journalNumber",
      header: "Journal #",
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity"
          onClick={() => copyToClipboard(row.original.journalNumber)}
        >
          {row.original.journalNumber}
        </Badge>
      ),
      meta: {
        label: "Journal / Reference / Narration",
        placeholder: "Search journal #, reference, or narration...",
        variant: "text",
      },
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const searchValue = value.toLowerCase();
        return (
          row.original.journalNumber.toLowerCase().includes(searchValue) ||
          (row.original.referenceNumber?.toLowerCase() || "").includes(searchValue) ||
          row.original.narration.toLowerCase().includes(searchValue) ||
          false
        );
      },
    },
    // REMOVED: Separate Reference Type column
    {
      accessorKey: "referenceNumber",
      header: "Reference",
      cell: ({ row }) => {
        const refNumber = row.original.referenceNumber;
        const refType = row.original.referenceType;

        if (!refNumber) {
          return <span className="text-muted-foreground text-xs">—</span>;
        }

        return (
          <Badge
            variant={getReferenceTypeVariant(refType) as any}
            appearance="outline"
            className="font-mono cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => copyToClipboard(refNumber)}
          >
            {refNumber}
          </Badge>
        );
      },
      meta: {
        label: "Reference",
        placeholder: "Search reference...",
        variant: "text",
      },
    },
    {
      accessorKey: "narration",
      header: "Narration",
      cell: ({ row }) => (
        <div className="max-w-md">
          <div className="text-sm line-clamp-2">
            {row.original.narration}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "debit",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 w-full justify-end"
        >
          Debit
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.original.debit;
        if (amount === 0) {
          return <div className="text-right text-muted-foreground">—</div>;
        }
        return (
          <div className={cn(
            "text-right font-semibold",
            getAmountColor(accountCode, true)
          )}>
            {formatCurrency(amount)}
          </div>
        );
      },
    },
    {
      accessorKey: "credit",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 w-full justify-end"
        >
          Credit
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.original.credit;
        if (amount === 0) {
          return <div className="text-right text-muted-foreground">—</div>;
        }
        return (
          <div className={cn(
            "text-right font-semibold",
            getAmountColor(accountCode, false)
          )}>
            {formatCurrency(amount)}
          </div>
        );
      },
    },
    {
      accessorKey: "balance",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 w-full justify-end"
        >
          Balance
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const balance = row.original.balance;
        return (
          <div className={cn(
            "text-right font-bold",
            balance >= 0 ? "text-blue-600" : "text-orange-600"
          )}>
            {formatCurrency(Math.abs(balance))}
            {balance < 0 && <span className="text-xs ml-1">Dr</span>}
          </div>
        );
      },
    },
  ];