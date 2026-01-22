// app/hrm/employees/columns.tsx

"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { FileText, MoreHorizontal, Trash2, Pencil, Eye, ArrowUpDown, Edit } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { IEmployee } from "@/models/Employee";
import { cn } from "@/lib/utils";
import { formatDateKey, formatDisplayDate } from "@/utils/formatters/date";
import { Badge } from "@/components/ui/badge";

interface RowActionsProps {
  employee: IEmployee;
  onView: (employee: IEmployee) => void;
  onEdit: (employee: IEmployee) => void;
  onDelete: (employee: IEmployee) => void;
  canUpdate: boolean;
  canDelete: boolean;
}

function RowActions({ employee, onView, onEdit, onDelete, canUpdate, canDelete }: RowActionsProps) {
  const displayName = employee.firstName ? `${employee.firstName} ${employee.lastName}` : (employee as any).name || "this employee";

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onView(employee)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </DropdownMenuItem>
          {canUpdate && (
            <>
              <DropdownMenuItem onClick={() => onEdit(employee)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
            </>
          )}
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action will move {displayName} to trash. You can restore it later from the trash.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={() => onDelete(employee)}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export const getColumns = (
  onView: (employee: IEmployee) => void,
  onEdit: (employee: IEmployee) => void,
  onDelete: (employee: IEmployee) => void,
  canUpdate: boolean,
  canDelete: boolean,
  roleOptions: Array<{ label: string; value: string; count?: number }> = []
): ColumnDef<IEmployee>[] => [
    {
      accessorKey: "firstName",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Employee
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const employee = row.original;
        const displayName = employee.firstName ? `${employee.firstName} ${employee.lastName}` : (employee as any).name || "Unknown";
        const fallback = employee.firstName ? `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase() : "??";

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={employee.avatar} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                {fallback}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-slate-900 dark:text-slate-100 truncate">
                {displayName}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {employee.email}
              </div>
            </div>
          </div>
        );
      },
      meta: {
        label: "Employee",
        placeholder: "Search employees...",
        variant: "text",
      },
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const employee = row.original;
        const searchValue = value.toLowerCase();
        return (
          employee.firstName?.toLowerCase().includes(searchValue) ||
          employee.lastName?.toLowerCase().includes(searchValue) ||
          employee.email?.toLowerCase().includes(searchValue) ||
          false
        );
      },
    },
    {
      id: "role",
      accessorKey: "role",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Role
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const role = row.getValue("role") as string | undefined;
        return (
          <Badge
            variant="secondary"
            appearance="outline"
          >
            {role || "N/A"}
          </Badge>
        );
      },
      meta: {
        label: "Role",
        variant: "select",
        options: roleOptions,
      },
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const role = row.getValue(id) as string | undefined;
        return value.includes(role || "user");
      },
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => {
        const email = row.getValue("email") as string | undefined;
        return email ? email : <span className="text-muted-foreground">N/A</span>;
      }
    },
    {
      accessorKey: "mobiles",
      header: "Mobile",
      cell: ({ row }) => {
        const mobiles = row.getValue("mobiles") as string[] | undefined;

        if (!mobiles || mobiles.length === 0) {
          return <span className="text-muted-foreground">N/A</span>;
        }

        return (
          <div className="flex flex-col">
            {mobiles.map((mobile, index) => (
              <span key={index}>{mobile}</span>
            ))}
          </div>
        );
      }
    },
    {
      accessorKey: "joinedDate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Joined Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const joinedDate = row.getValue("joinedDate") as Date | undefined;
        return joinedDate ? formatDisplayDate(joinedDate) : <span className="text-muted-foreground">N/A</span>;
      }
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <RowActions
            employee={row.original}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            canUpdate={canUpdate}
            canDelete={canDelete}
          />
        );
      },
    },
  ];