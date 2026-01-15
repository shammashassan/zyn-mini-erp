// app/expenses/purchases/columns.tsx - UPDATED: Conditional Inventory Status & Payment Button

"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  ArrowUpDown,
  Edit,
  Trash2,
  Copy,
  Wallet,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  Package,
  DollarSign,
  CreditCard,
  AlertCircle,
  FileCheck,
  FileClock,
  FileX,
  CircleX
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
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import type { IPurchase } from "@/models/Purchase";
import { CreatePaymentModal } from "./CreatePaymentModal";
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges";
import { PurchaseStatusUpdateModal } from "./PurchaseStatusUpdateModal";
import { InventoryStatusUpdateModal } from "./InventoryStatusUpdateModal";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate, formatTime } from "@/utils/formatters/date";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export type { IPurchase } from "@/models/Purchase";

// ✅ Purchase Status helpers
const getPurchaseStatusVariant = (status: string) => {
  switch (status) {
    case 'approved': return 'success';
    case 'pending': return 'warning';
    case 'cancelled': return 'destructive';
    default: return 'neutral';
  }
};

const getPurchaseStatusIcon = (status: string) => {
  switch (status) {
    case 'approved': return CheckCircle;
    case 'pending': return Clock;
    case 'cancelled': return XCircle;
    default: return AlertCircle;
  }
};

// ✅ Inventory Status helpers
const getInventoryStatusVariant = (status: string) => {
  switch (status) {
    case 'received': return 'success';
    case 'partially received': return 'primary';
    case 'pending': return 'warning';
    default: return 'neutral';
  }
};

const getInventoryStatusIcon = (status: string) => {
  switch (status) {
    case 'received': return CheckCircle;
    case 'partially received': return Package;
    case 'pending': return Clock;
    default: return AlertCircle;
  }
};

// Payment Status helpers
const getPaymentStatusVariant = (status: string) => {
  switch (status) {
    case 'paid': return 'success';
    case 'partially paid': return 'primary';
    case 'pending': return 'warning';
    default: return 'neutral';
  }
};

const getPaymentStatusIcon = (status: string) => {
  switch (status) {
    case 'paid': return CheckCircle;
    case 'partially paid': return CreditCard;
    case 'pending': return Clock;
    default: return AlertCircle;
  }
};

const CreatePaymentButton = ({
  purchase,
  onRefresh,
  canCreatePayment
}: {
  purchase: IPurchase;
  onRefresh: () => void;
  canCreatePayment: boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  // ✅ NEW: Hide button if purchase status is not 'approved'
  if (purchase.purchaseStatus !== 'approved') {
    return null;
  }

  if (purchase.paymentStatus === 'paid' || !canCreatePayment) {
    return null;
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsOpen(true)}
            disabled={purchase.isDeleted}
          >
            <Wallet className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Payment
        </TooltipContent>
      </Tooltip>

      <CreatePaymentModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        purchase={purchase as any}
        onRefresh={onRefresh}
      />
    </>
  );
};

interface RowActionsProps {
  purchase: IPurchase;
  onEdit: (purchase: IPurchase) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (purchase: IPurchase) => void;
  onView?: (purchase: IPurchase) => void;
  canUpdate: boolean;
  canDelete: boolean;
  canCreate: boolean;
}

const RowActions = ({
  purchase,
  onEdit,
  onDelete,
  onDuplicate,
  onView,
  canUpdate,
  canDelete,
  canCreate
}: RowActionsProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const hasPayments = purchase.connectedDocuments?.paymentIds && purchase.connectedDocuments.paymentIds.length > 0;

  const canEdit = canUpdate && purchase.purchaseStatus === 'pending';

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

          {onView && (
            <DropdownMenuItem onClick={() => onView(purchase)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
          )}

          {canEdit && (
            <DropdownMenuItem onClick={() => onEdit(purchase)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}

          {canCreate && onDuplicate && (
            <DropdownMenuItem onClick={() => onDuplicate(purchase)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
          )}

          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
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
          <AlertDialogTitle>Delete Purchase</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete purchase {purchase.referenceNumber}?
              </p>

              {hasPayments && (
                <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    ℹ️ This purchase has {purchase.connectedDocuments!.paymentIds!.length} connected payment(s)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    The purchase will be unlinked from payment vouchers, but the payment vouchers will remain intact.
                  </p>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={cn(buttonVariants({ variant: "destructive" }))}
            onClick={() => {
              onDelete(String(purchase._id));
              setIsDeleteOpen(false);
            }}
          >
            Delete Purchase
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const getColumns = (
  onEdit: (purchase: IPurchase) => void,
  onDelete: (id: string) => void,
  canDelete: boolean,
  onDuplicate?: (purchase: IPurchase) => void,
  onView?: (purchase: IPurchase) => void,
  onRefresh?: () => void,
  onViewPdf?: (bill: any) => void,
  canUpdate: boolean = true,
  canCreate: boolean = true,
  canUpdateStatus: boolean = true,
  canCreatePayment: boolean = true,
  onViewReturnNotePdf?: (returnNote: any) => void
): ColumnDef<IPurchase>[] => [
    {
      accessorKey: "expenseDate", // Changed from "date"
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
        const date = new Date(row.original.purchaseDate); // Changed
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
        const dateA = new Date(rowA.original.purchaseDate); // Changed
        const dateB = new Date(rowB.original.purchaseDate); // Changed
        return dateB.getTime() - dateA.getTime();
      },
    },
    {
      id: "referenceNumber",
      accessorKey: "referenceNumber",
      header: "Purchase No.",
      cell: ({ row }) => (
        <span className="font-mono font-medium">
          {row.getValue("referenceNumber")}
        </span>
      ),
      meta: {
        label: "Purchase No",
        placeholder: "search purchase no...",
        variant: "text"
      },
      enableColumnFilter: true,
    },
    {
      id: "supplierName",
      accessorKey: "supplierName",
      header: "Supplier",
      cell: ({ row }) => {
        const supplierName = row.original.supplierName;
        return supplierName ? (
          <Badge variant="warning" appearance="outline">
            {supplierName}
          </Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        );
      },
      meta: {
        label: "Supplier",
        placeholder: "search supplier name...",
        variant: "text"
      },
      enableColumnFilter: true,
    },
    {
      id: "itemsCount",
      header: "Items",
      cell: ({ row }) => {
        const items = row.original.items || [];
        const displayItems = items.slice(0, 2);
        const remainingCount = items.length - 2;

        return (
          <div className="flex flex-col gap-0.5 text-sm">
            {displayItems.map((item, idx) => (
              <div key={idx} className="text-muted-foreground">
                {item.materialName}: <span className="font-medium text-foreground">{item.quantity}</span>
              </div>
            ))}
            {remainingCount > 0 && (
              <div className="text-muted-foreground">
                +{remainingCount} more
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: "purchaseStatus",
      accessorKey: "purchaseStatus",
      header: "Purchase",
      cell: ({ row }) => {
        const [isOpen, setIsOpen] = React.useState(false);
        const purchase = row.original;
        const refresh = onRefresh || (() => { });
        const PurchaseIcon = getPurchaseStatusIcon(purchase.purchaseStatus);

        if (!canUpdateStatus) {
          return (
            <Badge
              variant={getPurchaseStatusVariant(purchase.purchaseStatus) as any}
              appearance="outline"
              className="gap-1 pr-2.5 capitalize"
            >
              <PurchaseIcon className="h-3 w-3" />
              {purchase.purchaseStatus}
            </Badge>
          );
        }

        return (
          <>
            <Badge
              variant={getPurchaseStatusVariant(purchase.purchaseStatus) as any}
              appearance="outline"
              className="gap-1 pr-2.5 cursor-pointer hover:bg-accent transition-colors capitalize"
              onClick={() => setIsOpen(true)}
            >
              <PurchaseIcon className="h-3 w-3" />
              {purchase.purchaseStatus}
            </Badge>

            <PurchaseStatusUpdateModal
              isOpen={isOpen}
              onClose={() => setIsOpen(false)}
              purchase={purchase as any}
              onRefresh={refresh}
            />
          </>
        );
      },
      meta: {
        label: "Purchase",
        variant: "select",
        icon: FileCheck,
        options: [
          { label: "Pending", value: "pending", icon: Clock },
          { label: "Approved", value: "approved", icon: CheckCircle },
          { label: "Cancelled", value: "cancelled", icon: CircleX },
        ],
      },
      enableColumnFilter: true,
    },
    {
      id: "inventoryStatus",
      accessorKey: "inventoryStatus",
      header: "Inventory",
      cell: ({ row }) => {
        const [isOpen, setIsOpen] = React.useState(false);
        const purchase = row.original;
        const refresh = onRefresh || (() => { });
        const InventoryIcon = getInventoryStatusIcon(purchase.inventoryStatus);

        // ✅ NEW: Make badge non-clickable if purchase status is not 'approved'
        const isClickable = canUpdateStatus && purchase.purchaseStatus === 'approved';

        return (
          <>
            <Badge
              variant={getInventoryStatusVariant(purchase.inventoryStatus) as any}
              appearance="outline"
              className={cn(
                "gap-1 pr-2.5 capitalize",
                isClickable ? "cursor-pointer hover:bg-accent transition-colors" : "cursor-default"
              )}
              onClick={() => isClickable && setIsOpen(true)}
            >
              <InventoryIcon className="h-3 w-3" />
              {purchase.inventoryStatus}
            </Badge>

            {isClickable && (
              <InventoryStatusUpdateModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                purchase={purchase as any}
                onRefresh={refresh}
              />
            )}
          </>
        );
      },
      meta: {
        label: "Inventory",
        variant: "select",
        icon: Package,
        options: [
          { label: "Pending", value: "pending", icon: Clock },
          { label: "Received", value: "received", icon: CheckCircle },
          { label: "Partially Received", value: "partially received", icon: Package },
        ],
      },
      enableColumnFilter: true,
    },
    {
      id: "paymentStatus",
      accessorKey: "paymentStatus",
      header: "Payment",
      cell: ({ row }) => {
        const purchase = row.original;
        const paidAmount = purchase.paidAmount || 0;
        const grandTotal = purchase.grandTotal || (purchase.totalAmount + (purchase.vatAmount || 0));
        const PaymentIcon = getPaymentStatusIcon(purchase.paymentStatus);

        return (
          <div className="space-y-1">
            <Badge
              variant={getPaymentStatusVariant(purchase.paymentStatus) as any}
              appearance="outline"
              className="gap-1 pr-2.5 capitalize"
            >
              <PaymentIcon className="h-3 w-3" />
              {purchase.paymentStatus}
            </Badge>
            <div className="text-xs text-muted-foreground">
              <span>{formatCurrency(paidAmount)}</span>
              <span className="mx-1">/</span>
              <span className="text-green-600">{formatCurrency(grandTotal)}</span>
            </div>
          </div>
        );
      },
      meta: {
        label: "Payment",
        variant: "select",
        icon: DollarSign,
        options: [
          { label: "Paid", value: "paid", icon: CheckCircle },
          { label: "Partially Paid", value: "partially paid", icon: CreditCard },
          { label: "Pending", value: "pending", icon: Clock },
        ],
      },
      enableColumnFilter: true,
    },
    {
      id: "connectedDocuments",
      header: "Connected",
      cell: ({ row }) => {
        const purchase = row.original;
        return (onViewPdf && onViewReturnNotePdf) ? (
          <ConnectedDocumentsBadges
            purchase={purchase as any}
            onViewPdf={onViewPdf}
            onViewReturnNotePdf={onViewReturnNotePdf}
          />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "quickActions",
      cell: ({ row }) => {
        const purchase = row.original;
        const refresh = onRefresh || (() => { });

        return <CreatePaymentButton
          purchase={purchase}
          onRefresh={refresh}
          canCreatePayment={canCreatePayment}
        />;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActions
          purchase={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onView={onView}
          canUpdate={canUpdate}
          canDelete={canDelete}
          canCreate={canCreate}
        />
      ),
    },
  ];