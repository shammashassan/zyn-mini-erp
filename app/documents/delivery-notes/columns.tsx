// app/documents/delivery-notes/columns.tsx - UPDATED: Using deliveryDate instead of createdAt

"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, Trash2, FileText, CheckCircle, Clock, XCircle, Truck, AlertCircle, Edit, Eye } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { StatusUpdateModal } from "./StatusUpdateModal"
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges"
import { formatDisplayDate, formatTime } from "@/utils/formatters/date"
import { toast } from "sonner"

export interface ConnectedInvoice {
  _id: string;
  invoiceNumber: string;
  documentType: string;
}

export interface DeliveryNote {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  grandTotal: number;
  status: "pending" | "dispatched" | "delivered" | "cancelled";
  notes: string;
  documentType: "delivery";
  deliveryDate: string; // ✅ UPDATED: Changed from createdAt to deliveryDate
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
  connectedDocuments?: {
    invoiceIds?: (string | ConnectedInvoice)[];
  };
  createdAt: string;
  updatedAt: string;
}

interface DeliveryNotePermissions {
  canDelete: boolean;
  canUpdate: boolean;
}

interface RowActionsProps {
  note: DeliveryNote
  onEdit?: (note: DeliveryNote) => void
  onView?: (note: DeliveryNote) => void
  onViewPdf: (note: DeliveryNote) => void
  onDelete?: (id: string) => void
  onRefresh: () => void
  permissions: DeliveryNotePermissions
}

const RowActions = ({ note, onEdit, onView, onDelete, onViewPdf, onRefresh, permissions }: RowActionsProps) => {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
  const { canDelete, canUpdate } = permissions;

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
          
          {onView && (
            <DropdownMenuItem onSelect={() => onView(note)}>
              <Eye className="mr-2 w-4 h-4" />
              View Details
            </DropdownMenuItem>
          )}
          
          <DropdownMenuItem onSelect={() => onViewPdf(note)}>
            <FileText className="mr-2 w-4 h-4" />
            View PDF
          </DropdownMenuItem>

          {canUpdate && onEdit && (
            <DropdownMenuItem onSelect={() => onEdit(note)}>
              <Edit className="mr-2 w-4 h-4" />
              Edit
            </DropdownMenuItem>
          )}

          {canDelete && onDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => setIsDeleteDialogOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 w-4 h-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              delivery note "{note.invoiceNumber}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={() => {
                onDelete?.(note._id)
                setIsDeleteDialogOpen(false)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'delivered': return CheckCircle;
    case 'dispatched': return Truck;
    case 'cancelled': return XCircle;
    case 'pending': return Clock;
    default: return AlertCircle;
  }
};

const StatusBadgeButton = ({ note, onRefresh, canUpdate }: { note: DeliveryNote; onRefresh: () => void, canUpdate: boolean }) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const Icon = getStatusIcon(note.status);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered': return 'success'
      case 'dispatched': return 'primary'
      case 'cancelled': return 'destructive'
      case 'pending': return 'warning'
      default: return 'neutral'
    }
  }

  const handleClick = () => {
    if (canUpdate) {
      setIsOpen(true);
    } else {
      toast.error("You don't have permission to update status");
    }
  }

  return (
    <>
      <Badge
        variant={getStatusVariant(note.status) as any}
        className={cn("gap-1 pr-2.5", canUpdate ? "cursor-pointer hover:opacity-80" : "cursor-default")}
        appearance="outline"
        onClick={handleClick}
      >
        <Icon className="h-3 w-3" />
        {note.status}
      </Badge>

      <StatusUpdateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        deliveryNote={note}
        onRefresh={onRefresh}
      />
    </>
  )
}

export const getColumns = (
  onViewPdf: (note: DeliveryNote) => void,
  onDelete: (id: string) => void,
  permissions: DeliveryNotePermissions,
  onRefresh?: () => void,
  onEdit?: (note: DeliveryNote) => void,
  onView?: (note: DeliveryNote) => void,
): ColumnDef<DeliveryNote>[] => [
  {
    accessorKey: "deliveryDate", // ✅ UPDATED: Changed from createdAt to deliveryDate
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
      const date = new Date(row.original.deliveryDate); // ✅ UPDATED
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
      const dateA = new Date(rowA.original.deliveryDate); // ✅ UPDATED
      const dateB = new Date(rowB.original.deliveryDate); // ✅ UPDATED
      return dateB.getTime() - dateA.getTime();
    },
  },
  {
    accessorKey: "invoiceNumber",
    header: "Delivery No.",
    cell: ({ row }) => (
      <span className="font-mono font-medium">
        {row.getValue("invoiceNumber")}
      </span>
    ),
    meta: {
      label: "Delivery No",
      placeholder: "search delivery no...",
      variant: "text"
    },
    enableColumnFilter: true,
  },
  {
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
      placeholder: "search customer name...",
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
              {item.description}: <span className="font-medium text-foreground">{item.quantity}</span>
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
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const note = row.original;
      const refresh = onRefresh || (() => { });

      return <StatusBadgeButton note={note} onRefresh={refresh} canUpdate={permissions.canUpdate} />;
    },
    meta: {
      label: "Status",
      variant: "select",
      options: [
        { label: "Pending", value: "pending", icon: Clock },
        { label: "Dispatched", value: "dispatched", icon: Truck },
        { label: "Delivered", value: "delivered", icon: CheckCircle },
        { label: "Cancelled", value: "cancelled", icon: XCircle },
      ],
    },
    enableColumnFilter: true,
  },
  {
    id: "connectedDocs",
    header: "Connected Documents",
    cell: ({ row }) => {
      const note = row.original
      return (
        <ConnectedDocumentsBadges
          deliveryNote={note}
          onViewPdf={onViewPdf}
        />
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <RowActions
        note={row.original}
        onEdit={onEdit}
        onView={onView}
        onDelete={onDelete}
        onViewPdf={onViewPdf}
        onRefresh={onRefresh || (() => { })}
        permissions={permissions}
      />
    ),
  },
]