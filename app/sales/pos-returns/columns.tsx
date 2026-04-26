"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  ArrowUpDown,
  MoreHorizontal,
  Trash2,
  FileText,
  Eye,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatDisplayDate, formatTime } from "@/utils/formatters/date";
import { formatCurrency } from "@/utils/formatters/currency";
import { cn } from "@/lib/utils";

export interface POSReturn {
  _id: string;
  returnNumber: string;
  returnType: 'posReturn';
  posSaleId?: any;
  items: Array<{
    description?: string;
    itemName?: string;
    returnQuantity: number;
    rate?: number;
    total?: number;
  }>;
  returnDate: string;
  createdAt: string;
  reason: string;
  status: "pending" | "approved" | "cancelled";
  totalAmount?: number;
  grandTotal?: number;
  isDeleted: boolean;
}

interface RowActionsProps {
  posReturn: POSReturn;
  onDelete: (id: string) => void;
  onViewPdf?: (posReturn: POSReturn) => void;
  canDelete: boolean;
}

const RowActions = ({
  posReturn,
  onDelete,
  onViewPdf,
  canDelete,
}: RowActionsProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

  return (
    <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          {onViewPdf && (
            <DropdownMenuItem onClick={() => onViewPdf(posReturn)}>
              <FileText className="mr-2 h-4 w-4" />
              Print Receipt
            </DropdownMenuItem>
          )}

          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onSelect={(e) => {
                  e.preventDefault();
                  setIsDeleteOpen(true);
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete POS Return</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="w-full space-y-4">
              <p>Are you sure you want to delete POS return {posReturn.returnNumber}?</p>
              <div className="space-y-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                  ⚠️ This action will:
                </p>
                <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                  <li>Remove the link from the original POS Sale</li>
                  <li>Revert the inventory deductions</li>
                  <li>Void the accounting journal</li>
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => {
              onDelete(String(posReturn._id));
              setIsDeleteOpen(false);
            }}
          >
            Delete Return
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const getColumns = (
  onDelete: (id: string) => void,
  onViewPdf: (posReturn: POSReturn) => void,
  canDelete: boolean
): ColumnDef<POSReturn>[] => [
    {
      id: "createdAt",
      accessorKey: "createdAt",
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
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return (
          <div className="text-left font-medium min-w-[100px]">
            <div>{formatDisplayDate(date)}</div>
            <div className="text-xs text-muted-foreground">{formatTime(date)}</div>
          </div>
        );
      },
    },
    {
      id: "returnNumber",
      accessorKey: "returnNumber",
      header: "Return No.",
      cell: ({ row }) => (
        <span className="font-mono font-medium">
          {row.getValue("returnNumber")}
        </span>
      ),
      meta: {
        label: "Return No.",
        placeholder: "Search return no...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      id: "posSaleId",
      header: "Original Sale",
      cell: ({ row }) => {
        const posSale = row.original.posSaleId as any;
        return (
          <span className="text-sm text-muted-foreground">
            {posSale?.saleNumber || "—"}
          </span>
        );
      },
    },
    {
      id: "itemsCount",
      header: "Items Returned",
      cell: ({ row }) => {
        const items = row.original.items || [];
        const displayItems = items.slice(0, 2);
        const remainingCount = items.length - 2;

        return (
          <div className="flex flex-col gap-0.5 text-sm">
            {displayItems.map((item, idx) => {
              const itemName = item.description || item.itemName || 'Unknown';
              return (
                <div key={idx} className="text-muted-foreground">
                  {itemName}:{" "}
                  <span className="font-medium text-red-600">
                    {item.returnQuantity}
                  </span>
                </div>
              );
            })}
            {remainingCount > 0 && (
              <div className="text-muted-foreground">+{remainingCount} more</div>
            )}
          </div>
        );
      },
    },
    {
      id: "grandTotal",
      header: "Refund Amount",
      cell: ({ row }) => {
        const amount = row.original.grandTotal || 0;
        return (
          <div className="text-right font-semibold text-red-600">
            {formatCurrency(amount)}
          </div>
        );
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="success" appearance="outline" className="gap-1 capitalize">
          <CheckCircle className="h-3 w-3" />
          {row.original.status || "approved"}
        </Badge>
      ),
    },
    {
      id: "reason",
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
          {row.getValue("reason")}
        </span>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActions
          posReturn={row.original}
          onDelete={onDelete}
          onViewPdf={onViewPdf}
          canDelete={canDelete}
        />
      ),
    },
  ];
