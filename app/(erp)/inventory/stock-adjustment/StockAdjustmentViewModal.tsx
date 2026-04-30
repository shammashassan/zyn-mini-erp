// app/inventory/stock-adjustment/StockAdjustmentViewModal.tsx

"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
    TrendingUp,
    TrendingDown,
    ArrowRight,
    Tag,
    MessageSquare,
    FileText,
    Clock,
    Package,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime } from "@/utils/formatters/date";
import { cn } from "@/lib/utils";

interface StockAdjustmentViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    adjustment: any | null;
}

export function StockAdjustmentViewModal({
    isOpen,
    onClose,
    adjustment,
}: StockAdjustmentViewModalProps) {
    if (!isOpen || !adjustment) return null;

    const isIncrement = adjustment.adjustmentType === 'increment';
    const AdjIcon = isIncrement ? TrendingUp : TrendingDown;
    const hasUnitCostChange =
        typeof adjustment.oldCostPrice === 'number' &&
        typeof adjustment.newCostPrice === 'number' &&
        adjustment.oldCostPrice !== adjustment.newCostPrice;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
                {/* Coloured header strip */}
                <div
                    className={cn(
                        'px-5 py-4 flex items-center justify-between',
                        isIncrement
                            ? 'bg-emerald-50 dark:bg-emerald-950/40'
                            : 'bg-red-50 dark:bg-red-950/40'
                    )}
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div
                            className={cn(
                                'p-1.5 rounded-md shrink-0',
                                isIncrement
                                    ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                            )}
                        >
                            <AdjIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                            <DialogTitle className="text-sm font-semibold leading-none truncate">
                                {adjustment.itemName}
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                                {adjustment.adjustmentType} adjustment
                            </p>
                        </div>
                    </div>
                    <Badge
                        variant={isIncrement ? 'success' : 'destructive'}
                        appearance="outline"
                        className="text-xs shrink-0 ml-3"
                    >
                        {isIncrement ? '+' : '−'}{adjustment.value?.toFixed(2)}
                    </Badge>
                </div>

                {/* Body */}
                <div className="px-5 py-4 space-y-4">

                    {/* Stock change row */}
                    <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                            Stock Level
                        </p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 text-center bg-muted/50 rounded-md py-2 px-3">
                                <div className="text-[10px] text-muted-foreground mb-0.5">Before</div>
                                <div className="text-base font-semibold tabular-nums">
                                    {adjustment.oldStock?.toFixed(2)}
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            <div className="flex-1 text-center bg-muted/50 rounded-md py-2 px-3">
                                <div className="text-[10px] text-muted-foreground mb-0.5">After</div>
                                <div
                                    className={cn(
                                        'text-base font-semibold tabular-nums',
                                        isIncrement
                                            ? 'text-emerald-600 dark:text-emerald-400'
                                            : 'text-orange-600 dark:text-orange-400'
                                    )}
                                >
                                    {adjustment.newStock?.toFixed(2)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Unit cost change (if any) */}
                    {hasUnitCostChange && (
                        <div>
                            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                                Unit Cost
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 text-center bg-muted/50 rounded-md py-2 px-3">
                                    <div className="text-[10px] text-muted-foreground mb-0.5">Before</div>
                                    <div className="text-base font-semibold tabular-nums">
                                        {formatCurrency(adjustment.oldCostPrice)}
                                    </div>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 text-center bg-muted/50 rounded-md py-2 px-3">
                                    <div className="text-[10px] text-muted-foreground mb-0.5">After</div>
                                    <div className="text-base font-semibold tabular-nums text-blue-600 dark:text-blue-400">
                                        {formatCurrency(adjustment.newCostPrice)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Divider */}
                    <div className="border-t" />

                    {/* Meta rows */}
                    <div className="space-y-2.5">
                        {adjustment.adjustmentReason && (
                            <div className="flex items-start gap-2.5">
                                <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                                <div className="min-w-0">
                                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide block mb-0.5">
                                        Reason
                                    </span>
                                    <span className="text-sm wrap-break-word">{adjustment.adjustmentReason}</span>
                                </div>
                            </div>
                        )}

                        {adjustment.referenceModel && adjustment.referenceId && (
                            <div className="flex items-center gap-2.5">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div>
                                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide block mb-0.5">
                                        Reference
                                    </span>
                                    <Badge variant="primary" appearance="outline" className="text-xs">
                                        {adjustment.referenceModel}
                                    </Badge>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2.5">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div>
                                <span className="text-[11px] text-muted-foreground uppercase tracking-wide block mb-0.5">
                                    Date
                                </span>
                                <span className="text-sm">{formatDateTime(adjustment.createdAt)}</span>
                            </div>
                        </div>

                        {adjustment.itemId && (
                            <div className="flex items-center gap-2.5">
                                <Package className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                <div className="min-w-0">
                                    <span className="text-[11px] text-muted-foreground uppercase tracking-wide block mb-0.5">
                                        Item ID
                                    </span>
                                    <span className="text-xs font-mono text-muted-foreground truncate block">
                                        {adjustment.itemId}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}