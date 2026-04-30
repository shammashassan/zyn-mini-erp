"use client";

import React from "react";
import { ShoppingBag, Printer, Undo2 } from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime } from "@/utils/formatters/date";
import { POSSale } from "./columns";

interface POSViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    sale: POSSale | null;
    onViewPdf: (sale: POSSale) => void;
    onReturnItems?: (sale: POSSale) => void;
}

export function POSViewModal({
    isOpen,
    onClose,
    sale,
    onViewPdf,
    onReturnItems,
}: POSViewModalProps) {
    if (!sale) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl h-[85vh] p-0 flex flex-col gap-0 overflow-hidden">
                <DialogHeader className="p-6 pb-4 border-b">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-primary/10 rounded-xl">
                                <ShoppingBag className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                    {sale.saleNumber}
                                </DialogTitle>
                                <p className="text-sm text-muted-foreground">
                                    POS Sale Details
                                </p>
                            </div>
                        </div>
            </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sidebar-scroll">
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-6 text-sm">
                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Customer</p>
                                <p className="font-medium text-base">{sale.customerName}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Payment Method</p>
                                <p className="font-medium text-base">{sale.paymentMethod}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Date & Time</p>
                                <p className="font-medium text-base">{formatDateTime(sale.createdAt)}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Total Items</p>
                                <p className="font-medium text-base">{sale.items.length} item(s)</p>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <p className="text-sm font-semibold flex items-center gap-2">
                                Item List
                            </p>
                            <div className="rounded-xl border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50">
                                        <tr>
                                            <th className="py-2 px-3 text-left font-medium text-muted-foreground">Item</th>
                                            <th className="py-2 px-3 text-center font-medium text-muted-foreground">Qty</th>
                                            <th className="py-2 px-3 text-right font-medium text-muted-foreground">Rate</th>
                                            <th className="py-2 px-3 text-right font-medium text-muted-foreground">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y text-xs sm:text-sm">
                                        {sale.items.map((item, i) => (
                                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-2.5 px-3 font-medium">{item.description}</td>
                                                <td className="py-2.5 px-3 text-center tabular-nums">{item.quantity}</td>
                                                <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums">
                                                    {formatCurrency(item.rate)}
                                                </td>
                                                <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                                                    {formatCurrency(item.total)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="rounded-xl bg-muted/40 p-4 space-y-2 text-sm border border-border/50">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="font-medium">{formatCurrency(sale.totalAmount)}</span>
                            </div>
                            {sale.discount > 0 && (
                                <div className="flex justify-between items-center text-destructive">
                                    <span>Discount</span>
                                    <span>- {formatCurrency(sale.discount)}</span>
                                </div>
                            )}
                            {sale.vatAmount > 0 && (
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">VAT</span>
                                    <span className="font-medium">{formatCurrency(sale.vatAmount)}</span>
                                </div>
                            )}
                            <Separator className="my-2" />
                            <div className="flex justify-between items-center font-bold text-lg">
                                <span>Grand Total</span>
                                <span className="text-green-600">{formatCurrency(sale.grandTotal)}</span>
                            </div>
                        </div>
                    </div>
        </div>

                <div className="p-4 border-t bg-muted/20 flex gap-3">
                    <Button 
                        variant="outline" 
                        className="flex-1 gap-2" 
                        onClick={() => onViewPdf(sale)}
                    >
                        <Printer className="h-4 w-4" />
                        Print Receipt
                    </Button>
                    {onReturnItems && sale.status !== 'voided' && (
                        <Button 
                            variant="destructive" 
                            className="flex-1 gap-2" 
                            onClick={() => onReturnItems(sale)}
                        >
                            <Undo2 className="h-4 w-4" />
                            Return Items
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
