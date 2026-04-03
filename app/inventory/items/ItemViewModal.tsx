// app/inventory/items/ItemViewModal.tsx

'use client';

import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowRight,
    Box,
    DollarSign,
    Lock,
    Package,
    Tag,
    Unlock,
    WarehouseIcon,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters/currency';
import { formatDateTime } from '@/utils/formatters/date';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import type { IItem } from '@/models/Item';

interface ItemViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: IItem | null;
}

export function ItemViewModal({ isOpen, onClose, item: initialItem }: ItemViewModalProps) {
    const [item, setItem] = useState<IItem | null>(initialItem);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !initialItem) { setItem(initialItem); return; }

        // Re-fetch to get populated BOM
        const hasBOM = initialItem.bom?.length > 0;
        const bomPopulated = hasBOM && (initialItem.bom[0] as any)?.itemId?.name;
        if (hasBOM && !bomPopulated) {
            setIsLoading(true);
            fetch(`/api/items/${initialItem._id}`)
                .then((r) => r.json())
                .then(setItem)
                .catch(() => toast.error('Error loading item details'))
                .finally(() => setIsLoading(false));
        } else {
            setItem(initialItem);
        }
    }, [isOpen, initialItem]);

    if (!isOpen) return null;
    const data = item || initialItem;
    if (!data) return null;

    const isProduct = data.types.includes('product');
    const isMaterial = data.types.includes('material');

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-4xl max-h-[95vh] overflow-y-auto sidebar-scroll p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <Package className="h-4 w-4 sm:h-5 sm:w-5" />
                        Item Details
                    </DialogTitle>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-12">
                        <Spinner className="size-10" />
                    </div>
                ) : (
                    <div className="space-y-4 sm:space-y-6">
                        {/* Summary card */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm sm:text-base flex items-center justify-between flex-wrap gap-2">
                                    <span className="flex items-center gap-2">
                                        <Box className="h-4 w-4" />
                                        {data.name}
                                    </span>
                                    <div className="flex gap-1.5">
                                        {data.types.map((t) => (
                                            <Badge
                                                key={t}
                                                variant={t === 'product' ? 'primary' : 'warning'}
                                                appearance="outline"
                                                className="capitalize text-xs"
                                            >
                                                {t}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div className="flex items-start gap-3">
                                        <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Category</div>
                                            <div className="font-medium text-sm">{data.category}</div>
                                        </div>
                                    </div>

                                    {isProduct && (
                                        <div className="flex items-start gap-3">
                                            <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                            <div>
                                                <div className="text-xs text-muted-foreground">Selling Price</div>
                                                <div className="font-medium text-sm">{formatCurrency(data.sellingPrice)}</div>
                                            </div>
                                        </div>
                                    )}

                                    {isMaterial && (
                                        <div className="flex items-start gap-3">
                                            <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                            <div>
                                                <div className="text-xs text-muted-foreground">Cost Price</div>
                                                <div className="font-medium text-sm">{formatCurrency(data.costPrice)}</div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-start gap-3">
                                        <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                        <div>
                                            <div className="text-xs text-muted-foreground">Tax</div>
                                            <div className="font-medium text-sm capitalize">
                                                {data.taxType === 'standard'
                                                    ? `Standard (${data.taxRate}%)`
                                                    : data.taxType}
                                            </div>
                                        </div>
                                    </div>

                                    {data.sku && (
                                        <div className="flex items-start gap-3">
                                            <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                            <div>
                                                <div className="text-xs text-muted-foreground">SKU</div>
                                                <div className="font-medium text-sm font-mono">{data.sku}</div>
                                            </div>
                                        </div>
                                    )}

                                    {data.barcode && (
                                        <div className="flex items-start gap-3">
                                            <Tag className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                            <div>
                                                <div className="text-xs text-muted-foreground">Barcode</div>
                                                <div className="font-medium text-sm font-mono">{data.barcode}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stock (material) */}
                        {isMaterial && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <WarehouseIcon className="h-4 w-4" />
                                        Stock
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <div>
                                            <div className="text-xs text-muted-foreground">Unit</div>
                                            <div className="font-medium text-sm flex items-center gap-1.5">
                                                {data.unit}
                                                {data.baseUnitLocked ? (
                                                    <Lock className="h-3 w-3 text-muted-foreground" />
                                                ) : (
                                                    <Unlock className="h-3 w-3 text-muted-foreground" />
                                                )}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Current Stock</div>
                                            <div className="font-semibold text-sm">
                                                {data.stock?.toFixed(2)} {data.unit}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Min Level</div>
                                            <div className="font-medium text-sm">
                                                {data.minStockLevel?.toFixed(2)} {data.unit}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-muted-foreground">Status</div>
                                            <Badge
                                                variant={
                                                    data.stock <= 0
                                                        ? 'destructive'
                                                        : data.stock <= data.minStockLevel
                                                            ? 'warning'
                                                            : 'success'
                                                }
                                                appearance="outline"
                                                className="text-xs mt-0.5"
                                            >
                                                {data.stock <= 0
                                                    ? 'Out of Stock'
                                                    : data.stock <= data.minStockLevel
                                                        ? 'Low Stock'
                                                        : 'In Stock'}
                                            </Badge>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* BOM (product) */}
                        {isProduct && data.bom && data.bom.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Bill of Materials (BOM)</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left p-2 text-xs font-medium">#</th>
                                                    <th className="text-left p-2 text-xs font-medium">Item</th>
                                                    <th className="text-right p-2 text-xs font-medium">Qty</th>
                                                    <th className="text-left p-2 text-xs font-medium">Unit</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.bom.map((b: any, i: number) => (
                                                    <tr key={i} className="border-b hover:bg-muted/50">
                                                        <td className="p-2 text-xs text-muted-foreground">{i + 1}</td>
                                                        <td className="p-2 font-medium text-sm">
                                                            {b.itemId?.name || b.itemId || '—'}
                                                        </td>
                                                        <td className="p-2 text-right font-medium text-sm">
                                                            {b.quantity?.toFixed(2)}
                                                        </td>
                                                        <td className="p-2 text-sm text-muted-foreground">{b.unit}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Notes */}
                        {data.notes && (
                            <Card className="bg-muted/30">
                                <CardContent className="p-4 text-sm">{data.notes}</CardContent>
                            </Card>
                        )}

                        {/* System info */}
                        <Card className="bg-muted/50">
                            <CardContent className="p-3 sm:p-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Created:</span>
                                        <span className="ml-2 font-medium">{formatDateTime(data.createdAt)}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Updated:</span>
                                        <span className="ml-2 font-medium">{formatDateTime(data.updatedAt)}</span>
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