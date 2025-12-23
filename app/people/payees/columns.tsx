"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown, Pencil, Trash2, Eye, User, Briefcase, Home, UserCheck, Utensils, Boxes } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import type { IPayee } from "@/models/Payee";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface PayeePermissions {
  canUpdate: boolean;
  canDelete: boolean;
}

interface RowActionsProps {
  payee: IPayee;
  onEdit: (payee: IPayee) => void;
  onDelete: (id: string) => void;
  onViewDetails: (payee: IPayee) => void;
  permissions: PayeePermissions;
}

const getTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    employee: 'blue',
    landlord: 'purple',
    consultant: 'cyan',
    restaurant: 'orange',
    vendor: 'green',
    contractor: 'pink',
    utility_company: 'yellow',
    service_provider: 'indigo',
    government: 'red',
    individual: 'secondary',
    miscellaneous: 'gray'
  };
  return colors[type] || 'secondary';
};

const getTypeIcon = (type: string) => {
  const icons: Record<string, any> = {
    employee: User,
    landlord: Home,
    consultant: UserCheck,
    restaurant: Utensils,
    vendor: Briefcase,
    contractor: UserCheck,
    utility_company: Boxes,
    service_provider: Briefcase,
    government: Briefcase,
    individual: User,
    miscellaneous: Boxes
  };
  return icons[type] || User;
};

const RowActions = ({ payee, onEdit, onDelete, onViewDetails, permissions }: RowActionsProps) => {
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
          <DropdownMenuItem onClick={() => onViewDetails(payee)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          
          {canUpdate && (
            <DropdownMenuItem onClick={() => onEdit(payee)}>
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
              This action cannot be undone. This will permanently delete the payee "{payee.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={() => {
                onDelete(String(payee._id));
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
  onEdit: (payee: IPayee) => void,
  onDelete: (id: string) => void,
  onViewDetails: (payee: IPayee) => void,
  permissions: PayeePermissions
): ColumnDef<IPayee>[] => [
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
      placeholder: "Search payee...",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "type",
    header: "Type",
    cell: ({ row }) => {
      const type = row.getValue("type") as string;
      const Icon = getTypeIcon(type);
      return (
        <Badge 
          variant={getTypeColor(type) as any} 
          appearance="outline"
          className="gap-1"
        >
          <Icon className="h-3 w-3" />
          {type.replace(/_/g, ' ')}
        </Badge>
      );
    },
    meta: {
      label: "Type",
      variant: "select",
      options: [
        { label: "Employee", value: "employee", icon: User },
        { label: "Landlord", value: "landlord", icon: Home },
        { label: "Consultant", value: "consultant", icon: UserCheck },
        { label: "Restaurant", value: "restaurant", icon: Utensils },
        { label: "Vendor", value: "vendor", icon: Briefcase },
        { label: "Contractor", value: "contractor", icon: UserCheck },
        { label: "Utility Company", value: "utility_company", icon: Boxes },
        { label: "Service Provider", value: "service_provider", icon: Briefcase },
        { label: "Government", value: "government", icon: Briefcase },
        { label: "Individual", value: "individual", icon: User },
        { label: "Miscellaneous", value: "miscellaneous", icon: Boxes },
      ],
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
        payee={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
        onViewDetails={onViewDetails}
        permissions={permissions}
      />
    )
  },
];