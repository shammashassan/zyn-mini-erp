// app/products/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown, Trash2, Pencil } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import type { IProduct } from "@/models/Product";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters/currency";
import { useState } from "react";

interface ProductPermissions {
  canUpdate: boolean;
  canDelete: boolean;
}

interface RowActionsProps {
  product: IProduct;
  onEdit: (product: IProduct) => void;
  onDelete: (id: string) => void;
  permissions: ProductPermissions;
}

const RowActions = ({ product, onEdit, onDelete, permissions }: RowActionsProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { canUpdate, canDelete } = permissions;

  return (
    <>
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
            <DropdownMenuItem onClick={() => onEdit(product)}>
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

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product "{product.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={() => {
                onDelete(String(product._id));
                setIsDeleteOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const getColumns = (
  onEdit: (product: IProduct) => void,
  onDelete: (id: string) => void,
  permissions: ProductPermissions
): ColumnDef<IProduct>[] => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: {
        label: "Name",
        placeholder: "Search product...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <Badge variant="secondary" appearance="outline">{row.original.type}</Badge>,
      meta: {
        label: "Type",
        variant: "select",
        options: [],
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "price",
      header: () => <div className="text-right">Price</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue("price"));
        return <div className="text-right font-medium">{formatCurrency(amount)}</div>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) =>
        <RowActions
          product={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
          permissions={permissions} />,
    },
  ];