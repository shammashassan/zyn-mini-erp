// app/inventory/items/columns.tsx

'use client';

import { ColumnDef } from '@tanstack/react-table';
import {
    ArrowUpDown,
    Eye,
    MoreHorizontal,
    Pencil,
    Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import type { IItem } from '@/models/Item';
import { formatCurrency } from '@/utils/formatters/currency';
import { useState } from 'react';

interface ItemPermissions {
    canUpdate: boolean;
    canDelete: boolean;
}

interface RowActionsProps {
    item: IItem;
    onEdit: (item: IItem) => void;
    onDelete: (id: string) => void;
    onView: (item: IItem) => void;
    permissions: ItemPermissions;
}

const RowActions = ({ item, onEdit, onDelete, onView, permissions }: RowActionsProps) => {
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    return (
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => onView(item)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                    </DropdownMenuItem>
                    {permissions.canUpdate && (
                        <DropdownMenuItem onClick={() => onEdit(item)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                    )}
                    {permissions.canDelete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive"
                                onSelect={(e) => {
                                    e.preventDefault();
                                    setIsDeleteOpen(true);
                                }}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Move to trash?</AlertDialogTitle>
                    <AlertDialogDescription>
                        &ldquo;{item.name}&rdquo; will be moved to the trash. You can restore it later.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        onClick={() => {
                            onDelete(String(item._id));
                            setIsDeleteOpen(false);
                        }}
                    >
                        Move to Trash
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

export const getColumns = (
    onEdit: (item: IItem) => void,
    onDelete: (id: string) => void,
    permissions: ItemPermissions,
    onView: (item: IItem) => void
): ColumnDef<IItem>[] => [
        {
            accessorKey: 'name',
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
                >
                    Name
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            meta: { label: 'Name', placeholder: 'Search item…', variant: 'text' },
            enableColumnFilter: true,
        },
        {
            accessorKey: 'types',
            header: 'Type',
            cell: ({ row }) => (
                <div className="flex gap-1 flex-wrap">
                    {row.original.types.map((t) => (
                        <Badge
                            key={t}
                            variant={t === 'product' ? 'primary' : 'warning'}
                            appearance="outline"
                            className="text-xs capitalize"
                        >
                            {t}
                        </Badge>
                    ))}
                </div>
            ),
            meta: {
                label: 'Type',
                variant: 'select',
                options: [
                    { label: 'Product', value: 'product' },
                    { label: 'Material', value: 'material' },
                ],
            },
            enableColumnFilter: true,
        },
        {
            accessorKey: 'category',
            header: 'Category',
            cell: ({ row }) => (
                <Badge variant="secondary" appearance="outline">
                    {row.original.category}
                </Badge>
            ),
            meta: { label: 'Category', variant: 'select', options: [] },
            enableColumnFilter: true,
        },
        {
            id: 'pricing',
            header: 'Pricing',
            cell: ({ row }) => {
                const item = row.original;
                const isProduct = item.types.includes('product');
                const isMaterial = item.types.includes('material');
                return (
                    <div className="space-y-0.5 text-sm">
                        {isProduct && (
                            <div className="text-right tabular-nums">
                                <span className="text-xs text-muted-foreground mr-1">Sell</span>
                                {formatCurrency(item.sellingPrice)}
                            </div>
                        )}
                        {isMaterial && (
                            <div className="text-right tabular-nums">
                                <span className="text-xs text-muted-foreground mr-1">Cost</span>
                                {formatCurrency(item.costPrice)}
                            </div>
                        )}
                    </div>
                );
            },
        },
        // {
        //     id: 'tax',
        //     header: 'Tax',
        //     cell: ({ row }) => {
        //         const item = row.original;
        //         return (
        //             <div className="text-sm text-muted-foreground">
        //                 {item.taxType === 'standard'
        //                     ? `${item.taxRate}%`
        //                     : <span className="capitalize">{item.taxType}</span>}
        //             </div>
        //         );
        //     },
        // },
        {
            id: 'actions',
            cell: ({ row }) => (
                <RowActions
                    item={row.original}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onView={onView}
                    permissions={permissions}
                />
            ),
        },
    ];