// app/quotations/columns.tsx - Updated with Edit functionality

"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown, FileText, Trash2, Eye, CheckCircle, Clock, XCircle, Send, FileCheck, AlertCircle, RefreshCw, Edit } from "lucide-react";
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
import { CreateInvoiceModal } from "./CreateInvoiceModal";
import { ConnectedInvoiceBadge } from "./ConnectedInvoiceBadge";
import { StatusUpdateModal } from "./StatusUpdateModal";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate, formatTime } from "@/utils/formatters/date";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ConnectedDocument {
  _id: string;
  invoiceNumber: string;
  documentType: string;
}

export interface Quotation {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  grandTotal: number;
  status: "pending" | "approved" | "sent" | "cancelled" | "converted";
  documentType: "quotation";
  discount: number;
  notes: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
  connectedDocuments?: {
    invoiceIds?: (string | ConnectedDocument)[];
  };
  createdAt: string;
  updatedAt: string;
}

interface QuotationPermissions {
  canDelete: boolean;
  canUpdate: boolean;
  canUpdateStatus: boolean;
  canCreateInvoice: boolean;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'approved': return 'success';
    case 'cancelled': return 'destructive';
    case 'sent': return 'primary';
    case 'converted': return 'info';
    case 'pending': return 'warning';
    default: return 'secondary';
  }

};
const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved': return CheckCircle;
    case 'cancelled': return XCircle;
    case 'sent': return Send;
    case 'converted': return RefreshCw;
    case 'pending': return Clock;
    default: return AlertCircle;
  }
};

const CreateInvoiceButton = ({ quotation, onRefresh, canCreateInvoice }: { quotation: Quotation; onRefresh: () => void; canCreateInvoice: boolean }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const hasConnectedInvoice = quotation.connectedDocuments?.invoiceIds && quotation.connectedDocuments.invoiceIds.length > 0;

  if (quotation.status !== 'approved' || hasConnectedInvoice) {
    return null;
  }

  if (!canCreateInvoice) return null;

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
            <FileText className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Invoice
        </TooltipContent>
      </Tooltip>

      <CreateInvoiceModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        quotation={quotation}
        onRefresh={onRefresh}
      />
    </>
  );
};

const StatusBadgeButton = ({ quotation, onRefresh, canUpdateStatus }: { quotation: Quotation; onRefresh: () => void; canUpdateStatus: boolean }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const Icon = getStatusIcon(quotation.status);

  const handleClick = () => {
    if (canUpdateStatus) {
      setIsOpen(true);
    } else {
      toast.error("You don't have permission to update quotation status");
    }
  }

  return (
    <>
      <Badge
        variant={getStatusVariant(quotation.status) as any}
        className={cn("gap-1 pr-2.5", canUpdateStatus ? "cursor-pointer hover:opacity-80" : "cursor-default")}
        appearance="outline"
        onClick={handleClick}
      >
        <Icon className="h-3 w-3" />
        {quotation.status}
      </Badge>

      <StatusUpdateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        quotation={quotation}
        onRefresh={onRefresh}
      />
    </>
  );
};

interface RowActionsProps {
  quotation: Quotation;
  onViewPdf: (quotation: Quotation) => void;
  onEdit: (quotation: Quotation) => void;
  onDelete: (id: string) => void;
  permissions: QuotationPermissions;
}

const RowActions = ({ quotation, onViewPdf, onEdit, onDelete, permissions }: RowActionsProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const { canDelete, canUpdate } = permissions;

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
            onClick={() => onViewPdf(quotation)}
            className="cursor-pointer"
          >
            <Eye className="mr-2 h-4 w-4" />
            View PDF
          </DropdownMenuItem>

          {canUpdate && quotation.status === 'pending' && (
            <DropdownMenuItem
              onClick={() => onEdit(quotation)}
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
          <AlertDialogTitle>Delete Quotation</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete quotation {quotation.invoiceNumber}? This action will move it to trash.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onDelete(quotation._id);
              setIsDeleteOpen(false);
            }}
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            Delete Quotation
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const getColumns = (
  onViewPdf: (quotation: Quotation) => void,
  onEdit: (quotation: Quotation) => void,
  onDelete: (id: string) => void,
  permissions: QuotationPermissions,
  onRefresh?: () => void
): ColumnDef<Quotation>[] => [
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
      header: "Quotation No.",
      cell: ({ row }) => (
        <span className="font-mono font-medium">
          {row.getValue("invoiceNumber")}
        </span>
      ),
      meta: {
        label: "Quotation No.",
        placeholder: "Search quotation no...",
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
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const quotation = row.original;
        const refresh = onRefresh || (() => { });

        return <StatusBadgeButton quotation={quotation} onRefresh={refresh} canUpdateStatus={permissions.canUpdateStatus} />;
      },
      meta: {
        label: "Status",
        variant: "select",
        options: [
          { label: "Pending", value: "pending", icon: Clock },
          { label: "Sent", value: "sent", icon: Send },
          { label: "Approved", value: "approved", icon: CheckCircle },
          { label: "Converted", value: "converted", icon: FileCheck },
          { label: "Cancelled", value: "cancelled", icon: XCircle },
        ],
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
      id: "connectedDocs",
      header: "Connected",
      cell: ({ row }) => {
        const quotation = row.original;
        return (
          <div className="flex flex-col gap-1">
            {onViewPdf && (
              <ConnectedInvoiceBadge
                quotation={quotation}
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
        const quotation = row.original;
        const refresh = onRefresh || (() => { });

        return (
          <div className="flex gap-2">
            <CreateInvoiceButton quotation={quotation} onRefresh={refresh} canCreateInvoice={permissions.canCreateInvoice} />
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <RowActions
            quotation={row.original}
            onViewPdf={onViewPdf}
            onEdit={onEdit}
            onDelete={onDelete}
            permissions={permissions}
          />
        );
      },
    },
  ];