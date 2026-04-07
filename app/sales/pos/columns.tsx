// app/sales/pos/columns.tsx
"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
    MoreHorizontal, ArrowUpDown, Trash2, FileText, Eye,
    Banknote, CreditCard, Smartphone, Building, Receipt,
    User, ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate, formatTime } from "@/utils/formatters/date";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface POSSale {
    _id: string;
    saleNumber: string;
    customerType: "walk-in" | "party";
    customerName: string;
    partyId?: any;
    partySnapshot?: { displayName: string };
    items: Array<{
        description: string;
        quantity: number;
        rate: number;
        total: number;
    }>;
    discount: number;
    totalAmount: number;
    vatAmount: number;
    grandTotal: number;
    paymentMethod: string;
    createdAt: string;
    updatedAt: string;
    isDeleted?: boolean;
}

export interface POSPermissions {
    canDelete: boolean;
    canViewPdf: boolean;
}

// ─── Payment method icon ──────────────────────────────────────────────────────
const PaymentIcon = ({ method }: { method: string }) => {
    const icons: Record<string, React.ElementType> = {
        Cash: Banknote,
        "Credit Card": CreditCard,
        "Debit Card": CreditCard,
        UPI: Smartphone,
        "Bank Transfer": Building,
        Cheque: Building,
    };
    const Icon = icons[method] || Banknote;
    return <Icon className="size-3.5" />;
};

// ─── Row actions ──────────────────────────────────────────────────────────────
const RowActions = ({
    sale,
    onViewPdf,
    onView,
    onDelete,
    permissions,
}: {
    sale: POSSale;
    onViewPdf: (sale: POSSale) => void;
    onView?: (sale: POSSale) => void;
    onDelete: (id: string) => void;
    permissions: POSPermissions;
}) => {
    const [deleteOpen, setDeleteOpen] = React.useState(false);

    return (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="size-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    {onView && (
                        <DropdownMenuItem onClick={() => onView(sale)} className="cursor-pointer">
                            <Eye className="mr-2 size-4" />
                            View Details
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onViewPdf(sale)} className="cursor-pointer">
                        <FileText className="mr-2 size-4" />
                        Print Receipt
                    </DropdownMenuItem>
                    {permissions.canDelete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive cursor-pointer"
                                onSelect={e => { e.preventDefault(); setDeleteOpen(true); }}
                            >
                                <Trash2 className="mr-2 size-4" />
                                Delete
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete POS Sale</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-3">
                            <p>Are you sure you want to delete sale <strong>{sale.saleNumber}</strong>?</p>
                            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900 text-sm">
                                <p className="font-medium text-orange-900 dark:text-orange-100">⚠️ This will:</p>
                                <ul className="mt-1 text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                                    <li>Restore stock deducted by this sale</li>
                                    <li>Void the associated journal entry</li>
                                </ul>
                            </div>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        onClick={() => { onDelete(sale._id); setDeleteOpen(false); }}
                    >
                        Delete Sale
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

// ─── Column definitions ───────────────────────────────────────────────────────
export const getColumns = (
    onViewPdf: (sale: POSSale) => void,
    onDelete: (id: string) => void,
    permissions: POSPermissions,
    onRefresh?: () => void,
    onView?: (sale: POSSale) => void,
): ColumnDef<POSSale>[] => [
        {
            accessorKey: "createdAt",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="h-8 px-2"
                >
                    Date
                    <ArrowUpDown className="ml-2 size-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const date = new Date(row.original.createdAt);
                return (
                    <div>
                        <div className="text-sm font-medium">{formatDisplayDate(date)}</div>
                        <div className="text-xs text-muted-foreground">{formatTime(date)}</div>
                    </div>
                );
            },
            sortingFn: (a, b) =>
                new Date(b.original.createdAt).getTime() - new Date(a.original.createdAt).getTime(),
        },
        {
            accessorKey: "saleNumber",
            header: "Sale No.",
            cell: ({ row }) => (
                <span className="font-mono text-sm font-medium">{row.getValue("saleNumber")}</span>
            ),
            meta: {
                label: "Sale No.",
                placeholder: "Search sale no…",
                variant: "text",
            },
            enableColumnFilter: true,
        },
        {
            id: "customerName",
            accessorKey: "customerName",
            header: "Customer",
            cell: ({ row }) => {
                const isWalkin = row.original.customerType === "walk-in";
                return (
                    <div className="flex items-center gap-1.5">
                        {isWalkin ? (
                            <Badge variant="secondary" appearance="outline" className="gap-1 text-xs">
                                <User className="size-3" />
                                Walk-in
                            </Badge>
                        ) : (
                            <Badge variant="primary" appearance="outline" className="gap-1 text-xs">
                                <User className="size-3" />
                                {row.original.customerName}
                            </Badge>
                        )}
                    </div>
                );
            },
            meta: {
                label: "Customer",
                placeholder: "Search customer…",
                variant: "text",
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: "items",
            header: "Items",
            cell: ({ row }) => {
                const items = row.original.items;
                return (
                    <div className="text-sm">
                        <span className="font-medium">{items.length}</span>
                        <span className="text-muted-foreground text-xs"> item(s)</span>
                    </div>
                );
            },
        },
        {
            accessorKey: "paymentMethod",
            header: "Payment",
            cell: ({ row }) => (
                <Badge variant="secondary" appearance="outline" className="gap-1.5 text-xs font-medium">
                    <PaymentIcon method={row.original.paymentMethod} />
                    {row.original.paymentMethod}
                </Badge>
            ),
            meta: {
                label: "Payment",
                variant: "select",
                options: [
                    { label: "Cash", value: "Cash" },
                    { label: "Credit Card", value: "Credit Card" },
                    { label: "UPI", value: "UPI" },
                    { label: "Bank Transfer", value: "Bank Transfer" },
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
                    className="h-8 px-2"
                >
                    Total
                    <ArrowUpDown className="ml-2 size-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <div className="text-right">
                    <div className="font-semibold text-sm text-green-600">
                        {formatCurrency(row.original.grandTotal)}
                    </div>
                    {row.original.vatAmount > 0 && (
                        <div className="text-[10px] text-muted-foreground">
                            incl. VAT {formatCurrency(row.original.vatAmount)}
                        </div>
                    )}
                </div>
            ),
        },
        {
            id: "actions",
            cell: ({ row }) => (
                <RowActions
                    sale={row.original}
                    onViewPdf={onViewPdf}
                    onView={onView}
                    onDelete={onDelete}
                    permissions={permissions}
                />
            ),
        },
    ];