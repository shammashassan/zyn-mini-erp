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
  AlertCircle
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
import { ConnectedPaymentsBadges } from "./ConnectedPaymentsBadges";
import { PurchaseStatusUpdateModal } from "./PurchaseStatusUpdateModal";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate, formatTime } from "@/utils/formatters/date";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// ✅ Export the interface for the page to use
export type { IPurchase } from "@/models/Purchase";

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'Received': return 'success';
    case 'Partially Received': return 'primary';
    case 'Cancelled': return 'destructive';
    case 'Ordered': return 'warning';
    default: return 'neutral';
  }
};

const getPurchaseStatusIcon = (status: string) => {
  switch (status) {
    case 'Received': return CheckCircle;
    case 'Partially Received': return Package;
    case 'Cancelled': return XCircle;
    case 'Ordered': return Clock;
    default: return AlertCircle;
  }
};

const getPaymentStatusVariant = (status: string) => {
  switch (status) {
    case 'Paid': return 'success';
    case 'Partially Paid': return 'primary';
    case 'Pending': return 'warning';
    default: return 'neutral';
  }
};

const getPaymentStatusIcon = (status: string) => {
  switch (status) {
    case 'Paid': return CheckCircle;
    case 'Partially Paid': return CreditCard;
    case 'Pending': return Clock;
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

  if (purchase.paymentStatus === 'Paid' || !canCreatePayment) {
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
  
  // ✅ Check if purchase can be edited (only "Ordered" status)
  const canEdit = canUpdate && purchase.status === 'Ordered';

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
  canCreatePayment: boolean = true
): ColumnDef<IPurchase>[] => [
  {
    id: "date",
    accessorKey: "date",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2"
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-left font-medium min-w-[100px]">
        <div>{formatDisplayDate(row.original.date)}</div>
        <div className="text-xs text-muted-foreground">
          {formatTime(row.original.date)}
        </div>
      </div>
    ),
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
      const displayItems = items.slice(0, 2); // ✅ CHANGED: Show 2 items
      const remainingCount = items.length - 2; // ✅ CHANGED: Calc remaining
      
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
    id: "totalAmount",
    accessorKey: "totalAmount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-8 px-2 justify-end w-full"
      >
        Total Amount
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const purchase = row.original;
      const grandTotal = purchase.grandTotal || (purchase.totalAmount + (purchase.vatAmount || 0));
      return (
        <div className="text-right min-w-[120px]">
          <div className="font-medium text-green-600">
            {formatCurrency(grandTotal)}
          </div>
        </div>
      );
    },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const [isOpen, setIsOpen] = React.useState(false);
      const purchase = row.original;
      const refresh = onRefresh || (() => { });
      const StatusIcon = getPurchaseStatusIcon(purchase.status);

      if (!canUpdateStatus) {
        return (
          <Badge
            variant={getStatusVariant(purchase.status) as any}
            appearance="outline"
            className="gap-1 pr-2.5"
          >
            <StatusIcon className="h-3 w-3" />
            {purchase.status}
          </Badge>
        );
      }

      return (
        <>
          <Badge
            variant={getStatusVariant(purchase.status) as any}
            appearance="outline"
            className="gap-1 pr-2.5 cursor-pointer hover:bg-accent transition-colors"
            onClick={() => setIsOpen(true)}
          >
            <StatusIcon className="h-3 w-3" />
            {purchase.status}
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
      label: "Status",
      variant: "select",
      icon: AlertCircle,
      options: [
        { label: "Ordered", value: "Ordered", icon: Clock },
        { label: "Received", value: "Received", icon: CheckCircle },
        { label: "Partially Received", value: "Partially Received", icon: Package },
        { label: "Cancelled", value: "Cancelled", icon: XCircle },
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
            className="gap-1 pr-2.5"
          >
            <PaymentIcon className="h-3 w-3" />
            {purchase.paymentStatus}
          </Badge>
          {paidAmount > 0 && (
            <div className="text-xs text-muted-foreground">
              {formatCurrency(paidAmount)} / {formatCurrency(grandTotal)}
            </div>
          )}
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
      const purchase = row.original;
      return onViewPdf ? (
        <ConnectedPaymentsBadges
          purchase={purchase as any}
          onViewPdf={onViewPdf}
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