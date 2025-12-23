// app/invoices/columns.tsx - COMPLETE: Added icons to status badges

"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { 
  MoreHorizontal, 
  ArrowUpDown, 
  Trash2, 
  Receipt, 
  FileText, 
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  DollarSign,
  CreditCard,
  AlertCircle,
  Edit
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
import { CreateReceiptModal } from "./CreateReceiptModal";
import { CreateDeliveryModal } from "./CreateDeliveryModal";
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges";
import { StatusUpdateModal } from "./StatusUpdateModal";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate, formatTime } from "@/utils/formatters/date";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ConnectedDocument {
  _id: string;
  invoiceNumber: string;
  grandTotal?: number;
  documentType?: string;
  voucherType?: string;
}

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  grandTotal: number;
  status: "pending" | "approved" | "cancelled";
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
  connectedDocuments?: {
    receiptIds?: (string | ConnectedDocument)[];
    refundIds?: (string | ConnectedDocument)[];
    deliveryId?: string | ConnectedDocument;
    quotationId?: string | ConnectedDocument;
  };
  paymentStatus: 'Paid' | 'Pending' | 'Partially Paid' | 'Refunded';
  paidAmount: number;
  receivedAmount: number;
  remainingAmount?: number;
  discount?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface InvoicePermissions {
  canDelete: boolean;
  canUpdate: boolean;
  canUpdateStatus: boolean;
  canCreateReceipt: boolean;
  canCreateDelivery: boolean;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'approved': return 'success';
    case 'cancelled': return 'destructive';
    case 'pending': return 'warning';
    default: return 'secondary';
  }
};

// ✅ ADDED: Helper for Status Icons
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved': return CheckCircle;
    case 'pending': return Clock;
    case 'cancelled': return XCircle;
    default: return AlertCircle;
  }
};

const getPaymentStatusVariant = (status: string) => {
  switch (status) {
    case 'Paid': return 'success';
    case 'Partially Paid': return 'primary';
    case 'Pending': return 'warning';
    case 'Refunded': return 'pink';
    default: return 'secondary';
  }
};

// ✅ ADDED: Helper for Payment Icons
const getPaymentStatusIcon = (status: string) => {
  switch (status) {
    case 'Paid': return CheckCircle;
    case 'Partially Paid': return CreditCard;
    case 'Pending': return Clock;
    case 'Refunded': return RotateCcw;
    default: return DollarSign;
  }
};

const CreateReceiptButton = ({ invoice, onRefresh, canCreateReceipt }: { invoice: Invoice; onRefresh: () => void; canCreateReceipt: boolean }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (invoice.status !== 'approved' || invoice.paymentStatus === 'Paid' || invoice.paymentStatus === 'Refunded') {
    return null;
  }

  if (!canCreateReceipt) return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="gap-2"
          >
            <Receipt className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Receipt
        </TooltipContent>
      </Tooltip>

      <CreateReceiptModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        invoice={invoice}
        onRefresh={onRefresh}
      />
    </>
  );
};

const CreateDeliveryButton = ({ invoice, onRefresh, canCreateDelivery }: { invoice: Invoice; onRefresh: () => void; canCreateDelivery: boolean }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (invoice.status !== 'approved' || invoice.connectedDocuments?.deliveryId || invoice.paymentStatus === 'Refunded') {
    return null;
  }

  if (!canCreateDelivery) return null;

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsOpen(true)}
            className="gap-2"
          >
            <Truck className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Delivery
        </TooltipContent>
      </Tooltip>

      <CreateDeliveryModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        invoice={invoice}
        onRefresh={onRefresh}
      />
    </>
  );
};

const StatusBadgeButton = ({ invoice, onRefresh, canUpdateStatus }: { invoice: Invoice; onRefresh: () => void; canUpdateStatus: boolean }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const Icon = getStatusIcon(invoice.status); // ✅ ADDED: Get icon

  const handleClick = () => {
    if (canUpdateStatus) {
      setIsOpen(true);
    } else {
      toast.error("You don't have permission to update invoice status");
    }
  }

  return (
    <>
      <Badge
        variant={getStatusVariant(invoice.status) as any}
        // ✅ UPDATED: Added gap and padding for icon
        className={cn("gap-1 pr-2.5", canUpdateStatus ? "cursor-pointer hover:opacity-80" : "cursor-default")}
        appearance="outline"
        onClick={handleClick}
      >
        <Icon className="h-3 w-3" /> {/* ✅ ADDED: Icon */}
        {invoice.status}
      </Badge>

      <StatusUpdateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        invoice={invoice}
        onRefresh={onRefresh}
      />
    </>
  );
};

interface RowActionsProps {
  invoice: Invoice;
  onViewPdf: (invoice: Invoice) => void;
  onEdit: (invoice: Invoice) => void;
  onDelete: (id: string) => void;
  permissions: InvoicePermissions;
}

const RowActions = ({ invoice, onViewPdf, onEdit, onDelete, permissions }: RowActionsProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const { canDelete, canUpdate } = permissions;

  const canEdit = canUpdate && invoice.status === 'pending';

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

          <DropdownMenuItem
            onClick={() => onViewPdf(invoice)}
            className="cursor-pointer"
          >
            <FileText className="mr-2 h-4 w-4" />
            View PDF
          </DropdownMenuItem>

          {canEdit && (
            <DropdownMenuItem
              onClick={() => onEdit(invoice)}
              className="cursor-pointer"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}

          {canDelete && (
            <>
              <DropdownMenuSeparator />

              <DropdownMenuItem
                className="text-destructive cursor-pointer"
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
          <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete invoice {invoice.invoiceNumber}? This action will move it to trash.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onDelete(invoice._id);
              setIsDeleteOpen(false);
            }}
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            Delete Invoice
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const getColumns = (
  onViewPdf: (invoice: Invoice) => void,
  onEdit: (invoice: Invoice) => void,
  onDelete: (id: string) => void,
  permissions: InvoicePermissions,
  onRefresh?: () => void
): ColumnDef<Invoice>[] => [
  {
    accessorKey: "createdAt",
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
    cell: ({ row }) => {
      const date = new Date(row.original.createdAt);
      return (
        <div className="text-left font-medium">
          <div>{formatDisplayDate(date)}</div>
          <div className="text-xs text-muted-foreground">
            {formatTime(date)}
          </div>
        </div>
      );
    },
    sortingFn: (rowA, rowB) => {
      const dateA = new Date(rowA.original.createdAt);
      const dateB = new Date(rowB.original.createdAt);
      return dateB.getTime() - dateA.getTime();
    },
  },
  {
    accessorKey: "invoiceNumber",
    header: "Invoice No.",
    cell: ({ row }) => (
      <span className="font-mono font-medium">
        {row.getValue("invoiceNumber")}
      </span>
    ),
    meta: {
      label: "Invoice No",
      placeholder: "Search invoice no...",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    id: "customerName",
    accessorKey: "customerName",
    header: "Customer",
    cell: ({ row }) => {
      const customerName = row.original.customerName;
      return customerName ? (
        <Badge variant="primary" appearance="outline">
          {customerName}
        </Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
    meta: {
      label: "Customer",
      placeholder: "Search customer...",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    accessorKey: "grandTotal",
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
    cell: ({ row }) => (
      <div className="text-right text-green-600 min-w-[120px] font-medium">
        {formatCurrency(row.original.grandTotal)}
      </div>
    ),
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const invoice = row.original;
      const refresh = onRefresh || (() => { });

      return <StatusBadgeButton invoice={invoice} onRefresh={refresh} canUpdateStatus={permissions.canUpdateStatus} />;
    },
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
    id: "paymentStatus",
    accessorKey: "paymentStatus",
    header: "Payment",
    cell: ({ row }) => {
      const invoice = row.original;
      const paidAmount = invoice.paidAmount || 0;
      const Icon = getPaymentStatusIcon(invoice.paymentStatus); // ✅ ADDED: Get icon

      return (
        <div className="space-y-1">
          <Badge
            variant={getPaymentStatusVariant(invoice.paymentStatus) as any}
            appearance="outline"
            className="gap-1 pr-2.5" // ✅ ADDED: Spacing
          >
            <Icon className="h-3 w-3" /> {/* ✅ ADDED: Icon */}
            {invoice.paymentStatus}
          </Badge>
          {paidAmount > 0 && (
            <div className="text-xs text-muted-foreground">
              {formatCurrency(paidAmount)} / {formatCurrency(invoice.grandTotal)}
            </div>
          )}
        </div>
      );
    },
    meta: {
      label: "Payment",
      variant: "select",
      icon: DollarSign,
      options: [
        { label: "Paid", value: "Paid", icon: CheckCircle },
        { label: "Partially Paid", value: "Partially Paid", icon: CreditCard },
        { label: "Pending", value: "Pending", icon: Clock },
        { label: "Refunded", value: "Refunded", icon: RotateCcw },
      ],
    },
    enableColumnFilter: true,
  },
  {
    id: "connectedDocs",
    header: "Connected",
    cell: ({ row }) => {
      const invoice = row.original;
      return (
        <div className="flex flex-col gap-1 min-w-[150px]">
          {onViewPdf && (
            <ConnectedDocumentsBadges
              invoice={invoice}
              onViewPdf={onViewPdf}
            />
          )}
        </div>
      );
    },
  },
  {
    id: "quickActions",
    header: "",
    cell: ({ row }) => {
      const invoice = row.original;
      const refresh = onRefresh || (() => { });

      return (
        <div className="flex gap-2">
          <CreateReceiptButton invoice={invoice} onRefresh={refresh} canCreateReceipt={permissions.canCreateReceipt} />
          <CreateDeliveryButton invoice={invoice} onRefresh={refresh} canCreateDelivery={permissions.canCreateDelivery} />
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <RowActions
          invoice={row.original}
          onViewPdf={onViewPdf}
          onEdit={onEdit}
          onDelete={onDelete}
          permissions={permissions}
        />
      );
    },
  },
];