// app/inventory/stock/page.tsx
// Route name options:
//   - Recommended: keep this as "Stock", rename stock-adjustment → "Adjustments"
//   - Alternative: rename this to "Inventory" if keeping "Stock Adjustment" name

'use client';

import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
    WarehouseIcon,
    ArrowRightLeft,
    AlertTriangle,
    XCircle,
    CheckCircle2,
    ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/data-table/data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton';
import { useDataTable } from '@/hooks/use-data-table';
import { StatsCards, type StatItem } from '@/components/shared/stats-cards';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import { AccessDenied } from '@/components/shared/access-denied';
import { cn } from '@/lib/utils';
import { redirect, usePathname } from 'next/navigation';
import Link from 'next/link';
import { AdjustmentForm } from '../stock-adjustment/adjustment-form';
import { useStockAdjustmentPermissions } from '@/hooks/use-permissions';
import { getStockColumns } from './columns';
import type { IItem } from '@/models/Item';

type TabValue = 'all' | 'low' | 'out';

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function StockPageSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in-50">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={i} className="p-6 py-3">
                        <CardContent className="p-0 space-y-3">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-5 w-14 rounded-full" />
                            </div>
                            <Skeleton className="h-9 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div className="flex justify-center">
                <Skeleton className="h-10 w-full max-w-2xl rounded-md" />
            </div>
            <Card>
                <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function StockPage() {
    const pathname = usePathname();
    const [items, setItems] = useState<IItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMounted, setIsMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<TabValue>('all');
    const [isAdjustFormOpen, setIsAdjustFormOpen] = useState(false);
    const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<IItem | null>(null);

    const {
        permissions: { canRead, canCreate: canAdjust },
        isPending,
        session,
    } = useStockAdjustmentPermissions();

    useEffect(() => { setIsMounted(true); }, []);

    const fetchItems = useCallback(async (background = false) => {
        if (!canRead) return;
        try {
            if (!background) setIsLoading(true);
            const res = await fetch('/api/items?types=material');
            if (!res.ok) throw new Error('Failed to fetch');
            setItems(await res.json());
        } catch {
            if (!background) toast.error('Could not load stock data.');
        } finally {
            if (!background) setIsLoading(false);
        }
    }, [canRead]);

    useEffect(() => {
        if (isMounted && canRead) fetchItems();
    }, [isMounted, canRead, fetchItems]);

    useEffect(() => {
        const onFocus = () => { if (isMounted && canRead) fetchItems(true); };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [fetchItems, isMounted, canRead]);

    const handleAdjust = (item: IItem) => {
        setSelectedItemForAdjust(item);
        setIsAdjustFormOpen(true);
    };

    const handleAdjustSubmit = async (data: any) => {
        try {
            const response = await fetch('/api/stock-adjustments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, value: Number(data.value) }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to apply adjustment');
            }

            toast.success('Adjustment applied successfully.');
            setIsAdjustFormOpen(false);
            setSelectedItemForAdjust(null);
            fetchItems();
        } catch (error) {
            toast.error(`Failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
        }
    };

    // Stats
    const stats = useMemo(() => ({
        total: items.length,
        inStock: items.filter((i) => i.stock > i.minStockLevel).length,
        lowStock: items.filter((i) => i.stock <= i.minStockLevel && i.stock > 0).length,
        outOfStock: items.filter((i) => i.stock <= 0).length,
    }), [items]);

    const statsData: StatItem[] = useMemo(() => [
        {
            name: 'Total Materials',
            stat: stats.total.toString(),
            subtext: 'Tracked items',
            changeType: 'neutral',
        },
        {
            name: 'In Stock',
            stat: stats.inStock.toString(),
            subtext: 'Above minimum level',
            changeType: 'positive',
        },
        {
            name: 'Low Stock',
            stat: stats.lowStock.toString(),
            subtext: 'At or below minimum',
            changeType: stats.lowStock > 0 ? 'negative' : 'neutral',
        },
        {
            name: 'Out of Stock',
            stat: stats.outOfStock.toString(),
            subtext: 'Zero quantity',
            changeType: stats.outOfStock > 0 ? 'negative' : 'neutral',
        },
    ], [stats]);

    // Tab-filtered items
    const filteredItems = useMemo(() => {
        if (activeTab === 'low') return items.filter((i) => i.stock <= i.minStockLevel && i.stock > 0);
        if (activeTab === 'out') return items.filter((i) => i.stock <= 0);
        return items;
    }, [items, activeTab]);

    const columns = useMemo(
        () => getStockColumns({ onAdjust: handleAdjust, canAdjust }),
        [canAdjust]
    );

    const columnsWithOptions = useMemo(() => {
        const categoryOptions = Array.from(new Set(filteredItems.map((i) => i.category))).map((c) => ({
            label: c,
            value: c,
            count: filteredItems.filter((i) => i.category === c).length,
        }));
        return columns.map((col: any) =>
            col.accessorKey === 'category'
                ? { ...col, meta: { ...col.meta, options: categoryOptions } }
                : col
        );
    }, [columns, filteredItems]);

    const { table } = useDataTable({
        data: filteredItems,
        columns: columnsWithOptions,
        initialState: {
            sorting: [{ id: 'name', desc: false }],
            pagination: { pageSize: 15, pageIndex: 0 },
        },
        getRowId: (row) => row._id,
    });

    if (!isMounted || isPending) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Spinner className="size-10" />
            </div>
        );
    }
    if (!session) redirect(`/login?callbackURL=${encodeURIComponent(pathname)}`);
    if (!canRead) return <AccessDenied />;

    return (
        <>
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                        {/* Header */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-2 px-4 lg:px-6 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <WarehouseIcon className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    {/* ↓ Change h1 text to match whatever name you pick */}
                                    <h1 className="text-3xl font-bold tracking-tight">Stock</h1>
                                    <p className="text-muted-foreground">
                                        Real-time stock levels across all tracked materials
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                <Link href="./items">
                                    <Button variant="outline" className="gap-2">
                                        <ArrowLeft className="h-4 w-4" />
                                        Back to Items
                                    </Button>
                                </Link>
                                {/* ↓ Update href to ../adjustments if you rename that page */}
                                <Link href="./stock-adjustment">
                                    <Button variant="outline" className="gap-2">
                                        <ArrowRightLeft className="h-4 w-4" />
                                        Adjustments
                                    </Button>
                                </Link>
                                {canAdjust && (
                                    <Button
                                        onClick={() => {
                                            setSelectedItemForAdjust(null);
                                            setIsAdjustFormOpen(true);
                                        }}
                                        className="gap-2"
                                    >
                                        <ArrowRightLeft className="h-4 w-4" />
                                        Adjust Stock
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="px-4 lg:px-6">
                            <div
                                className={cn(
                                    'transition-opacity duration-200',
                                    isLoading && !items.length ? 'opacity-50' : 'opacity-100'
                                )}
                            >
                                {isLoading && !items.length ? (
                                    <StockPageSkeleton />
                                ) : items.length > 0 ? (
                                    <>
                                        {/* Stats */}
                                        <div className="mb-6">
                                            <StatsCards data={statsData} columns={4} />
                                        </div>

                                        {/* Tabs */}
                                        <Tabs
                                            value={activeTab}
                                            onValueChange={(v) => setActiveTab(v as TabValue)}
                                        >
                                            <div className="flex justify-center items-center mb-4">
                                                <TabsList className="flex justify-center w-full max-w-2xl">
                                                    <TabsTrigger value="all" className="flex items-center gap-2 flex-1">
                                                        <WarehouseIcon className="h-4 w-4" />
                                                        <span>All</span>
                                                        <span className="text-xs opacity-60">({stats.total})</span>
                                                    </TabsTrigger>
                                                    <TabsTrigger value="low" className="flex items-center gap-2 flex-1">
                                                        <AlertTriangle className="h-4 w-4" />
                                                        <span>Low Stock</span>
                                                        {stats.lowStock > 0 && (
                                                            <span className="text-xs text-amber-500">
                                                                ({stats.lowStock})
                                                            </span>
                                                        )}
                                                    </TabsTrigger>
                                                    <TabsTrigger value="out" className="flex items-center gap-2 flex-1">
                                                        <XCircle className="h-4 w-4" />
                                                        <span>Out of Stock</span>
                                                        {stats.outOfStock > 0 && (
                                                            <span className="text-xs text-destructive">
                                                                ({stats.outOfStock})
                                                            </span>
                                                        )}
                                                    </TabsTrigger>
                                                </TabsList>
                                            </div>

                                            {(['all', 'low', 'out'] as TabValue[]).map((tab) => (
                                                <TabsContent key={tab} value={tab} className="mt-0">
                                                    <Card>
                                                        <CardContent className="p-6">
                                                            <div
                                                                className={cn(
                                                                    'transition-opacity duration-200',
                                                                    isLoading
                                                                        ? 'opacity-50 pointer-events-none'
                                                                        : 'opacity-100'
                                                                )}
                                                            >
                                                                {filteredItems.length === 0 ? (
                                                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                                                        <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-3" />
                                                                        <p className="text-lg font-semibold">
                                                                            {tab === 'low'
                                                                                ? 'No low stock items'
                                                                                : 'No out-of-stock items'}
                                                                        </p>
                                                                        <p className="text-sm text-muted-foreground mt-1">
                                                                            {tab === 'low'
                                                                                ? 'All items are above their minimum stock levels.'
                                                                                : 'All items have stock available.'}
                                                                        </p>
                                                                    </div>
                                                                ) : (
                                                                    <DataTable table={table}>
                                                                        <DataTableToolbar table={table} />
                                                                    </DataTable>
                                                                )}
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </TabsContent>
                                            ))}
                                        </Tabs>
                                    </>
                                ) : (
                                    <Card>
                                        <CardContent className="flex flex-col items-center justify-center py-16">
                                            <WarehouseIcon className="h-16 w-16 text-muted-foreground mb-4" />
                                            <h3 className="text-lg font-semibold mb-2">
                                                No materials tracked
                                            </h3>
                                            <p className="text-muted-foreground text-center mb-4 max-w-md">
                                                Create items with the &ldquo;Material&rdquo; type enabled to
                                                start tracking stock here.
                                            </p>
                                            <Link href="/inventory/items">
                                                <Button className="gap-2">
                                                    <ArrowLeft className="h-4 w-4" />
                                                    Go to Items
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AdjustmentForm
                isOpen={isAdjustFormOpen}
                onClose={() => {
                    setIsAdjustFormOpen(false);
                    setSelectedItemForAdjust(null);
                }}
                onSubmit={handleAdjustSubmit}
                items={items}
                defaultItemId={selectedItemForAdjust?._id}
            />
        </>
    );
}