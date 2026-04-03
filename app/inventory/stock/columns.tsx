// app/inventory/stock/columns.tsx

'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters/currency';
import type { IItem } from '@/models/Item';

interface StockColumnOptions {
    onAdjust: (item: IItem) => void;
    canAdjust: boolean;
}

export const getStockColumns = (
    options: StockColumnOptions
): ColumnDef<IItem>[] => {
    const { onAdjust, canAdjust } = options;

    return [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Item
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            meta: { label: 'Item', placeholder: 'Search item…', variant: 'text' },
            enableColumnFilter: true,
        },
        {
            accessorKey: 'category',
            header: 'Category',
            cell: ({ row }) => (
                <Badge variant="secondary" appearance="outline" className="text-xs">
                    {row.original.category}
                </Badge>
            ),
            meta: { label: 'Category', variant: 'select', options: [] },
            enableColumnFilter: true,
        },
        {
            accessorKey: 'unit',
            header: 'Unit',
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">{row.original.unit}</span>
            ),
        },
        {
            accessorKey: 'costPrice',
            header: () => <div className="text-right">Unit Cost</div>,
            cell: ({ row }) => (
                <div className="text-right tabular-nums text-sm">
                    {formatCurrency(row.original.costPrice)}
                </div>
            ),
        },
        {
            accessorKey: 'minStockLevel',
            header: () => <div className="text-right">Min Level</div>,
            cell: ({ row }) => (
                <div className="text-right tabular-nums text-sm text-muted-foreground">
                    {row.original.minStockLevel?.toFixed(2)}{' '}
                    <span className="text-xs">{row.original.unit}</span>
                </div>
            ),
        },
        {
            accessorKey: 'stock',
            header: ({ column }) => (
                <div className="text-right">
                    <Button
                        variant="ghost"
                        className="px-2"
                        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                    >
                        Stock
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                </div>
            ),
            cell: ({ row }) => {
                const item = row.original;
                const outOfStock = item.stock <= 0;
                const lowStock = item.stock <= item.minStockLevel && item.stock > 0;
                return (
                    <div
                        className={cn(
                            'text-right font-semibold tabular-nums text-sm',
                            outOfStock && 'text-destructive',
                            lowStock && 'text-amber-600 dark:text-amber-400'
                        )}
                    >
                        {item.stock?.toFixed(2)}{' '}
                        <span className="font-normal text-xs">{item.unit}</span>
                    </div>
                );
            },
        },
        {
            id: 'status',
            header: 'Status',
            cell: ({ row }) => {
                const item = row.original;
                const outOfStock = item.stock <= 0;
                const lowStock = item.stock <= item.minStockLevel && item.stock > 0;
                return (
                    <Badge
                        variant={outOfStock ? 'destructive' : lowStock ? 'warning' : 'success'}
                        appearance="outline"
                        className="text-xs"
                    >
                        {outOfStock ? 'Out of Stock' : lowStock ? 'Low Stock' : 'In Stock'}
                    </Badge>
                );
            },
        },
        {
            id: 'actions',
            cell: ({ row }) => {
                if (!canAdjust) return null;
                return (
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 h-7 text-xs"
                        onClick={() => onAdjust(row.original)}
                    >
                        <ArrowRightLeft className="h-3 w-3" />
                        Adjust
                    </Button>
                );
            },
        },
    ];
};