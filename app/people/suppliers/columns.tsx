// app/suppliers/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown, Pencil, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import type { ISupplier } from "@/models/Supplier";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SupplierPermissions {
  canUpdate: boolean;
  canDelete: boolean;
}

interface RowActionsProps {
  supplier: ISupplier;
  onEdit: (supplier: ISupplier) => void;
  onDelete: (supplier: ISupplier) => void;
  onViewDetails: (supplierName: string) => void;
  permissions: SupplierPermissions;
}

const RowActions = ({ supplier, onEdit, onDelete, onViewDetails, permissions }: RowActionsProps) => {
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
          
          <DropdownMenuItem onClick={() => onViewDetails(supplier.name)}>
            <Eye className="mr-2 w-4 h-4" />
            View Details
          </DropdownMenuItem>
          
          {canUpdate && (
            <DropdownMenuItem onClick={() => onEdit(supplier)}>
              <Pencil className="mr-2 w-4 h-4" />
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
                <Trash2 className="mr-2 w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the supplier "{supplier.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onDelete(supplier);
                setIsDeleteOpen(false);
              }}
              className={cn(buttonVariants({ variant: "destructive" }))}
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
  onEdit: (supplier: ISupplier) => void,
  onDelete: (supplier: ISupplier) => void,
  onViewDetails: (supplierName: string) => void,
  permissions: SupplierPermissions
): ColumnDef<ISupplier>[] => [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Supplier Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      meta: {
        label: "Name",
        placeholder: "Search supplier...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "contactNumbers",
      header: "Contact",
      cell: ({ row }) => {
        const contacts = row.original.contactNumbers;
        return (
          <div className="space-y-1">
            {contacts.slice(0, 2).map((number, index) => (
              <div key={index} className="text-sm">{number}</div>
            ))}
            {contacts.length > 2 && (
              <div className="text-xs text-muted-foreground">+{contacts.length - 2} more</div>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActions
          supplier={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDetails={onViewDetails}
          permissions={permissions}
        />
      ),
    },
  ];