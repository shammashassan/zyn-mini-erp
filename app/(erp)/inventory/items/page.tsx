// app/inventory/items/page.tsx

'use client';

import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useDataTable } from '@/hooks/use-data-table';
import { DataTableToolbar } from '@/components/data-table/data-table-toolbar';
import { DataTableSkeleton } from '@/components/data-table/data-table-skeleton';
import { DataTable } from '@/components/data-table/data-table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Layers,
    Plus,
    Trash2,
    Package,
    Wrench,
    Combine,
    WarehouseIcon,
} from 'lucide-react';
import Link from 'next/link';
import { redirect, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { forbidden } from "next/navigation";
import { useItemPermissions } from '@/hooks/use-permissions';
import { getColumns } from './columns';
import { ItemForm, type ItemFormData } from './item-form';
import { ItemViewModal } from './ItemViewModal';
import type { IItem } from '@/models/Item';
import { StatsCards, type StatItem } from '@/components/shared/stats-cards';
import { Skeleton } from '@/components/ui/skeleton';

type TabValue = 'all' | 'products' | 'materials';

function ItemsPageSkeleton() {
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
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full" />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

export default function ItemsPage() {
    const pathname = usePathname();
    const [items, setItems] = useState<IItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<IItem | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [activeTab, setActiveTab] = useState<TabValue>('all');

    const {
        permissions: { canRead, canCreate, canUpdate, canDelete, canViewTrash },
        isPending,
        session,
    } = useItemPermissions();

    useEffect(() => { setIsMounted(true); }, []);

    const fetchItems = useCallback(async (background = false) => {
        if (!canRead) return;
        try {
            if (!background) setIsLoading(true);
            const res = await fetch('/api/items');
            if (!res.ok) throw new Error('Failed to fetch');
            setItems(await res.json());
        } catch {
            if (!background) toast.error('Could not load items.');
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

    const handleFormSubmit = async (data: ItemFormData, id?: string) => {
        const url = id ? `/api/items/${id}` : '/api/items';
        const method = id ? 'PUT' : 'POST';
        toast.promise(
            fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            }),
            {
                loading: id ? 'Updating item…' : 'Creating item…',
                success: () => {
                    fetchItems();
                    setIsFormOpen(false);
                    setSelectedItem(null);
                    return `Item ${id ? 'updated' : 'created'} successfully.`;
                },
                error: `Failed to ${id ? 'update' : 'create'} item.`,
            }
        );
    };

    const handleDelete = async (toDelete: IItem[]) => {
        if (!canDelete) { toast.error("You don't have permission to delete items"); return; }
        try {
            await Promise.all(
                toDelete.map((item) => fetch(`/api/items/${item._id}`, { method: 'DELETE' }))
            );
            toast.success(`${toDelete.length} ${toDelete.length === 1 ? 'item' : 'items'} moved to trash.`);
            fetchItems();
        } catch {
            toast.error('Failed to delete items.');
        }
    };

    const existingCategories = useMemo(
        () => Array.from(new Set(items.map((i) => i.category).filter(Boolean))),
        [items]
    );

    // Tab-filtered items
    const filteredItems = useMemo(() => {
        if (activeTab === 'products') return items.filter((i) => i.types.includes('product'));
        if (activeTab === 'materials') return items.filter((i) => i.types.includes('material'));
        return items;
    }, [items, activeTab]);

    const columns = useMemo(
        () =>
            getColumns(
                (item) => { setSelectedItem(item); setIsFormOpen(true); },
                (id) => {
                    const item = items.find((i) => String(i._id) === id);
                    if (item) handleDelete([item]);
                },
                { canUpdate, canDelete },
                (item) => { setSelectedItem(item); setIsViewModalOpen(true); }
            ),
        [items, canUpdate, canDelete]
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
            pagination: { pageSize: 10, pageIndex: 0 },
        },
        getRowId: (row) => row._id,
    });

    // Stats
    const stats = useMemo(() => ({
        total: items.length,
        products: items.filter((i) => i.types.includes('product')).length,
        materials: items.filter((i) => i.types.includes('material')).length,
        both: items.filter((i) => i.types.includes('product') && i.types.includes('material')).length,
    }), [items]);

    const statsData: StatItem[] = useMemo(() => [
        { name: 'Total Items', stat: stats.total.toString(), subtext: 'All registered items', changeType: 'neutral' },
        { name: 'Products', stat: stats.products.toString(), subtext: 'Sellable items', changeType: 'positive' },
        { name: 'Materials', stat: stats.materials.toString(), subtext: 'Purchasable / tracked', changeType: 'positive' },
        { name: 'Dual-type', stat: stats.both.toString(), subtext: 'Both product & material', changeType: 'neutral' },
    ], [stats]);

    if (!isMounted || isPending) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <Spinner className="size-10" />
            </div>
        );
    }
    if (!session) redirect(`/login?callbackURL=${encodeURIComponent(pathname)}`);
    if (!canRead) forbidden();

    return (
        <>
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">

                        {/* Header */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-2 px-4 lg:px-6 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <Layers className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">Items</h1>
                                    <p className="text-muted-foreground">
                                        Products, materials, and everything in between
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-2 flex-wrap">
                                {canViewTrash && (
                                    <Link href="./items/trash">
                                        <Button variant="outline" className="gap-2">
                                            <Trash2 className="h-4 w-4" />
                                            Trash
                                        </Button>
                                    </Link>
                                )}
                                <Link href="./stock">
                                    <Button variant="outline" className="gap-2">
                                        <WarehouseIcon className="h-4 w-4" />
                                        Stock Details
                                    </Button>
                                </Link>
                                {canCreate && (
                                    <Button
                                        onClick={() => { setSelectedItem(null); setIsFormOpen(true); }}
                                        className="gap-2"
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add Item
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="px-4 lg:px-6">
                            <div className={cn('transition-opacity duration-200', isLoading && !items.length ? 'opacity-50' : 'opacity-100')}>
                                {isLoading && !items.length ? (
                                    <ItemsPageSkeleton />
                                ) : items.length > 0 ? (
                                    <>
                                        {/* Stats */}
                                        <div className="mb-6">
                                            <StatsCards data={statsData} columns={4} />
                                        </div>

                                        {/* Tabs + Table */}
                                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
                                            <div className="flex justify-center items-center mb-4">
                                                <TabsList className="flex justify-center w-full max-w-2xl">
                                                    <TabsTrigger value="all" className="flex items-center gap-2 flex-1">
                                                        <Layers className="h-4 w-4" />
                                                        <span className="hidden sm:inline">All Items</span>
                                                        <span className="sm:hidden">All</span>
                                                    </TabsTrigger>
                                                    <TabsTrigger value="products" className="flex items-center gap-2 flex-1">
                                                        <Package className="h-4 w-4" />
                                                        <span>Products</span>
                                                    </TabsTrigger>
                                                    <TabsTrigger value="materials" className="flex items-center gap-2 flex-1">
                                                        <Wrench className="h-4 w-4" />
                                                        <span>Materials</span>
                                                    </TabsTrigger>
                                                </TabsList>
                                            </div>

                                            {(['all', 'products', 'materials'] as TabValue[]).map((tab) => (
                                                <TabsContent key={tab} value={tab} className="mt-0">
                                                    <Card>
                                                        <CardContent className="p-6">
                                                            <div className={cn('transition-opacity duration-200', isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100')}>
                                                                <DataTable table={table}>
                                                                    <DataTableToolbar table={table} />
                                                                </DataTable>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                </TabsContent>
                                            ))}
                                        </Tabs>
                                    </>
                                ) : (
                                    <Card>
                                        <CardContent className="flex flex-col items-center justify-center py-12">
                                            <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                                            <h3 className="text-lg font-semibold mb-2">No items yet</h3>
                                            <p className="text-muted-foreground text-center mb-4">
                                                Add your first item — it can be a product, a material, or both.
                                            </p>
                                            {canCreate && (
                                                <Button
                                                    onClick={() => { setSelectedItem(null); setIsFormOpen(true); }}
                                                    className="gap-2"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                    Add First Item
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ItemForm
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setSelectedItem(null); }}
                onSubmit={handleFormSubmit}
                defaultValues={selectedItem}
                existingCategories={existingCategories}
            />

            <ItemViewModal
                isOpen={isViewModalOpen}
                onClose={() => { setIsViewModalOpen(false); setSelectedItem(null); }}
                item={selectedItem}
            />
        </>
    );
}