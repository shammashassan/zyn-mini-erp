// app/inventory/products/ProductViewModal.tsx

"use client";

import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Package,
    DollarSign,
    Tag,
    Box,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime } from "@/utils/formatters/date";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

interface ProductViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any | null;
}

export function ProductViewModal({
    isOpen,
    onClose,
    product: initialProduct,
}: ProductViewModalProps) {
    const [product, setProduct] = useState<any>(initialProduct);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !initialProduct) {
            setProduct(initialProduct);
            return;
        }

        // Check if we need to fetch full details (BOM populated)
        const isPartialData = initialProduct._id && (!initialProduct.bom || initialProduct.bom.length === 0 || !initialProduct.bom[0]?.materialId?.name);

        if (isPartialData) {
            const fetchFullDetails = async () => {
                setIsLoading(true);
                try {
                    const res = await fetch(`/api/products/${initialProduct._id}`);
                    if (res.ok) {
                        const fullData = await res.json();
                        setProduct(fullData);
                    } else {
                        toast.error("Failed to load full product details");
                    }
                } catch (error) {
                    console.error("Error fetching product details:", error);
                    toast.error("Error loading product details");
                } finally {
                    setIsLoading(false);
                }
            };

            fetchFullDetails();
        } else {
            setProduct(initialProduct);
        }
    }, [isOpen, initialProduct]);

    if (!isOpen) return null;

    const currentData = product || initialProduct || {};

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-4xl max-h-[95vh] overflow-y-auto sidebar-scroll p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                        Product Details
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Spinner className="size-10" />
                    </div>
                ) : (
                    <div className="space-y-4 sm:space-y-6">
                        {/* Header Information */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                                    <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                                    <span className="text-xs sm:text-sm font-semibold">{currentData.name}</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 sm:space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    <div className="flex items-start gap-3">
                                        <Tag className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                            <div className="text-xs sm:text-sm text-muted-foreground">Type / Category</div>
                                            <div className="font-medium text-xs sm:text-sm break-words">
                                                {currentData.type}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                                        <div>
                                            <div className="text-xs sm:text-sm text-muted-foreground">Price</div>
                                            <div className="font-medium text-xs sm:text-sm">
                                                {formatCurrency(currentData.price)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <Box className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                                        <div>
                                            <div className="text-xs sm:text-sm text-muted-foreground">BOM Items</div>
                                            <div className="font-medium text-xs sm:text-sm">
                                                {currentData.bom?.length || 0} material(s)
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* BOM (Bill of Materials) */}
                        {currentData.bom && currentData.bom.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm sm:text-base">Bill of Materials (BOM)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {/* Desktop Table */}
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left p-3 font-medium text-sm">#</th>
                                                    <th className="text-left p-3 font-medium text-sm">Material</th>
                                                    <th className="text-right p-3 font-medium text-sm">Quantity</th>
                                                    <th className="text-left p-3 font-medium text-sm">Unit</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {currentData.bom.map((item: any, index: number) => (
                                                    <tr key={index} className="border-b hover:bg-muted/50">
                                                        <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                                                        <td className="p-3">
                                                            <div className="font-medium">
                                                                {item.materialId?.name || item.materialId || 'Unknown Material'}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right font-medium">
                                                            {item.quantity?.toFixed(2)}
                                                        </td>
                                                        <td className="p-3 text-muted-foreground">
                                                            {item.unit}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Mobile Card View */}
                                    <div className="md:hidden space-y-3">
                                        {currentData.bom.map((item: any, index: number) => (
                                            <Card key={index} className="border-2">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-sm">Material #{index + 1}</CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3">
                                                    <div className="space-y-1.5">
                                                        <div className="text-xs text-muted-foreground">Material</div>
                                                        <div className="font-medium text-sm">
                                                            {item.materialId?.name || item.materialId || 'Unknown Material'}
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1.5">
                                                            <div className="text-xs text-muted-foreground">Quantity</div>
                                                            <div className="font-medium text-sm">{item.quantity?.toFixed(2)}</div>
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <div className="text-xs text-muted-foreground">Unit</div>
                                                            <div className="font-medium text-sm">{item.unit}</div>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Empty BOM State */}
                        {(!currentData.bom || currentData.bom.length === 0) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm sm:text-base">Bill of Materials (BOM)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-center py-8 text-sm text-muted-foreground">
                                        No materials defined in BOM
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* System Information */}
                        <Card className="bg-muted/50">
                            <CardContent className="p-3 sm:p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                                    <div className="break-words">
                                        <span className="text-muted-foreground">Created:</span>
                                        <span className="ml-2 font-medium">
                                            {formatDateTime(currentData.createdAt)}
                                        </span>
                                    </div>
                                    <div className="break-words">
                                        <span className="text-muted-foreground">Last Updated:</span>
                                        <span className="ml-2 font-medium">
                                            {formatDateTime(currentData.updatedAt)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
