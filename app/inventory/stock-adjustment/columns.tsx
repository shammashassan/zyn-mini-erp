"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, ArrowUpCircle, ArrowDownCircle, Tag, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate, formatTime } from "@/utils/formatters/date";
import { useState } from "react";
import { cn } from "@/lib/utils";

// ✅ Export the interface
export interface IAdjustmentHistory {
  _id: string;
  materialName: string;
  adjustmentType: 'increment' | 'decrement';
  value: number;
  oldStock: number;
  newStock: number;
  oldUnitCost?: number;
  newUnitCost?: number;
  adjustmentReason?: string;
  createdAt: string;
}

interface StockAdjustmentPermissions {
  canDelete: boolean;
}

interface RowActionsProps {
  adjustment: IAdjustmentHistory;
  onDelete: (adjustment: IAdjustmentHistory) => void;
  permissions: StockAdjustmentPermissions;
}

const RowActions = ({ adjustment, onDelete, permissions }: RowActionsProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { canDelete } = permissions;

  if (!canDelete) return null;

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
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive cursor-pointer"
            onSelect={(e) => {
              e.preventDefault();
              setIsDeleteOpen(true);
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete this adjustment record. <br />
            <span className="font-semibold">This action will not revert the stock or unit cost change.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onDelete(adjustment);
              setIsDeleteOpen(false);
            }}
            variant="destructive"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const getAdjustmentHistoryColumns = (
  onDelete: (adjustment: IAdjustmentHistory) => void,
  permissions: StockAdjustmentPermissions
): ColumnDef<IAdjustmentHistory>[] => [
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")} className="h-8 px-2">
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return (
          <div className="text-left font-medium min-w-[100px]">
            <div>{formatDisplayDate(date)}</div>
            <div className="text-xs text-muted-foreground">
              {formatTime(date)}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "materialName",
      header: "Material",
      meta: {
        label: "Material",
        placeholder: "Search material...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "adjustmentReason",
      header: "Reason",
      cell: ({ row }) => <span className="text-muted-foreground truncate max-w-[200px] block">{row.original.adjustmentReason || '—'}</span>,
      meta: {
        label: "Reason",
        placeholder: "Search reason...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      id: 'adjustment',
      header: 'Adjustment',
      cell: ({ row }) => {
        const { adjustmentType, value, oldUnitCost, newUnitCost } = row.original;
        const hasStockChange = value > 0;
        const stockChange = adjustmentType === 'decrement' ? `-${value}` : `+${value}`;
        const isDecrement = adjustmentType === 'decrement';
        const unitCostChanged = typeof oldUnitCost === 'number' && typeof newUnitCost === 'number' && oldUnitCost !== newUnitCost;

        if (!hasStockChange && !unitCostChanged) {
          return <span className="text-muted-foreground">—</span>;
        }

        return (
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            {hasStockChange && (
              <div className="flex items-center gap-2 font-medium">
                {isDecrement ? (
                  <ArrowDownCircle className="h-4 w-4 shrink-0 text-red-500" />
                ) : (
                  <ArrowUpCircle className="h-4 w-4 shrink-0 text-green-500" />
                )}
                <span>Stock: <span className={isDecrement ? "text-red-500" : "text-green-500"}>{stockChange}</span></span>
              </div>
            )}
            {unitCostChanged && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4 shrink-0 text-blue-500" />
                <span>Price: {formatCurrency(oldUnitCost)} → {formatCurrency(newUnitCost)}</span>
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActions
          adjustment={row.original}
          onDelete={onDelete}
          permissions={permissions}
        />
      ),
    },
  ];