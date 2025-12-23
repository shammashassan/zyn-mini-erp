// app/accounting/chart-of-accounts/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
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
import type { IChartOfAccount } from "@/models/ChartOfAccount";
import { useState } from "react";
import { cn } from "@/lib/utils";

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

const getNatureColor = (nature: string) => {
  return nature === 'debit' ? 'primary' : 'warning';
};

// Delete Dialog Component
const DeleteCOADialog = ({
  account,
  onDelete,
  trigger
}: {
  account: IChartOfAccount;
  onDelete: (account: IChartOfAccount) => void;
  trigger: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <div onClick={() => setIsOpen(true)}>{trigger}</div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Chart of Account</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{account.accountCode} - {account.accountName}</strong>?
            <br /><br />
            This will move the account to trash. You can restore it later if needed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onDelete(account);
              setIsOpen(false);
            }}
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

interface COAPermissions {
  canUpdate: boolean;
  canDelete: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
}

export const getCOAColumns = (
  onEdit: (account: IChartOfAccount) => void,
  onDelete: (account: IChartOfAccount) => void,
  onToggleStatus: (account: IChartOfAccount) => void,
  permissions: COAPermissions
): ColumnDef<IChartOfAccount>[] => [
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
        label: "Code / Name / SubGroup",
        placeholder: "Search code, name or subgroup...",
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
        <div>
          <div className="font-medium">{row.original.accountName}</div>
          {row.original.description && (
            <div className="text-xs text-muted-foreground line-clamp-1">
              {row.original.description}
            </div>
          )}
        </div>
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
      accessorKey: "nature",
      header: "Nature",
      cell: ({ row }) => (
        <Badge
          variant={getNatureColor(row.original.nature)}
          appearance="outline"
          className="capitalize"
        >
          {row.original.nature}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={row.original.isActive ? 'success' : 'gray'}
          appearance="outline"
        >
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        return value.includes(row.getValue(id));
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const account = row.original;
        const { canUpdate, canDelete, canActivate, canDeactivate } = permissions;

        // If no actions are available, hide the dropdown trigger
        if (!canUpdate && !canDelete && !canActivate && !canDeactivate) {
          return null;
        }

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>

              {canUpdate && (
                <DropdownMenuItem
                  onClick={() => onEdit(account)}
                  className="cursor-pointer"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}

              {(canActivate || canDeactivate) && (
                <DropdownMenuItem
                  onClick={() => onToggleStatus(account)}
                  className="cursor-pointer"
                  disabled={account.isActive ? !canDeactivate : !canActivate}
                >
                  {account.isActive ? (
                    <>
                      <ToggleLeft className="mr-2 h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <ToggleRight className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              {canDelete && (
                <DeleteCOADialog
                  account={account}
                  onDelete={onDelete}
                  trigger={
                    <DropdownMenuItem
                      className="text-destructive cursor-pointer"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  }
                />
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];