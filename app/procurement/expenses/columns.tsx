// app/procurement/expenses/columns.tsx - UPDATED: Using expenseDate instead of date

"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal, ArrowUpDown, Edit, Trash2, Eye, CheckCircle, Clock, XCircle, DollarSign, AlertCircle,
  Wallet, CreditCard, Briefcase, Plane, Megaphone, Zap, Code, Cpu, Utensils, Users, Home, Shield, Film, Boxes, Copy
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { IExpense } from "@/models/Expense";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate, formatTime } from "@/utils/formatters/date";
import { cn } from "@/lib/utils";
import { ConnectedPaymentsBadges } from "./ConnectedPaymentsBadges";
import { CreatePaymentModal } from "./CreatePaymentModal";
import { StatusUpdateModal } from "./StatusUpdateModal";

interface ExpensePermissions {
  canUpdate: boolean;
  canDelete: boolean;
  canCreatePayment: boolean;
  canCreate: boolean;
}

// Helper component for Create Payment Button (Icon Only with Tooltip)
const CreatePaymentButton = ({
  expense,
  onRefresh,
  canCreatePayment
}: {
  expense: IExpense;
  onRefresh: () => void;
  canCreatePayment: boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // Only show if approved and not fully paid
  if (expense.status !== 'approved' || expense.paymentStatus === 'Paid' || !canCreatePayment) {
    return null;
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsOpen(true)}
            >
              <Wallet className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Payment
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <CreatePaymentModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        expense={expense}
        onRefresh={onRefresh}
      />
    </>
  );
};

// Helper for Category Icons
const getCategoryIcon = (category: string) => {
  switch (category) {
    case "Office Supplies": return Briefcase;
    case "Travel": return Plane;
    case "Marketing": return Megaphone;
    case "Utilities": return Zap;
    case "Software": return Code;
    case "Equipment": return Cpu;
    case "Meals": return Utensils;
    case "Professional Services": return Users;
    case "Rent": return Home;
    case "Salary": return DollarSign;
    case "Insurance": return Shield;
    case "Entertainment": return Film;
    case "Miscellaneous": return Boxes;
    default: return AlertCircle;
  }
};

// Helper for Payment Status Icons
const getPaymentStatusIcon = (status: string) => {
  switch (status) {
    case 'Paid': return CheckCircle;
    case 'Partially Paid': return CreditCard;
    case 'Pending': return Clock;
    default: return AlertCircle;
  }
};

// Helper component for Status Badge
const StatusBadge = ({
  expense,
  onRefresh,
  canUpdate
}: {
  expense: IExpense;
  onRefresh: () => void;
  canUpdate: boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'cancelled': return 'destructive';
      case 'pending': return 'warning';
      default: return 'gray';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return CheckCircle;
      case 'cancelled': return XCircle;
      case 'pending': return Clock;
      default: return AlertCircle;
    }
  };

  const Icon = getStatusIcon(expense.status);

  return (
    <>
      <Badge
        variant={getStatusColor(expense.status) as any}
        appearance="outline"
        className={cn(
          "gap-1 capitalize pr-2.5",
          canUpdate ? "cursor-pointer hover:bg-accent transition-colors" : ""
        )}
        onClick={(e) => {
          if (!canUpdate) return;
          e.stopPropagation();
          setIsOpen(true);
        }}
      >
        <Icon className="h-3 w-3" />
        {expense.status}
      </Badge>

      {canUpdate && (
        <StatusUpdateModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          expense={expense}
          onRefresh={onRefresh}
        />
      )}
    </>
  );
};

export const getColumns = (
  onEdit: (expense: IExpense) => void,
  onView: (expense: IExpense) => void,
  onDelete: (id: string) => void,
  permissions: ExpensePermissions,
  onRefresh?: () => void,
  onViewPdf?: (doc: any) => void,
  onDuplicate?: (expense: IExpense) => void
): ColumnDef<IExpense>[] => [
    {
      accessorKey: "expenseDate", // ✅ UPDATED: Changed from date to expenseDate
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = new Date(row.original.expenseDate); // ✅ UPDATED
        return (
          <div className="text-left font-medium min-w-[100px]">
            <div>{formatDisplayDate(date)}</div>
            <div className="text-xs text-muted-foreground">
              {formatTime(date)}
            </div>
          </div>
        );
      },
      sortingFn: (rowA, rowB) => {
        const dateA = new Date(rowA.original.expenseDate); // ✅ UPDATED
        const dateB = new Date(rowB.original.expenseDate); // ✅ UPDATED
        return dateB.getTime() - dateA.getTime();
      },
    },
    {
      accessorKey: "referenceNumber",
      header: "Reference",
      cell: ({ row }) => (
        <span className="font-mono">{row.getValue("referenceNumber")}</span>
      ),
      meta: {
        label: "Reference No",
        placeholder: "Search reference no...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "vendor",
      header: "Vendor",
      cell: ({ row }) => {
        const expense = row.original as any;

        if (expense.payeeId && typeof expense.payeeId === 'object') {
          return (
              <Badge variant="cyan" appearance="outline">
                {expense.payeeId.name}
              </Badge>
          );
        }

        if (expense.supplierId && typeof expense.supplierId === 'object') {
          return (
              <Badge variant="warning" appearance="outline">
                {expense.supplierId.name}
              </Badge>
          );
        }

        return (
          <Badge variant="secondary" appearance="outline">
            {expense.vendor || <span className="text-muted-foreground">N/A</span>}
          </Badge>
        );
      },
      meta: {
        label: "Vendor",
        placeholder: "Search vendor...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "category",
      header: "Category",
      cell: ({ row }) => {
        const category = row.getValue("category") as string;
        const Icon = getCategoryIcon(category);
        return (
          <Badge variant="secondary" appearance="outline" className="gap-1 font-normal pr-2.5">
            <Icon className="h-3 w-3" />
            {category}
          </Badge>
        )
      },
      meta: {
        label: "Category",
        variant: "select",
        icon: AlertCircle,
        options: [
          { label: "Office Supplies", value: "Office Supplies", icon: Briefcase },
          { label: "Travel", value: "Travel", icon: Plane },
          { label: "Marketing", value: "Marketing", icon: Megaphone },
          { label: "Utilities", value: "Utilities", icon: Zap },
          { label: "Software", value: "Software", icon: Code },
          { label: "Equipment", value: "Equipment", icon: Cpu },
          { label: "Meals", value: "Meals", icon: Utensils },
          { label: "Professional Services", value: "Professional Services", icon: Users },
          { label: "Rent", value: "Rent", icon: Home },
          { label: "Salary", value: "Salary", icon: DollarSign },
          { label: "Insurance", value: "Insurance", icon: Shield },
          { label: "Entertainment", value: "Entertainment", icon: Film },
          { label: "Miscellaneous", value: "Miscellaneous", icon: Boxes },
        ],
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <StatusBadge
          expense={row.original}
          onRefresh={onRefresh || (() => { })}
          canUpdate={permissions.canUpdate}
        />
      ),
      meta: {
        label: "Status",
        variant: "select",
        icon: AlertCircle,
        options: [
          { label: "Approved", value: "approved", icon: CheckCircle },
          { label: "Pending", value: "pending", icon: Clock },
          { label: "Cancelled", value: "cancelled", icon: XCircle },
        ],
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => {
        const status = row.original.paymentStatus;
        const amount = row.original.amount;
        const paid = row.original.paidAmount;
        const Icon = getPaymentStatusIcon(status);

        const getVariant = (s: string) => {
          switch (s) {
            case 'Paid': return 'success';
            case 'Partially Paid': return 'primary';
            default: return 'warning';
          }
        };

        return (
          <div className="flex flex-col gap-1 min-w-[100px]">
            <div className="flex items-center gap-2">
              <Badge variant={getVariant(status) as any} appearance="outline" className="gap-1 pr-2.5">
                <Icon className="h-3 w-3" />
                {status}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              <span>{formatCurrency(paid)}</span>
              <span className="mx-1">/</span>
              <span className="text-green-600">{formatCurrency(amount)}</span>
            </div>
          </div>
        );
      },
      meta: {
        label: "Payment Status",
        variant: "select",
        icon: DollarSign,
        options: [
          { label: "Paid", value: "Paid", icon: CheckCircle },
          { label: "Partially Paid", value: "Partially Paid", icon: CreditCard },
          { label: "Pending", value: "Pending", icon: Clock },
        ],
      },
      enableColumnFilter: true,
    },
    {
      id: "connectedPayments",
      header: "Connected Payments",
      cell: ({ row }) => {
        const expense = row.original;
        return onViewPdf ? (
          <ConnectedPaymentsBadges
            expense={expense as any}
            onViewPdf={onViewPdf}
          />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "quickActions",
      header: "",
      cell: ({ row }) => {
        const expense = row.original;
        const refresh = onRefresh || (() => { });

        return <CreatePaymentButton
          expense={expense}
          onRefresh={refresh}
          canCreatePayment={permissions.canCreatePayment}
        />;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const expense = row.original;
        const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

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
                <DropdownMenuItem onClick={() => onView(expense)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>

                {permissions.canUpdate && expense.status === 'pending' && (
                  <DropdownMenuItem onClick={() => onEdit(expense)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}

                {permissions.canCreate && onDuplicate && (
                  <DropdownMenuItem onClick={() => onDuplicate(expense)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />
                {permissions.canDelete && (
                  <DropdownMenuItem
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will soft delete the expense <strong>{expense.referenceNumber}</strong>.
                    You can restore it later from the trash.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className={cn(buttonVariants({ variant: "destructive" }))}
                    onClick={() => onDelete(expense._id)}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        );
      },
    },
  ];