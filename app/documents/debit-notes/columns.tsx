// app/documents/debit-notes/columns.tsx - UPDATED: Use DebitNoteConnectedDocumentsBadge

"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  ArrowUpDown,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  DollarSign,
  CreditCard,
  Receipt,
} from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDisplayDate, formatTime } from "@/utils/formatters/date";
import { formatCurrency } from "@/utils/formatters/currency";
import { DebitNoteStatusUpdateModal } from "./DebitNoteStatusUpdateModal";
import { CreateReceiptModal } from "./CreateReceiptModal";
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges";
import { toast } from "sonner";

export interface DebitNote {
  _id: string;
  debitNoteNumber: string;
  returnNoteId?: string | any;
  returnNumber?: string;
  supplierName?: string;
  supplierId?: string;
  customerName?: string;
  customerId?: string;
  payeeName?: string;
  payeeId?: string;
  vendorName?: string;
  items: Array<{
    materialName: string;
    quantity: number;
    unitCost: number;
    total: number;
  }>;
  totalAmount: number;
  discount: number;
  isTaxPayable: boolean;
  vatAmount: number;
  grandTotal: number;
  debitDate: string;
  reason: string;
  notes?: string;
  status: "pending" | "approved" | "cancelled";
  debitType: "return" | "adjustment" | "standalone";
  receiptAllocations?: Array<{
    voucherId: string | any;
    allocatedAmount: number;
  }>;
  receivedAmount: number;
  remainingAmount: number;
  paymentStatus: "pending" | "paid" | "partially paid";
  connectedDocuments?: {
    receiptIds?: (string | any)[];
  };
  isDeleted: boolean;
  createdBy?: string | null;
  actionHistory?: Array<{
    action: string;
    userId?: string | null;
    username?: string | null;
    timestamp: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface DebitNotePermissions {
  canUpdate: boolean;
  canDelete: boolean;
  canUpdateStatus: boolean;
  canCreateReceipt: boolean;
}

interface RowActionsProps {
  debitNote: DebitNote;
  onEdit: (debitNote: DebitNote) => void;
  onDelete: (id: string) => void;
  onView?: (debitNote: DebitNote) => void;
  onViewPdf?: (debitNote: DebitNote) => void;
  permissions: DebitNotePermissions;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "cancelled":
      return "destructive";
    default:
      return "neutral";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "approved":
      return CheckCircle;
    case "pending":
      return Clock;
    case "cancelled":
      return XCircle;
    default:
      return AlertCircle;
  }
};

const getPaymentStatusVariant = (status: string) => {
  switch (status) {
    case 'paid': return 'success';
    case 'partially paid': return 'primary';
    case 'pending': return 'warning';
    default: return 'gray';
  }
};

const getPaymentStatusIcon = (status: string) => {
  switch (status) {
    case 'paid': return CheckCircle;
    case 'partially paid': return CreditCard;
    case 'pending': return Clock;
    default: return DollarSign;
  }
};

const StatusBadgeButton = ({
  debitNote,
  onRefresh,
  canUpdateStatus,
}: {
  debitNote: DebitNote;
  onRefresh: () => void;
  canUpdateStatus: boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const Icon = getStatusIcon(debitNote.status);

  const handleClick = () => {
    if (canUpdateStatus) {
      setIsOpen(true);
    } else {
      toast.error("You don't have permission to update debit note status");
    }
  };

  return (
    <>
      <Badge
        variant={getStatusVariant(debitNote.status) as any}
        className={cn(
          "gap-1 pr-2.5 capitalize",
          canUpdateStatus ? "cursor-pointer hover:opacity-80" : "cursor-default"
        )}
        appearance="outline"
        onClick={handleClick}
      >
        <Icon className="h-3 w-3" />
        {debitNote.status}
      </Badge>

      <DebitNoteStatusUpdateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        debitNote={debitNote}
        onRefresh={onRefresh}
      />
    </>
  );
};

const CreateReceiptButton = ({ 
  debitNote, 
  onRefresh, 
  canCreateReceipt 
}: { 
  debitNote: DebitNote; 
  onRefresh: () => void; 
  canCreateReceipt: boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (debitNote.status !== 'approved' || debitNote.paymentStatus === 'paid') {
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
          Create Receipt
        </TooltipContent>
      </Tooltip>

      <CreateReceiptModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        debitNote={debitNote}
        onRefresh={onRefresh}
      />
    </>
  );
};

const RowActions = ({
  debitNote,
  onEdit,
  onDelete,
  onView,
  onViewPdf,
  permissions,
}: RowActionsProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const { canUpdate, canDelete } = permissions;

  const canEdit = canUpdate && debitNote.status === "pending";

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
            <DropdownMenuItem onClick={() => onView(debitNote)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
          )}

          {onViewPdf && (
            <DropdownMenuItem onClick={() => onViewPdf(debitNote)}>
              <FileText className="mr-2 h-4 w-4" />
              View PDF
            </DropdownMenuItem>
          )}

          {canEdit && (
            <DropdownMenuItem onClick={() => onEdit(debitNote)}>
              <Edit className="mr-2 h-4 w-4" />
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

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Debit Note</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="w-full space-y-4">
              <p>
                Are you sure you want to delete debit note {debitNote.debitNoteNumber}?
              </p>

              {debitNote.status === "approved" && (
                <div className="space-y-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    ⚠️ This debit note has been approved
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Deleting will void associated journal entries.
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
              onDelete(String(debitNote._id));
              setIsDeleteOpen(false);
            }}
          >
            Delete Debit Note
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const getColumns = (
  onEdit: (debitNote: DebitNote) => void,
  onDelete: (id: string) => void,
  permissions: DebitNotePermissions,
  onView?: (debitNote: DebitNote) => void,
  onViewPdf?: (debitNote: DebitNote) => void,
  onRefresh?: () => void,
  onViewReceiptPdf?: (receipt: any) => void,
  onViewReturnNotePdf?: (returnNote: any) => void
): ColumnDef<DebitNote>[] => [
  {
    id: "debitDate",
    accessorKey: "debitDate",
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
      const date = new Date(row.original.debitDate);
      return (
        <div className="text-left font-medium min-w-[100px]">
          <div>{formatDisplayDate(date)}</div>
          <div className="text-xs text-muted-foreground">{formatTime(date)}</div>
        </div>
      );
    },
  },
  {
    id: "debitNoteNumber",
    accessorKey: "debitNoteNumber",
    header: "Debit Note No.",
    cell: ({ row }) => (
      <span className="font-mono font-medium">
        {row.getValue("debitNoteNumber")}
      </span>
    ),
    meta: {
      label: "Debit Note No.",
      placeholder: "Search debit note no...",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    id: "partyName",
    accessorFn: (row) => row.customerName || row.supplierName || row.payeeName || row.vendorName || "",
    header: "Party",
    cell: ({ row }) => {
      const debitNote = row.original;
      
      if (debitNote.customerName) {
        return (
          <Badge variant="primary" appearance="outline" className="gap-1">
            {debitNote.customerName}
          </Badge>
        );
      }
      
      if (debitNote.supplierName) {
        return (
          <Badge variant="warning" appearance="outline" className="gap-1">
            {debitNote.supplierName}
          </Badge>
        );
      }

      if (debitNote.payeeName) {
        return (
          <Badge variant="cyan" appearance="outline" className="gap-1">
            {debitNote.payeeName}
          </Badge>
        );
      }

      if (debitNote.vendorName) {
        return (
          <Badge variant="secondary" appearance="outline" className="gap-1">
            {debitNote.vendorName}
          </Badge>
        );
      }

      return <span className="text-muted-foreground">—</span>;
    },
    meta: {
      label: "Party",
      placeholder: "Search party name...",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const debitNote = row.original;
      const refresh = onRefresh || (() => {});

      return (
        <StatusBadgeButton
          debitNote={debitNote}
          onRefresh={refresh}
          canUpdateStatus={permissions.canUpdateStatus}
        />
      );
    },
    meta: {
      label: "Status",
      variant: "select",
      options: [
        { label: "Pending", value: "pending", icon: Clock },
        { label: "Approved", value: "approved", icon: CheckCircle },
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
      const debitNote = row.original;
      const receivedAmount = debitNote.receivedAmount || 0;
      const Icon = getPaymentStatusIcon(debitNote.paymentStatus);

      return (
        <div className="space-y-1">
          <Badge
            variant={getPaymentStatusVariant(debitNote.paymentStatus) as any}
            appearance="outline"
            className="gap-1 pr-2.5 capitalize"
          >
            <Icon className="h-3 w-3" />
            {debitNote.paymentStatus}
          </Badge>
          <div className="text-xs text-muted-foreground">
            <span>{formatCurrency(receivedAmount)}</span>
            <span className="mx-1">/</span>
            <span className="text-green-600">{formatCurrency(debitNote.grandTotal)}</span>
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
      const debitNote = row.original;
      return (onViewReceiptPdf && onViewReturnNotePdf) ? (
        <ConnectedDocumentsBadges
          debitNote={debitNote as any}
          onViewReceiptPdf={onViewReceiptPdf}
          onViewReturnNotePdf={onViewReturnNotePdf}
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
      const debitNote = row.original;
      const refresh = onRefresh || (() => {});

      return (
        <div className="flex gap-2">
          <CreateReceiptButton 
            debitNote={debitNote} 
            onRefresh={refresh} 
            canCreateReceipt={permissions.canCreateReceipt} 
          />
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <RowActions
        debitNote={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
        onView={onView}
        onViewPdf={onViewPdf}
        permissions={permissions}
      />
    ),
  },
];