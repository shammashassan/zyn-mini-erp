// app/expenses/return-notes/columns.tsx - COMPLETE: Sales & Purchase Only - UPDATED: Invoice opens PDF

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
  Package,
  ShoppingCart,
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
import { cn } from "@/lib/utils";
import { formatDisplayDate, formatTime } from "@/utils/formatters/date";
import { ReturnNoteStatusUpdateModal } from "./ReturnNoteStatusUpdateModal";
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges";
import { toast } from "sonner";

export interface ReturnNote {
  _id: string;
  returnNumber: string;
  returnType: 'salesReturn' | 'purchaseReturn';
  
  purchaseId?: string | any;
  purchaseReference?: string;
  supplierName?: string;
  
  invoiceId?: string | any;
  invoiceReference?: string;
  customerName?: string;
  
  items: Array<{
    materialName?: string;
    productName?: string;
    orderedQuantity?: number;
    receivedQuantity?: number;
    returnedQuantity?: number;
    returnQuantity: number;
  }>;
  returnDate: string;
  reason: string;
  notes?: string;
  status: "pending" | "approved" | "cancelled";
  connectedDocuments?: {
    purchaseId?: string | any;
    invoiceId?: string | any;
    debitNoteId?: string | any;
    creditNoteId?: string | any;
  };
  isDeleted: boolean;
  createdBy?: string | null;
  actionHistory?: Array<{
    action: string;
    userId?: string | null;
    username?: string | null;
    timestamp: string;
    changes?: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface ReturnNotePermissions {
  canUpdate: boolean;
  canDelete: boolean;
  canUpdateStatus: boolean;
}

interface RowActionsProps {
  returnNote: ReturnNote;
  onEdit: (returnNote: ReturnNote) => void;
  onDelete: (id: string) => void;
  onView?: (returnNote: ReturnNote) => void;
  onViewPdf?: (returnNote: ReturnNote) => void;
  permissions: ReturnNotePermissions;
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

const getReturnTypeVariant = (type: string) => {
  switch (type) {
    case 'purchaseReturn': return 'warning';
    case 'salesReturn': return 'primary';
    default: return 'secondary';
  }
};

const getReturnTypeIcon = (type: string) => {
  switch (type) {
    case 'purchaseReturn': return Package;
    case 'salesReturn': return ShoppingCart;
    default: return FileText;
  }
};

const getReturnTypeLabel = (type: string) => {
  switch (type) {
    case 'purchaseReturn': return 'Purchase Return';
    case 'salesReturn': return 'Sales Return';
    default: return type;
  }
};

const StatusBadgeButton = ({ 
  returnNote, 
  onRefresh, 
  canUpdateStatus 
}: { 
  returnNote: ReturnNote; 
  onRefresh: () => void; 
  canUpdateStatus: boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const Icon = getStatusIcon(returnNote.status);

  const handleClick = () => {
    if (canUpdateStatus) {
      setIsOpen(true);
    } else {
      toast.error("You don't have permission to update return note status");
    }
  };

  return (
    <>
      <Badge
        variant={getStatusVariant(returnNote.status) as any}
        className={cn(
          "gap-1 pr-2.5 capitalize",
          canUpdateStatus ? "cursor-pointer hover:opacity-80" : "cursor-default"
        )}
        appearance="outline"
        onClick={handleClick}
      >
        <Icon className="h-3 w-3" />
        {returnNote.status}
      </Badge>

      <ReturnNoteStatusUpdateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        returnNote={returnNote}
        onRefresh={onRefresh}
      />
    </>
  );
};

const RowActions = ({
  returnNote,
  onEdit,
  onDelete,
  onView,
  onViewPdf,
  permissions,
}: RowActionsProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const { canUpdate, canDelete } = permissions;

  const canEdit = canUpdate && returnNote.status === "pending";

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
            <DropdownMenuItem onClick={() => onView(returnNote)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
          )}

          {onViewPdf && (
            <DropdownMenuItem onClick={() => onViewPdf(returnNote)}>
              <FileText className="mr-2 h-4 w-4" />
              View PDF
            </DropdownMenuItem>
          )}

          {canEdit && (
            <DropdownMenuItem onClick={() => onEdit(returnNote)}>
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
          <AlertDialogTitle>Delete Return Note</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete return note {returnNote.returnNumber}?
              </p>

              {returnNote.status === "approved" && (
                <div className="space-y-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    ⚠️ This return note has been approved
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {returnNote.returnType === 'purchaseReturn' 
                      ? 'Deleting will reverse the stock adjustments and restore the returned quantities to the purchase.'
                      : 'Deleting will remove the link to the invoice.'}
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
              onDelete(String(returnNote._id));
              setIsDeleteOpen(false);
            }}
          >
            Delete Return Note
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const getColumns = (
  onEdit: (returnNote: ReturnNote) => void,
  onDelete: (id: string) => void,
  permissions: ReturnNotePermissions,
  onView?: (returnNote: ReturnNote) => void,
  onViewPdf?: (returnNote: ReturnNote) => void,
  onRefresh?: () => void,
  onViewPurchase?: (purchase: any) => void,
  onViewInvoicePdf?: (invoice: any) => void, // ✅ RENAMED: Opens PDF instead of modal
  onViewDebitNotePdf?: (debitNote: any) => void,
  onViewCreditNotePdf?: (creditNote: any) => void
): ColumnDef<ReturnNote>[] => [
  {
    id: "returnDate",
    accessorKey: "returnDate",
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
      const date = new Date(row.original.returnDate);
      return (
        <div className="text-left font-medium min-w-[100px]">
          <div>{formatDisplayDate(date)}</div>
          <div className="text-xs text-muted-foreground">{formatTime(date)}</div>
        </div>
      );
    },
  },
  {
    id: "returnNumber",
    accessorKey: "returnNumber",
    header: "Return No.",
    cell: ({ row }) => (
      <span className="font-mono font-medium">
        {row.getValue("returnNumber")}
      </span>
    ),
    meta: {
      label: "Return No.",
      placeholder: "Search return no...",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    id: "returnType",
    accessorKey: "returnType",
    header: "Type",
    cell: ({ row }) => {
      const type = row.original.returnType;
      const Icon = getReturnTypeIcon(type);
      return (
        <Badge
          variant={getReturnTypeVariant(type) as any}
          appearance="outline"
          className="gap-1 pr-2.5 capitalize"
        >
          <Icon className="h-3 w-3" />
          {getReturnTypeLabel(type)}
        </Badge>
      );
    },
    meta: {
      label: "Type",
      variant: "select",
      options: [
        { label: "Purchase Return", value: "purchaseReturn", icon: Package },
        { label: "Sales Return", value: "salesReturn", icon: ShoppingCart },
      ],
    },
    enableColumnFilter: true,
  },
  {
    id: "entity",
    header: "Entity",
    cell: ({ row }) => {
      const returnNote = row.original;
      const entityName = returnNote.supplierName || returnNote.customerName;
      const variant = returnNote.returnType === 'purchaseReturn' ? 'warning' : 'primary';
      
      return entityName ? (
        <Badge variant={variant as any} appearance="outline">
          {entityName}
        </Badge>
      ) : (
        <span className="text-muted-foreground">-</span>
      );
    },
    meta: {
      label: "Entity",
      placeholder: "Search entity...",
      variant: "text",
    },
    enableColumnFilter: true,
  },
  {
    id: "itemsCount",
    header: "Items Returned",
    cell: ({ row }) => {
      const items = row.original.items || [];
      const displayItems = items.slice(0, 2);
      const remainingCount = items.length - 2;

      return (
        <div className="flex flex-col gap-0.5 text-sm">
          {displayItems.map((item, idx) => {
            const itemName = item.materialName || item.productName || 'Unknown';
            return (
              <div key={idx} className="text-muted-foreground">
                {itemName}:{" "}
                <span className="font-medium text-red-600">
                  {item.returnQuantity}
                </span>
              </div>
            );
          })}
          {remainingCount > 0 && (
            <div className="text-muted-foreground">+{remainingCount} more</div>
          )}
        </div>
      );
    },
  },
  {
    id: "totalQuantity",
    header: "Total Qty",
    cell: ({ row }) => {
      const totalQty = row.original.items?.reduce(
        (sum, item) => sum + item.returnQuantity,
        0
      ) || 0;

      return (
        <div className="text-center font-semibold text-red-600">
          {totalQty.toFixed(2)}
        </div>
      );
    },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const returnNote = row.original;
      const refresh = onRefresh || (() => {});
      
      return (
        <StatusBadgeButton
          returnNote={returnNote}
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
    id: "reason",
    accessorKey: "reason",
    header: "Reason",
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground max-w-[200px] truncate block">
        {row.getValue("reason")}
      </span>
    ),
  },
  {
    id: "connectedDocuments",
    header: "Connected",
    cell: ({ row }) => {
      const returnNote = row.original;
      return (onViewPurchase && onViewInvoicePdf && onViewDebitNotePdf && onViewCreditNotePdf) ? (
        <ConnectedDocumentsBadges
          returnNote={returnNote as any}
          onViewPurchase={onViewPurchase}
          onViewInvoicePdf={onViewInvoicePdf}
          onViewDebitNotePdf={onViewDebitNotePdf}
          onViewCreditNotePdf={onViewCreditNotePdf}
        />
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <RowActions
        returnNote={row.original}
        onEdit={onEdit}
        onDelete={onDelete}
        onView={onView}
        onViewPdf={onViewPdf}
        permissions={permissions}
      />
    ),
  },
];