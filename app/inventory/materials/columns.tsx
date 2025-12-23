// app/materials/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { IMaterial } from "@/models/Material";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/utils/formatters/currency";
import { useState } from "react";

interface MaterialPermissions {
  canUpdate: boolean;
  canDelete: boolean;
}

interface RowActionsProps {
  material: IMaterial;
  onEdit: (material: IMaterial) => void;
  onDelete: (id: string) => void;
  permissions: MaterialPermissions;
}

const RowActions = ({ material, onEdit, onDelete, permissions }: RowActionsProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { canUpdate, canDelete } = permissions;

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
          
          {canUpdate && (
            <DropdownMenuItem onClick={() => onEdit(material)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
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
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the material "{material.name}".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            onClick={() => {
              onDelete(String(material._id));
              setIsDeleteOpen(false);
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const getColumns = (
  onEdit: (material: IMaterial) => void,
  onDelete: (id: string) => void,
  permissions: MaterialPermissions
): ColumnDef<IMaterial>[] => [

    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: {
        label: "Name",
        placeholder: "Search material...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge variant="secondary" appearance="outline">
          {row.original.type}
        </Badge>
      ),
      meta: {
        label: "Type",
        variant: "select",
        options: [],
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "stock",
      header: () => <div className="text-right">Stock</div>,
      cell: ({ row }) => <div className="text-right">{`${row.original.stock} ${row.original.unit}`}</div>,
    },
    {
      accessorKey: "unitCost",
      header: () => <div className="text-right">Unit Cost</div>,
      cell: ({ row }) => <div className="text-right font-medium">{formatCurrency(row.original.unitCost)}</div>,
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActions
          material={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
          permissions={permissions}
        />
      ),
    },
  ];