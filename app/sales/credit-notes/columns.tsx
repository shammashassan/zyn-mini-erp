// app/sales/credit-notes/columns.tsx - FINAL: Using Party snapshots for display

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
import { Button } from "@/components/ui/button";
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
import { CreditNoteStatusUpdateModal } from "./CreditNoteStatusUpdateModal";
import { CreatePaymentModal } from "./CreatePaymentModal";
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges";
import { toast } from "sonner";

export interface CreditNote {
  _id: string;
  creditNoteNumber: string;

  // ✅ Party & Contact References (Dynamic - Current Truth)
  partyId: any;
  contactId?: string;

  // ✅ Snapshots (Frozen - Legal Truth) - Optional for backward compatibility
  partySnapshot?: {
    displayName: string;
    address?: {
      street?: string;
      city?: string;
      district?: string;
      state?: string;
      country?: string;
      postalCode?: string;
    };
    taxIdentifiers?: {
      vatNumber?: string;
    };
  };
  contactSnapshot?: {
    name: string;
    phone?: string;
    email?: string;
    designation?: string;
  };

  items: Array<{
    itemId?: string;
    description: string;
    quantity: number;
    rate: number;
    total: number;
    taxRate?: number;
    taxAmount?: number;
  }>;
  totalAmount: number;
  discount: number;
  vatAmount: number;
  grandTotal: number;
  creditDate: string;
  reason: string;
  notes?: string;
  status: "pending" | "approved" | "cancelled";
  creditType: "return" | "adjustment" | "standalone";
  paymentAllocations?: Array<{
    voucherId: string | any;
    allocatedAmount: number;
  }>;
  paidAmount: number;
  remainingAmount: number;
  paymentStatus: "pending" | "paid" | "partially paid";
  connectedDocuments?: {
    returnNoteId?: string | any;
    paymentIds?: (string | any)[];
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

interface CreditNotePermissions {
  canUpdate: boolean;
  canDelete: boolean;
  canUpdateStatus: boolean;
  canCreatePayment: boolean;
}

interface RowActionsProps {
  creditNote: CreditNote;
  onEdit: (creditNote: CreditNote) => void;
  onDelete: (id: string) => void;
  onView?: (creditNote: CreditNote) => void;
  onViewPdf?: (creditNote: CreditNote) => void;
  permissions: CreditNotePermissions;
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
  creditNote,
  onRefresh,
  canUpdateStatus,
}: {
  creditNote: CreditNote;
  onRefresh: () => void;
  canUpdateStatus: boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const Icon = getStatusIcon(creditNote.status);

  const handleClick = () => {
    if (canUpdateStatus) {
      setIsOpen(true);
    } else {
      toast.error("You don't have permission to update credit note status");
    }
  };

  return (
    <>
      <Badge
        variant={getStatusVariant(creditNote.status) as any}
        className={cn(
          "gap-1 pr-2.5 capitalize",
          canUpdateStatus ? "cursor-pointer hover:opacity-80" : "cursor-default"
        )}
        appearance="outline"
        onClick={handleClick}
      >
        <Icon className="h-3 w-3" />
        {creditNote.status}
      </Badge>

      <CreditNoteStatusUpdateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        creditNote={creditNote}
        onRefresh={onRefresh}
      />
    </>
  );
};

const CreatePaymentButton = ({
  creditNote,
  onRefresh,
  canCreatePayment
}: {
  creditNote: CreditNote;
  onRefresh: () => void;
  canCreatePayment: boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (creditNote.status !== 'approved' || creditNote.paymentStatus === 'paid') {
    return null;
  }

  if (!canCreatePayment) return null;

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
          Create Payment
        </TooltipContent>
      </Tooltip>

      <CreatePaymentModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        creditNote={creditNote}
        onRefresh={onRefresh}
      />
    </>
  );
};

const RowActions = ({
  creditNote,
  onEdit,
  onDelete,
  onView,
  onViewPdf,
  permissions,
}: RowActionsProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const { canUpdate, canDelete } = permissions;

  const canEdit = canUpdate && creditNote.status === "pending";

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
            <DropdownMenuItem onClick={() => onView(creditNote)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
          )}

          {onViewPdf && (
            <DropdownMenuItem onClick={() => onViewPdf(creditNote)}>
              <FileText className="mr-2 h-4 w-4" />
              View PDF
            </DropdownMenuItem>
          )}

          {canEdit && (
            <DropdownMenuItem onClick={() => onEdit(creditNote)}>
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
          <AlertDialogTitle>Delete Credit Note</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="w-full space-y-4">
              <p>
                Are you sure you want to delete credit note {creditNote.creditNoteNumber}?
              </p>

              {creditNote.status === "approved" && (
                <div className="space-y-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    ⚠️ This credit note has been approved
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
            variant="destructive"
            onClick={() => {
              onDelete(String(creditNote._id));
              setIsDeleteOpen(false);
            }}
          >
            Delete Credit Note
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const getColumns = (
  onEdit: (creditNote: CreditNote) => void,
  onDelete: (id: string) => void,
  permissions: CreditNotePermissions,
  onView?: (creditNote: CreditNote) => void,
  onViewPdf?: (creditNote: CreditNote) => void,
  onRefresh?: () => void,
  onViewPaymentPdf?: (payment: any) => void,
  onViewReturnNotePdf?: (returnNote: any) => void
): ColumnDef<CreditNote>[] => [
    {
      id: "creditDate",
      accessorKey: "creditDate",
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
        const date = new Date(row.original.creditDate);
        return (
          <div className="text-left font-medium min-w-[100px]">
            <div>{formatDisplayDate(date)}</div>
            <div className="text-xs text-muted-foreground">{formatTime(date)}</div>
          </div>
        );
      },
    },
    {
      id: "creditNoteNumber",
      accessorKey: "creditNoteNumber",
      header: "Credit Note No.",
      cell: ({ row }) => (
        <span className="font-mono font-medium">
          {row.getValue("creditNoteNumber")}
        </span>
      ),
      meta: {
        label: "Credit Note No.",
        placeholder: "Search credit note no...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      id: "partyName",
      accessorKey: "partySnapshot.displayName",
      header: "Party",
      cell: ({ row }) => {
        // ✅ Use snapshot as primary, fallback to populated party
        const name = row.original.partySnapshot?.displayName
          || row.original.partyId?.company
          || row.original.partyId?.name
          || "Unknown";

        const party = row.original.partyId;
        const roles = party?.roles || {};

        let variant = "secondary";
        if (roles.supplier) variant = "warning";
        else if (roles.customer) variant = "primary";

        return (
          <Badge variant={variant as any} appearance="outline" className="gap-1">
            {name}
          </Badge>
        );
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
        const creditNote = row.original;
        const refresh = onRefresh || (() => { });

        return (
          <StatusBadgeButton
            creditNote={creditNote}
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
        const creditNote = row.original;
        const paidAmount = creditNote.paidAmount || 0;
        const Icon = getPaymentStatusIcon(creditNote.paymentStatus);

        return (
          <div className="space-y-1">
            <Badge
              variant={getPaymentStatusVariant(creditNote.paymentStatus) as any}
              appearance="outline"
              className="gap-1 pr-2.5 capitalize"
            >
              <Icon className="h-3 w-3" />
              {creditNote.paymentStatus}
            </Badge>
            <div className="text-xs text-muted-foreground">
              <span>{formatCurrency(paidAmount)}</span>
              <span className="mx-1">/</span>
              <span className="text-green-600">{formatCurrency(creditNote.grandTotal)}</span>
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
        const creditNote = row.original;
        return (onViewPaymentPdf && onViewReturnNotePdf) ? (
          <ConnectedDocumentsBadges
            creditNote={creditNote as any}
            onViewPaymentPdf={onViewPaymentPdf}
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
        const creditNote = row.original;
        const refresh = onRefresh || (() => { });

        return (
          <div className="flex gap-2">
            <CreatePaymentButton
              creditNote={creditNote}
              onRefresh={refresh}
              canCreatePayment={permissions.canCreatePayment}
            />
          </div>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <RowActions
          creditNote={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          onViewPdf={onViewPdf}
          permissions={permissions}
        />
      ),
    },
  ];