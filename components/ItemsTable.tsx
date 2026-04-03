// components/ItemsTable.tsx  — Reusable line-items table with inline item creation
// Replaces the old ItemsTable that had separate product/material modes.

'use client';

import React from 'react';
import {
    Control,
    Controller,
    UseFormRegister,
    UseFormSetValue,
    UseFormWatch,
} from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown, Plus, PlusCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatCurrency } from '@/utils/formatters/currency';
import { ItemForm } from '@/app/inventory/items/item-form';
import type { IItem } from '@/models/Item';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines which price column label and value to use.
 * "sale"     → sellingPrice  (invoices, quotations)
 * "purchase" → costPrice     (purchases, debit notes)
 */
export type PriceContext = 'sale' | 'purchase';

export interface LineItem {
    itemId?: string;
    description: string;   // displayed item name / free-text
    quantity: number;
    price: number;         // sellingPrice or costPrice depending on context
    total: number;
    taxRate?: number;      // snapshot of item tax rate at time of selection
}

interface ItemData {
    _id: string;
    name: string;
    sellingPrice: number;
    costPrice: number;
    unit?: string;
    category?: string;
    types: string[];
    taxRate?: number;      // from unified Item model
}

interface ItemsTableProps {
    /** Items returned from the API (already filtered by allowedTypes if needed) */
    items: ItemData[];
    /** Optionally filter which items are shown in the selector */
    allowedTypes?: ('product' | 'material')[];
    /** Which price field to use and show */
    priceContext?: PriceContext;
    /** Custom label for the price column (defaults to "Price") */
    priceLabel?: string;

    /** react-hook-form wiring */
    fields: Record<'id', string>[];
    control: Control<any>;
    register: UseFormRegister<any>;
    watch: UseFormWatch<any>;
    setValue: UseFormSetValue<any>;
    fieldName?: string;

    onAppendItem: () => void;
    onRemoveItem: (index: number) => void;
    onRefreshItems?: () => Promise<void>;

    disabled?: boolean;
    isDesktop?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function ItemsTable({
    items,
    allowedTypes,
    priceContext = 'sale',
    priceLabel,
    fields,
    control,
    register,
    watch,
    setValue,
    fieldName = 'items',
    onAppendItem,
    onRemoveItem,
    onRefreshItems,
    disabled = false,
    isDesktop = true,
}: ItemsTableProps) {
    const [itemPopovers, setItemPopovers] = React.useState<Record<number, boolean>>({});
    const [itemSearchQueries, setItemSearchQueries] = React.useState<Record<number, string>>({});
    const [isItemFormOpen, setIsItemFormOpen] = React.useState(false);
    const [pendingItemName, setPendingItemName] = React.useState('');
    const [pendingItemIndex, setPendingItemIndex] = React.useState<number | null>(null);

    const watchedItems = watch(fieldName);

    const effectivePriceLabel = priceLabel ?? (priceContext === 'sale' ? 'Rate' : 'Unit Cost');

    // Filter items by allowedTypes if specified
    const filteredItems = React.useMemo(() => {
        if (!allowedTypes || allowedTypes.length === 0) return items;
        return items.filter((item) =>
            item.types.some((t) => allowedTypes.includes(t as 'product' | 'material'))
        );
    }, [items, allowedTypes]);

    const getPriceFromItem = (item: ItemData) =>
        priceContext === 'sale' ? item.sellingPrice : item.costPrice;

    const handleItemSelect = (index: number, itemId: string) => {
        const item = filteredItems.find((i) => i._id === itemId);
        if (!item) return;

        const price = getPriceFromItem(item);
        const taxRate = item.taxRate ?? 0;
        const qty = parseFloat(String(watchedItems[index]?.quantity)) || 1;
        const total = qty * price;
        const taxAmount = total * (taxRate / 100);

        setValue(`${fieldName}.${index}.itemId`, itemId, { shouldDirty: true });
        setValue(`${fieldName}.${index}.description`, item.name, { shouldDirty: true });
        setValue(`${fieldName}.${index}.price`, price, { shouldDirty: true });
        setValue(`${fieldName}.${index}.taxRate`, taxRate, { shouldDirty: true });
        setValue(`${fieldName}.${index}.taxAmount`, taxAmount, { shouldDirty: true });
        setValue(`${fieldName}.${index}.total`, total, { shouldDirty: true });

        setItemPopovers((prev) => ({ ...prev, [index]: false }));
        setItemSearchQueries((prev) => ({ ...prev, [index]: '' }));
    };

    const handleOpenCreate = (index: number, name: string) => {
        if (!name.trim()) return;
        setPendingItemName(name.trim());
        setPendingItemIndex(index);
        setIsItemFormOpen(true);
        setItemPopovers((prev) => ({ ...prev, [index]: false }));
        setItemSearchQueries((prev) => ({ ...prev, [index]: '' }));
    };

    const handleItemFormSubmit = async (data: any, id?: string) => {
        const url = id ? `/api/items/${id}` : '/api/items';
        const method = id ? 'PUT' : 'POST';
        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            if (res.ok) {
                const newItem: IItem = await res.json();
                toast.success('Item created successfully');
                if (onRefreshItems) await onRefreshItems();

                if (pendingItemIndex !== null) {
                    const price = priceContext === 'sale' ? newItem.sellingPrice : newItem.costPrice;
                    setValue(`${fieldName}.${pendingItemIndex}.itemId`, newItem._id, { shouldDirty: true });
                    setValue(`${fieldName}.${pendingItemIndex}.description`, newItem.name, { shouldDirty: true });
                    setValue(`${fieldName}.${pendingItemIndex}.price`, price, { shouldDirty: true });
                    const qty = watchedItems[pendingItemIndex]?.quantity || 1;
                    setValue(`${fieldName}.${pendingItemIndex}.total`, qty * price, { shouldDirty: true });
                }

                setIsItemFormOpen(false);
                setPendingItemName('');
                setPendingItemIndex(null);
            } else {
                const err = await res.json();
                toast.error('Failed to create item', { description: err.error || 'Please try again' });
            }
        } catch {
            toast.error('Failed to create item');
        }
    };

    const handleQuantityChange = (index: number, value: string) => {
        const qty = parseFloat(value);
        const price = Number(watchedItems[index]?.price) || 0;
        const taxRate = Number(watchedItems[index]?.taxRate) || 0;
        const total = isNaN(qty) ? 0 : qty * price;
        setValue(`${fieldName}.${index}.total`, total, { shouldDirty: true });
        setValue(`${fieldName}.${index}.taxAmount`, total * (taxRate / 100), { shouldDirty: true });
    };

    const handlePriceChange = (index: number, value: string) => {
        const price = parseFloat(value);
        const qty = Number(watchedItems[index]?.quantity) || 0;
        const taxRate = Number(watchedItems[index]?.taxRate) || 0;
        const total = isNaN(price) ? 0 : qty * price;
        setValue(`${fieldName}.${index}.price`, isNaN(price) ? 0 : price, { shouldDirty: true });
        setValue(`${fieldName}.${index}.total`, total, { shouldDirty: true });
        setValue(`${fieldName}.${index}.taxAmount`, total * (taxRate / 100), { shouldDirty: true });
    };

    const getDisplayName = (index: number) => {
        const item = filteredItems.find((i) => i._id === watchedItems[index]?.itemId);
        if (item) return item.name;
        return watchedItems[index]?.description || 'Select item…';
    };

    const renderSelector = (index: number, field: any) => {
        const query = itemSearchQueries[index] || '';
        const results = filteredItems.filter((i) =>
            i.name.toLowerCase().includes(query.toLowerCase())
        );
        const showCreate =
            query.trim() &&
            !results.some((i) => i.name.toLowerCase() === query.toLowerCase());

        return (
            <Popover
                open={itemPopovers[index]}
                onOpenChange={(open) => {
                    setItemPopovers((prev) => ({ ...prev, [index]: open }));
                    if (open) {
                        setItemSearchQueries((prev) => ({
                            ...prev,
                            [index]: watchedItems[index]?.description || '',
                        }));
                    }
                }}
            >
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        disabled={disabled}
                        className={cn(
                            'w-full justify-between font-normal',
                            isDesktop ? 'h-10' : 'h-9 text-sm'
                        )}
                    >
                        <span className="truncate">{getDisplayName(index)}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Search or type item name…"
                            value={query}
                            onValueChange={(v) => {
                                setItemSearchQueries((prev) => ({ ...prev, [index]: v }));
                                setValue(`${fieldName}.${index}.description`, v);
                            }}
                        />
                        <CommandList
                            className="max-h-[200px] overflow-y-auto"
                            onWheel={(e) => e.stopPropagation()}
                        >
                            {!query.trim() && <CommandEmpty>Start typing to search…</CommandEmpty>}
                            {query.trim() && results.length === 0 && !showCreate && (
                                <CommandEmpty>No items found.</CommandEmpty>
                            )}

                            {results.length > 0 && (
                                <CommandGroup heading="Items">
                                    {results.map((item) => {
                                        const price = getPriceFromItem(item);
                                        return (
                                            <CommandItem
                                                key={item._id}
                                                value={item.name}
                                                onSelect={() => handleItemSelect(index, item._id)}
                                            >
                                                <Check
                                                    className={cn(
                                                        'mr-2 h-4 w-4',
                                                        field.value === item._id ? 'opacity-100' : 'opacity-0'
                                                    )}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div>{item.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {item.category} •{' '}
                                                        {item.unit ? `${item.unit} • ` : ''}
                                                        {formatCurrency(price)}
                                                    </div>
                                                </div>
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            )}

                            {showCreate && (
                                <CommandGroup heading="Create New">
                                    <CommandItem
                                        value={`create-${query}`}
                                        onSelect={() => handleOpenCreate(index, query)}
                                        className="text-primary"
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Create &ldquo;{query}&rdquo;
                                    </CommandItem>
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        );
    };

    // ── Desktop table ──────────────────────────────────────────────────────────
    const desktop = (
        <div className="space-y-4">
            <div className="w-full overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b">
                            <th className="text-left p-3 font-medium text-sm w-[40px]">#</th>
                            <th className="text-left p-3 font-medium text-sm min-w-[260px]">
                                Item <span className="text-destructive">*</span>
                            </th>
                            <th className="text-left p-3 font-medium text-sm w-[100px]">Qty</th>
                            <th className="text-left p-3 font-medium text-sm w-[110px]">
                                {effectivePriceLabel}
                            </th>
                            <th className="text-right p-3 font-medium text-sm w-[110px]">Total</th>
                            <th className="text-center p-3 font-medium text-sm w-[60px]" />
                        </tr>
                    </thead>
                    <tbody>
                        {fields.map((field, index) => (
                            <tr key={field.id} className="border-b hover:bg-muted/50">
                                <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                                <td className="p-3">
                                    <Controller
                                        name={`${fieldName}.${index}.itemId`}
                                        control={control}
                                        render={({ field: f }) => renderSelector(index, f)}
                                    />
                                </td>
                                <td className="p-3">
                                    <Input
                                        type="number"
                                        step="any"
                                        min="0"
                                        className="h-10"
                                        {...register(`${fieldName}.${index}.quantity`, {
                                            onChange: (e) => handleQuantityChange(index, e.target.value),
                                        })}
                                    />
                                </td>
                                <td className="p-3">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        className="h-10"
                                        {...register(`${fieldName}.${index}.price`, {
                                            onChange: (e) => handlePriceChange(index, e.target.value),
                                        })}
                                    />
                                </td>
                                <td className="p-3 text-right font-semibold tabular-nums">
                                    {formatCurrency(watchedItems[index]?.total || 0)}
                                </td>
                                <td className="p-3 text-center">
                                    {fields.length > 1 && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onRemoveItem(index)}
                                            disabled={disabled}
                                            className="h-8 w-8 p-0 text-destructive"
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAppendItem}
                disabled={disabled}
                className="w-full gap-2"
            >
                <Plus className="h-4 w-4" />
                Add Item
            </Button>
        </div>
    );

    // ── Mobile cards ───────────────────────────────────────────────────────────
    const mobile = (
        <div className="space-y-4">
            {fields.map((field, index) => (
                <Card key={field.id} className="border-2">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-sm">Item #{index + 1}</CardTitle>
                            {fields.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRemoveItem(index)}
                                    disabled={disabled}
                                    className="h-8 w-8 p-0 text-destructive"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                                Item <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                name={`${fieldName}.${index}.itemId`}
                                control={control}
                                render={({ field: f }) => renderSelector(index, f)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">Qty</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    min="0"
                                    className="h-9"
                                    {...register(`${fieldName}.${index}.quantity`, {
                                        onChange: (e) => handleQuantityChange(index, e.target.value),
                                    })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{effectivePriceLabel}</Label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="h-9"
                                    {...register(`${fieldName}.${index}.price`, {
                                        onChange: (e) => handlePriceChange(index, e.target.value),
                                    })}
                                />
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-xs font-medium">Total</span>
                            <span className="text-sm font-bold">
                                {formatCurrency(watchedItems[index]?.total || 0)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
            ))}
            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onAppendItem}
                disabled={disabled}
                className="w-full gap-2"
            >
                <Plus className="h-4 w-4" />
                Add Item
            </Button>
        </div>
    );

    return (
        <>
            {isDesktop ? desktop : mobile}

            <ItemForm
                isOpen={isItemFormOpen}
                onClose={() => {
                    setIsItemFormOpen(false);
                    setPendingItemName('');
                    setPendingItemIndex(null);
                }}
                onSubmit={handleItemFormSubmit}
                defaultValues={
                    pendingItemName
                        ? ({
                            name: pendingItemName,
                            types: allowedTypes ?? ['product'],
                            category: '',
                            sellingPrice: 0,
                            costPrice: 0,
                        } as any)
                        : null
                }
            />
        </>
    );
}