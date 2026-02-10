// app/inventory/materials/MaterialViewModal.tsx

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
    Package,
    DollarSign,
    Lock,
    Unlock,
    Calendar,
    Tag,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime } from "@/utils/formatters/date";

interface MaterialViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    material: any | null;
}

export function MaterialViewModal({
    isOpen,
    onClose,
    material,
}: MaterialViewModalProps) {
    if (!isOpen || !material) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-3xl max-h-[95vh] overflow-y-auto sidebar-scroll p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Box className="h-4 w-4 sm:h-5 sm:w-5" />
                        Material Details
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 sm:space-y-6">
                    {/* Header Information */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm sm:text-base flex items-center justify-between flex-wrap gap-2">
                                <span className="flex items-center gap-2">
                                    <Box className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="text-xs sm:text-sm font-semibold">{material.name}</span>
                                </span>
                                {material.baseUnitLocked && (
                                    <Badge variant="neutral" appearance="outline" className="text-xs gap-1">
                                        <Lock className="h-3 w-3" />
                                        Unit Locked
                                    </Badge>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 sm:space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                <div className="flex items-start gap-3">
                                    <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-xs sm:text-sm text-muted-foreground">Type</div>
                                        <div className="font-medium text-xs sm:text-sm break-words">
                                            {material.type}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                                    <div className="min-w-0">
                                        <div className="text-xs sm:text-sm text-muted-foreground">Unit</div>
                                        <div className="font-medium text-xs sm:text-sm break-words flex items-center gap-2">
                                            {material.unit}
                                            {material.baseUnitLocked ? (
                                                <Lock className="h-3 w-3 text-muted-foreground" />
                                            ) : (
                                                <Unlock className="h-3 w-3 text-muted-foreground" />
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                                    <div>
                                        <div className="text-xs sm:text-sm text-muted-foreground">Current Stock</div>
                                        <div className="font-medium text-xs sm:text-sm">
                                            {material.stock?.toFixed(2)} {material.unit}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3">
                                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                                    <div>
                                        <div className="text-xs sm:text-sm text-muted-foreground">Unit Cost</div>
                                        <div className="font-medium text-xs sm:text-sm">
                                            {formatCurrency(material.unitCost)}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {material.baseUnitLocked && (
                                <div className="pt-3 border-t">
                                    <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
                                        <Lock className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="text-xs sm:text-sm text-muted-foreground">
                                            <p className="font-medium">Base unit is locked</p>
                                            <p>The unit cannot be changed because stock movements have been recorded for this material.</p>
                                        </div>
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
                                        {formatDateTime(material.createdAt)}
                                    </span>
                                </div>
                                <div className="break-words">
                                    <span className="text-muted-foreground">Last Updated:</span>
                                    <span className="ml-2 font-medium">
                                        {formatDateTime(material.updatedAt)}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
