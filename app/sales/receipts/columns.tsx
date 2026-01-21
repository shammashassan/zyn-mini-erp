// app/sales/receipts/columns.tsx

"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, FileText, Trash2, DollarSign, CreditCard, Landmark, Wallet, Eye } from "lucide-react"
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
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges"
import { formatCurrency } from "@/utils/formatters/currency"
import { formatDisplayDate, formatTime } from "@/utils/formatters/date"

// EXPORTED INTERFACES
export interface ConnectedInvoice {
    _id: string;
    invoiceNumber: string;
    documentType: string;
}

export interface ConnectedCreditNote {
    _id: string;
    creditNoteNumber: string;
    grandTotal: number;
    status: string;
    paymentStatus: string;
}

export interface ConnectedDebitNote {
    _id: string;
    debitNoteNumber: string;
    grandTotal: number;
    status: string;
    paymentStatus: string;
}

export interface Receipt {
    _id: string;
    invoiceNumber: string;
    customerName?: string;
    payeeName?: string;
    customerPhone?: string;
    customerEmail?: string;
    grandTotal: number;
    voucherType: "receipt";
    items: Array<{
        description: string;
        quantity: number;
        rate: number;
        total: number;
    }>;
    paymentMethod: string;
    connectedDocuments?: {
        invoiceId?: string | ConnectedInvoice;
        invoiceIds?: (string | ConnectedInvoice)[];
        creditNoteIds?: (string | ConnectedCreditNote)[];
        debitNoteIds?: (string | ConnectedDebitNote)[];
    };
    voucherDate: string;
    createdAt: string;
    updatedAt: string;
}

interface ReceiptPermissions {
    canDelete: boolean;
}

interface RowActionsProps {
    receipt: Receipt;
    onViewPdf: (receipt: Receipt) => void;
    onView?: (receipt: Receipt) => void;
    onDelete?: (id: string) => void;
    onRefresh: () => void;
    permissions: ReceiptPermissions;
}

const RowActions = ({ receipt, onDelete, onViewPdf, onView, permissions }: RowActionsProps) => {
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = React.useState(false)
    const { canDelete } = permissions;

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
                        <>
                            <DropdownMenuItem onSelect={() => onView(receipt)}>
                                <Eye className="mr-2 w-4 h-4" />
                                View Details
                            </DropdownMenuItem>
                        </>
                    )}
                    <DropdownMenuItem onSelect={() => onViewPdf(receipt)}>
                        <FileText className="mr-2 w-4 h-4" />
                        View PDF
                    </DropdownMenuItem>
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
                            receipt "{receipt.invoiceNumber}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className={cn(buttonVariants({ variant: "destructive" }))}
                            onClick={() => {
                                onDelete?.(receipt._id)
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

const getPaymentMethodIcon = (method: string) => {
    const normalizedMethod = method?.toLowerCase() || '';
    if (normalizedMethod.includes('cash')) return DollarSign;
    if (normalizedMethod.includes('bank')) return Landmark;
    if (normalizedMethod.includes('cheque') || normalizedMethod.includes('check')) return FileText;
    if (normalizedMethod.includes('card')) return CreditCard;
    return Wallet;
};

export const getColumns = (
    onViewPdf: (receipt: Receipt) => void,
    onDelete: (id: string) => void,
    permissions: ReceiptPermissions,
    onRefresh?: () => void,
    onView?: (receipt: Receipt) => void,
    onViewInvoice?: (invoice: any) => void,
    onViewCreditNote?: (creditNote: any) => void,
    onViewDebitNote?: (debitNote: any) => void,
): ColumnDef<Receipt>[] => [
        {
            accessorKey: "voucherDate",
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
                const date = new Date(row.original.voucherDate);
                return (
                    <div className="text-left font-medium">
                        <div>{formatDisplayDate(date)}</div>
                        <div className="text-xs text-muted-foreground">
                            {formatTime(date)}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "invoiceNumber",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                >
                    Receipt No.
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <span className="font-mono">
                    {row.getValue("invoiceNumber")}
                </span>
            ),
            meta: {
                label: "Receipt No.",
                placeholder: "Search receipt no...",
                variant: "text",
            },
            enableColumnFilter: true,
        },
        {
            id: "partyName",
            accessorFn: (row) => row.customerName || row.payeeName || "",
            header: "Party",
            cell: ({ row }) => {
                const receipt = row.original;

                if (receipt.customerName) {
                    return (
                        <Badge variant="primary" appearance="outline" className="gap-1">
                            {receipt.customerName}
                        </Badge>
                    );
                }

                if (receipt.payeeName) {
                    return (
                        <Badge variant="cyan" appearance="outline" className="gap-1">
                            {receipt.payeeName}
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
            id: "paymentMethod",
            accessorKey: "paymentMethod",
            header: "Payment Method",
            cell: ({ row }) => {
                const method = row.getValue("paymentMethod") as string;
                const Icon = getPaymentMethodIcon(method);
                const isCash = method?.toLowerCase() === "cash";

                return (
                    <Badge
                        variant={isCash ? "success" : "primary"}
                        appearance="outline"
                        className="gap-1 pr-2.5"
                    >
                        <Icon className="h-3 w-3" />
                        {method}
                    </Badge>
                );
            },
            meta: {
                label: "Payment Method",
                variant: "select",
                icon: CreditCard,
                options: [
                    { label: "Cash", value: "Cash", icon: DollarSign },
                    { label: "Bank Transfer", value: "Bank Transfer", icon: Landmark },
                    { label: "Cheque", value: "Cheque", icon: FileText },
                    { label: "Debit Card", value: "Debit Card", icon: CreditCard },
                    { label: "Credit Card", value: "Credit Card", icon: CreditCard },
                ],
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "grandTotal",
            header: () => <div className="text-right">Amount</div>,
            cell: ({ row }) => {
                const amount = parseFloat(row.getValue("grandTotal"))
                return <div className="text-right font-medium">{formatCurrency(amount)}</div>
            },
        },
        {
            id: "connectedDocs",
            header: () => <div className="text-center">Connected</div>,
            cell: ({ row }) => {
                const receipt = row.original
                return (
                    <div className="flex justify-center">
                        <ConnectedDocumentsBadges
                            receipt={receipt}
                            onViewPdf={onViewPdf}
                            onViewInvoice={onViewInvoice}
                            onViewCreditNote={onViewCreditNote}
                            onViewDebitNote={onViewDebitNote}
                        />
                    </div>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <RowActions
                    receipt={row.original}
                    onDelete={onDelete}
                    onViewPdf={onViewPdf}
                    onView={onView}
                    onRefresh={onRefresh || (() => { })}
                    permissions={permissions}
                />
            ),
        },
    ]
