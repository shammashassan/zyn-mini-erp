// app/inventory/stock-adjustment/StockAdjustmentViewModal.tsx

"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Box,
    TrendingUp,
    TrendingDown,
    DollarSign,
    FileText,
    MessageSquare,
    ArrowRight,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime } from "@/utils/formatters/date";

interface StockAdjustmentViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    adjustment: any | null;
}

const getAdjustmentTypeVariant = (type: string) => {
    return type === 'increment' ? 'success' : 'destructive';
};

const getAdjustmentTypeIcon = (type: string) => {
    return type === 'increment' ? TrendingUp : TrendingDown;
};

export function StockAdjustmentViewModal({
    isOpen,
    onClose,
    adjustment,
}: StockAdjustmentViewModalProps) {
    if (!isOpen || !adjustment) return null;

    const AdjustmentIcon = getAdjustmentTypeIcon(adjustment.adjustmentType);
    const hasUnitCostChange = adjustment.oldUnitCost !== undefined && adjustment.newUnitCost !== undefined;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-3xl max-h-[95vh] overflow-y-auto sidebar-scroll p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Box className="h-4 w-4 sm:h-5 sm:w-5" />
                        Stock Adjustment Details
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 sm:space-y-6">
                    {/* Header Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm sm:text-base flex items-center justify-between flex-wrap gap-2">
                                <span className="flex items-center gap-2">
                                    <Box className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="text-xs sm:text-sm font-semibold">{adjustment.materialName}</span>
                                </span>
                                <Badge
                                    variant={getAdjustmentTypeVariant(adjustment.adjustmentType) as any}
                                    appearance="outline"
                                    className="capitalize text-xs gap-1"
                                >
                                    <AdjustmentIcon className="h-3 w-3" />
                                    {adjustment.adjustmentType}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 sm:space-y-4">
                            {/* Adjustment Value */}
                            <div className="p-3 sm:p-4 rounded-lg bg-muted/50 border">
                                <div className="text-xs sm:text-sm text-muted-foreground mb-1">Adjustment Value</div>
                                <div className="text-xl sm:text-2xl font-bold">
                                    {adjustment.adjustmentType === 'increment' ? '+' : '-'}{adjustment.value?.toFixed(2)}
                                </div>
                            </div>

                            {/* Stock Change */}
                            <Card className="border-2">
                                <CardContent className="p-3 sm:p-4">
                                    <div className="text-xs sm:text-sm text-muted-foreground mb-2">Stock Level</div>
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="flex-1">
                                            <div className="text-xs text-muted-foreground mb-1">Before</div>
                                            <div className="text-base sm:text-lg font-semibold">
                                                {adjustment.oldStock?.toFixed(2)}
                                            </div>
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <div className="flex-1 text-right">
                                            <div className="text-xs text-muted-foreground mb-1">After</div>
                                            <div className={`text-base sm:text-lg font-semibold ${adjustment.adjustmentType === 'increment' ? 'text-green-600' : 'text-orange-600'
                                                }`}>
                                                {adjustment.newStock?.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Unit Cost Change (if applicable) */}
                            {hasUnitCostChange && (
                                <Card className="border-2">
                                    <CardContent className="p-3 sm:p-4">
                                        <div className="text-xs sm:text-sm text-muted-foreground mb-2">Unit Cost</div>
                                        <div className="flex items-center gap-2 sm:gap-3">
                                            <div className="flex-1">
                                                <div className="text-xs text-muted-foreground mb-1">Before</div>
                                                <div className="text-base sm:text-lg font-semibold">
                                                    {formatCurrency(adjustment.oldUnitCost)}
                                                </div>
                                            </div>
                                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <div className="flex-1 text-right">
                                                <div className="text-xs text-muted-foreground mb-1">After</div>
                                                <div className="text-base sm:text-lg font-semibold text-blue-600">
                                                    {formatCurrency(adjustment.newUnitCost)}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Adjustment Reason */}
                            {adjustment.adjustmentReason && (
                                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-xs sm:text-sm text-muted-foreground mb-1">Reason</div>
                                        <div className="text-xs sm:text-sm break-words">
                                            {adjustment.adjustmentReason}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Reference Document */}
                            {adjustment.referenceModel && adjustment.referenceId && (
                                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-xs sm:text-sm text-muted-foreground mb-1">Reference Document</div>
                                        <Badge variant="primary" appearance="outline" className="text-xs">
                                            {adjustment.referenceModel}
                                        </Badge>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* System Information */}
                    <Card className="bg-muted/50">
                        <CardContent className="p-3 sm:p-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                                <div className="break-words">
                                    <span className="text-muted-foreground">Created:</span>
                                    <span className="ml-2 font-medium">
                                        {formatDateTime(adjustment.createdAt)}
                                    </span>
                                </div>
                                {adjustment.materialId && (
                                    <div className="break-words">
                                        <span className="text-muted-foreground">Material ID:</span>
                                        <span className="ml-2 font-mono text-xs">
                                            {adjustment.materialId}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
