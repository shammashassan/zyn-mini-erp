// app/customers/columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown, FileText, Pencil, Trash2, Eye } from "lucide-react";
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
import type { ICustomer } from "@/models/Customer";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface CustomerPermissions {
  canUpdate: boolean;
  canDelete: boolean;
}

interface RowActionsProps {
  customer: ICustomer;
  onEdit: (customer: ICustomer) => void;
  onDelete: (id: string) => void;
  onViewDocuments: (customerName: string) => void;
  permissions: CustomerPermissions;
}

const RowActions = ({ customer, onEdit, onDelete, onViewDocuments, permissions }: RowActionsProps) => {
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
          <DropdownMenuItem onClick={() => onViewDocuments(customer.name)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
                    
          {canUpdate && (
            <DropdownMenuItem onClick={() => onEdit(customer)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive"
                onClick={() => setIsDeleteOpen(true)}
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
              This action cannot be undone. This will permanently delete the customer "{customer.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={() => {
                onDelete(String(customer._id));
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
  onEdit: (customer: ICustomer) => void,
  onDelete: (id: string) => void,
  onViewDocuments: (customerName: string) => void,
  permissions: CustomerPermissions
): ColumnDef<ICustomer>[] => [
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
        placeholder: "Search customer...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "phone",
      header: "Phone",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActions
          customer={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
          onViewDocuments={onViewDocuments}
          permissions={permissions}
        />
      )
    },
  ];