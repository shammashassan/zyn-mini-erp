// app/procurement/payments/columns.tsx

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
export interface ConnectedPurchase {
    _id: string;
    referenceNumber: string;
    supplierName?: string;
    totalAmount: number;
    date: Date;
    status: string;
    paymentStatus: string;
    items: any[];
    connectedDocuments?: any;
    paidAmount?: number;
    remainingAmount?: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string | null;
    updatedBy?: string | null;
    actionHistory?: any[];
}

export interface ConnectedExpense {
    _id: string;
    referenceNumber: string;
    description: string;
    amount: number;
    category: string;
    type: 'single' | 'period';
    date: Date;
    status: 'pending' | 'approved' | 'cancelled';
    paymentStatus: 'Pending' | 'Paid' | 'Partially Paid';
    vendor?: string;
    connectedDocuments?: any;
}

export interface ConnectedCreditNote {
    _id: string;
    creditNoteNumber: string;
    grandTotal: number;
    status: string;
    paymentStatus: string;
}

export interface Payment {
    _id: string;
    invoiceNumber: string;
    customerName?: string;
    supplierName?: string;
    payeeName?: string;
    vendorName?: string;
    grandTotal: number;
    voucherType: "payment";
    items: Array<{
        description: string;
        quantity: number;
        rate: number;
        total: number;
    }>;
    paymentMethod: string;
    connectedDocuments?: {
        purchaseId?: string | ConnectedPurchase;
        purchaseIds?: (string | ConnectedPurchase)[];
        expenseIds?: (string | ConnectedExpense)[];
        creditNoteIds?: (string | ConnectedCreditNote)[];
    };
    voucherDate: string;
    createdAt: string;
    updatedAt: string;
}

interface PaymentPermissions {
    canDelete: boolean;
}

interface RowActionsProps {
    payment: Payment;
    onViewPdf: (payment: Payment) => void;
    onView?: (payment: Payment) => void;
    onDelete?: (id: string) => void;
    onRefresh: () => void;
    permissions: PaymentPermissions;
}

const RowActions = ({ payment, onDelete, onViewPdf, onView, permissions }: RowActionsProps) => {
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
                            <DropdownMenuItem onSelect={() => onView(payment)}>
                                <Eye className="mr-2 w-4 h-4" />
                                View Details
                            </DropdownMenuItem>
                        </>
                    )}
                    <DropdownMenuItem onSelect={() => onViewPdf(payment)}>
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
                            payment "{payment.invoiceNumber}".
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className={cn(buttonVariants({ variant: "destructive" }))}
                            onClick={() => {
                                onDelete?.(payment._id)
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
    onViewPdf: (payment: Payment) => void,
    onDelete: (id: string) => void,
    permissions: PaymentPermissions,
    onRefresh?: () => void,
    onView?: (payment: Payment) => void,
    onViewPurchase?: (purchase: any) => void,
    onViewExpense?: (expense: any) => void,
    onViewCreditNote?: (creditNote: any) => void,
): ColumnDef<Payment>[] => [
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
                    Payment No.
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <span className="font-mono">
                    {row.getValue("invoiceNumber")}
                </span>
            ),
            meta: {
                label: "Payment No.",
                placeholder: "Search payment no...",
                variant: "text",
            },
            enableColumnFilter: true,
        },
        {
            id: "partyName",
            accessorFn: (row) => row.customerName || row.supplierName || row.payeeName || row.vendorName || "",
            header: "Party",
            cell: ({ row }) => {
                const payment = row.original;

                if (payment.customerName) {
                    return (
                        <Badge variant="primary" appearance="outline" className="gap-1">
                            {payment.customerName}
                        </Badge>
                    );
                }

                if (payment.supplierName) {
                    return (
                        <Badge variant="warning" appearance="outline" className="gap-1">
                            {payment.supplierName}
                        </Badge>
                    );
                }

                if (payment.payeeName) {
                    return (
                        <Badge variant="cyan" appearance="outline" className="gap-1">
                            {payment.payeeName}
                        </Badge>
                    );
                }

                if (payment.vendorName) {
                    return (
                        <Badge variant="neutral" appearance="outline" className="gap-1">
                            {payment.vendorName}
                        </Badge>
                    );
                }

                return <span className="text-muted-foreground">Not Specified</span>;
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
                const payment = row.original
                return (
                    <div className="flex justify-center">
                        <ConnectedDocumentsBadges
                            payment={payment}
                            onViewPdf={onViewPdf}
                            onViewPurchase={onViewPurchase}
                            onViewExpense={onViewExpense}
                            onViewCreditNote={onViewCreditNote}
                        />
                    </div>
                )
            },
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <RowActions
                    payment={row.original}
                    onDelete={onDelete}
                    onViewPdf={onViewPdf}
                    onView={onView}
                    onRefresh={onRefresh || (() => { })}
                    permissions={permissions}
                />
            ),
        },
    ]
