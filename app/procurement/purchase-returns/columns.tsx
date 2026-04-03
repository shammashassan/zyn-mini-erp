// app/procurement/purchase-returns/columns.tsx

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
import { PurchaseReturnStatusUpdateModal } from "./PurchaseReturnStatusUpdateModal";
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges";
import { toast } from "sonner";

export interface PurchaseReturn {
  _id: string;
  returnNumber: string;
  returnType: 'purchaseReturn';

  purchaseId?: string | any;
  purchaseReference?: string;
  partyId: any;
  partySnapshot?: any;

  items: Array<{
    description?: string;
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
    debitNoteId?: string | any;
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

interface PurchaseReturnPermissions {
  canUpdate: boolean;
  canDelete: boolean;
  canUpdateStatus: boolean;
}

interface RowActionsProps {
  purchaseReturn: PurchaseReturn;
  onEdit: (purchaseReturn: PurchaseReturn) => void;
  onDelete: (id: string) => void;
  onView?: (purchaseReturn: PurchaseReturn) => void;
  onViewPdf?: (purchaseReturn: PurchaseReturn) => void;
  permissions: PurchaseReturnPermissions;
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

const StatusBadgeButton = ({
  purchaseReturn,
  onRefresh,
  canUpdateStatus
}: {
  purchaseReturn: PurchaseReturn;
  onRefresh: () => void;
  canUpdateStatus: boolean;
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const Icon = getStatusIcon(purchaseReturn.status);

  const handleClick = () => {
    if (canUpdateStatus) {
      setIsOpen(true);
    } else {
      toast.error("You don't have permission to update purchase return status");
    }
  };

  return (
    <>
      <Badge
        variant={getStatusVariant(purchaseReturn.status) as any}
        className={cn(
          "gap-1 pr-2.5 capitalize",
          canUpdateStatus ? "cursor-pointer hover:opacity-80" : "cursor-default"
        )}
        appearance="outline"
        onClick={handleClick}
      >
        <Icon className="h-3 w-3" />
        {purchaseReturn.status}
      </Badge>

      <PurchaseReturnStatusUpdateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        purchaseReturn={purchaseReturn}
        onRefresh={onRefresh}
      />
    </>
  );
};

const RowActions = ({
  purchaseReturn,
  onEdit,
  onDelete,
  onView,
  onViewPdf,
  permissions,
}: RowActionsProps) => {
  const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);
  const { canUpdate, canDelete } = permissions;

  const canEdit = canUpdate && purchaseReturn.status === "pending";

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
            <DropdownMenuItem onClick={() => onView(purchaseReturn)}>
              <Eye className="mr-2 h-4 w-4" />
              View Details
            </DropdownMenuItem>
          )}

          {onViewPdf && (
            <DropdownMenuItem onClick={() => onViewPdf(purchaseReturn)}>
              <FileText className="mr-2 h-4 w-4" />
              View PDF
            </DropdownMenuItem>
          )}

          {canEdit && (
            <DropdownMenuItem onClick={() => onEdit(purchaseReturn)}>
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
          <AlertDialogTitle>Delete Purchase Return</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                Are you sure you want to delete purchase return {purchaseReturn.returnNumber}?
              </p>

              {purchaseReturn.status === "approved" && (
                <div className="space-y-3 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    ⚠️ This purchase return has been approved
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Deleting will reverse the stock adjustments and restore the returned quantities to the purchase.
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
              onDelete(String(purchaseReturn._id));
              setIsDeleteOpen(false);
            }}
          >
            Delete Purchase Return
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export const getColumns = (
  onEdit: (purchaseReturn: PurchaseReturn) => void,
  onDelete: (id: string) => void,
  permissions: PurchaseReturnPermissions,
  onView?: (purchaseReturn: PurchaseReturn) => void,
  onViewPdf?: (purchaseReturn: PurchaseReturn) => void,
  onRefresh?: () => void,
  onViewPurchase?: (purchase: any) => void,
  onViewDebitNotePdf?: (debitNote: any) => void
): ColumnDef<PurchaseReturn>[] => [
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
      id: "partyName",
      accessorKey: "partyId",
      header: "Party",
      cell: ({ row }) => {
        const partySnapshot = row.original.partySnapshot as any;
        const party = row.original.partyId as any;
        const name = partySnapshot?.displayName || (party?.name || party?.company) || "Unknown";
        return (
          <Badge variant="warning" appearance="outline">
            {name}
          </Badge>
        );
      },
      meta: {
        label: "Party",
        placeholder: "Search party...",
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
              const itemName = item.description || 'Unknown';
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
        const purchaseReturn = row.original;
        const refresh = onRefresh || (() => { });

        return (
          <StatusBadgeButton
            purchaseReturn={purchaseReturn}
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
        const purchaseReturn = row.original;
        return (onViewPurchase && onViewDebitNotePdf) ? (
          <ConnectedDocumentsBadges
            purchaseReturn={purchaseReturn as any}
            onViewPurchase={onViewPurchase}
            onViewDebitNotePdf={onViewDebitNotePdf}
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
          purchaseReturn={row.original}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          onViewPdf={onViewPdf}
          permissions={permissions}
        />
      ),
    },
  ];