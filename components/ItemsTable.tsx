// components/ItemsTable.tsx - Reusable items table for products and materials

"use client";

import React from "react";
import { Control, UseFormRegister, UseFormSetValue, UseFormWatch } from "react-hook-form";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Popover,
    PopoverTrigger,
    PopoverContent
} from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList
} from "@/components/ui/command";
import { ChevronsUpDown, Check, Plus, PlusCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/formatters/currency";

export type ItemType = 'product' | 'material';

export interface ProductItem {
    productId?: string;
    description: string;
    quantity: number;
    rate?: number;
    price?: number;
    total: number;
    shouldCreateProduct?: boolean;
}

export interface MaterialItem {
    materialId: string;
    materialName: string;
    quantity: number;
    unitCost: number;
    total: number;
    shouldCreateMaterial?: boolean;
}

export type GenericItem = ProductItem | MaterialItem;

interface ItemData {
    _id: string;
    name: string;
    price?: number;
    unitCost?: number;
    type?: string;
    unit?: string;
}

interface ItemsTableProps<T extends GenericItem> {
    // Item configuration
    itemType: ItemType;
    items: ItemData[];

    // Form control
    fields: Record<"id", string>[];
    control: Control<any>;
    register: UseFormRegister<any>;
    watch: UseFormWatch<any>;
    setValue: UseFormSetValue<any>;

    // Callbacks
    onAppendItem: () => void;
    onRemoveItem: (index: number) => void;

    // Field name in the form (e.g., "items")
    fieldName: string;

    // Optional configurations
    disabled?: boolean;
    showCreateOptions?: boolean;
    isDesktop?: boolean;

    // Custom labels
    itemLabel?: string;
    quantityLabel?: string;
    priceLabel?: string;
}

export function ItemsTable<T extends GenericItem>({
    itemType,
    items,
    fields,
    control,
    register,
    watch,
    setValue,
    onAppendItem,
    onRemoveItem,
    fieldName,
    disabled = false,
    showCreateOptions = true,
    isDesktop = true,
    itemLabel,
    quantityLabel = "Qty",
    priceLabel,
}: ItemsTableProps<T>) {
    const [itemPopovers, setItemPopovers] = React.useState<Record<number, boolean>>({});
    const [itemSearchQueries, setItemSearchQueries] = React.useState<Record<number, string>>({});

    const watchedItems = watch(fieldName);

    // Determine field names based on item type
    const idField = itemType === 'product' ? 'productId' : 'materialId';
    const nameField = itemType === 'product' ? 'description' : 'materialName';
    const priceField = itemType === 'product' ? (priceLabel === 'Rate' ? 'rate' : 'price') : 'unitCost';
    const shouldCreateField = itemType === 'product' ? 'shouldCreateProduct' : 'shouldCreateMaterial';

    const effectiveItemLabel = itemLabel || (itemType === 'product' ? 'Product' : 'Material');
    const effectivePriceLabel = priceLabel || (itemType === 'product' ? 'Rate' : 'Unit Cost');

    const handleItemSelect = (index: number, itemId: string) => {
        const item = items.find(i => i._id === itemId);
        if (!item) return;

        const itemPrice = itemType === 'product' ? (item.price || 0) : (item.unitCost || 0);

        setValue(`${fieldName}.${index}.${idField}`, itemId, { shouldDirty: true });
        setValue(`${fieldName}.${index}.${nameField}`, item.name, { shouldDirty: true });
        setValue(`${fieldName}.${index}.${priceField}`, itemPrice, { shouldDirty: true });

        const quantity = parseFloat(String(watchedItems[index].quantity)) || 1;
        setValue(`${fieldName}.${index}.total`, quantity * itemPrice, { shouldDirty: true });

        setItemPopovers(prev => ({ ...prev, [index]: false }));
        setItemSearchQueries(prev => ({ ...prev, [index]: "" }));
    };

    const handleCreateCustomItem = (index: number, itemName: string) => {
        if (!itemName.trim()) return;

        setValue(`${fieldName}.${index}.${idField}`, "", { shouldDirty: true });
        setValue(`${fieldName}.${index}.${nameField}`, itemName.trim(), { shouldDirty: true });
        setValue(`${fieldName}.${index}.${shouldCreateField}`, false, { shouldDirty: true });

        setItemPopovers(prev => ({ ...prev, [index]: false }));
        setItemSearchQueries(prev => ({ ...prev, [index]: "" }));
    };

    const handleMarkForCreation = (index: number, itemName: string) => {
        if (!itemName.trim()) return;

        setValue(`${fieldName}.${index}.${idField}`, "", { shouldDirty: true });
        setValue(`${fieldName}.${index}.${nameField}`, itemName.trim(), { shouldDirty: true });
        setValue(`${fieldName}.${index}.${shouldCreateField}`, true, { shouldDirty: true });

        setItemPopovers(prev => ({ ...prev, [index]: false }));
        setItemSearchQueries(prev => ({ ...prev, [index]: "" }));

        toast.info(`"${itemName}" will be created as a ${itemType} when submitted`);
    };

    const handleQuantityChange = (index: number, value: string) => {
        const quantity = parseFloat(value);
        const price = Number(watchedItems[index][priceField]) || 0;

        if (!isNaN(quantity)) {
            setValue(`${fieldName}.${index}.total`, quantity * price, { shouldDirty: true });
        } else {
            setValue(`${fieldName}.${index}.total`, 0, { shouldDirty: true });
        }
    };

    const handlePriceChange = (index: number, value: string) => {
        const price = parseFloat(value);
        const quantity = Number(watchedItems[index].quantity) || 0;

        setValue(`${fieldName}.${index}.${priceField}`, isNaN(price) ? 0 : price, { shouldDirty: true });

        if (!isNaN(price)) {
            setValue(`${fieldName}.${index}.total`, quantity * price, { shouldDirty: true });
        } else {
            setValue(`${fieldName}.${index}.total`, 0, { shouldDirty: true });
        }
    };

    const getItemDisplayName = (index: number): string => {
        const item = items.find(i => i._id === watchedItems[index]?.[idField]);
        if (item) return item.name;
        return watchedItems[index]?.[nameField] || `Select ${effectiveItemLabel.toLowerCase()}...`;
    };

    const renderItemSelector = (index: number, field: any) => {
        const searchQuery = itemSearchQueries[index] || "";
        const filteredItems = items.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        const isNewItem = searchQuery.trim() && !filteredItems.some(item =>
            item.name.toLowerCase() === searchQuery.toLowerCase()
        );

        return (
            <Popover
                open={itemPopovers[index]}
                onOpenChange={(open) => {
                    setItemPopovers(prev => ({ ...prev, [index]: open }));
                    if (open) {
                        setItemSearchQueries(prev => ({ ...prev, [index]: watchedItems[index]?.[nameField] || "" }));
                    }
                }}
            >
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className={cn(
                            "w-full justify-between font-normal",
                            isDesktop ? "h-10" : "h-9 text-sm"
                        )}
                        disabled={disabled}
                    >
                        <span className="truncate">{getItemDisplayName(index)}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder={`Search or type ${effectiveItemLabel.toLowerCase()}...`}
                            value={searchQuery}
                            onValueChange={(value) => {
                                setItemSearchQueries(prev => ({ ...prev, [index]: value }));
                                setValue(`${fieldName}.${index}.${nameField}`, value);
                            }}
                        />
                        <CommandList
                            className="max-h-[200px] overflow-y-auto"
                            onWheel={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()}
                        >
                            {!searchQuery.trim() && (
                                <CommandEmpty>Start typing to search...</CommandEmpty>
                            )}
                            {searchQuery.trim() && filteredItems.length === 0 && !isNewItem && (
                                <CommandEmpty>No {effectiveItemLabel.toLowerCase()} found.</CommandEmpty>
                            )}

                            {filteredItems.length > 0 && (
                                <CommandGroup heading={`Existing ${effectiveItemLabel}s`}>
                                    {filteredItems.map((item) => {
                                        const itemPrice = itemType === 'product' ? item.price : item.unitCost;
                                        const itemDetails = itemType === 'material'
                                            ? `${item.type} • ${formatCurrency(itemPrice || 0)}/${item.unit}`
                                            : formatCurrency(itemPrice || 0);

                                        return (
                                            <CommandItem
                                                key={item._id}
                                                value={item.name}
                                                onSelect={() => handleItemSelect(index, item._id)}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        field.value === item._id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className={cn(isDesktop ? "" : "truncate")}>{item.name}</div>
                                                    <div className={cn(
                                                        "text-xs text-muted-foreground",
                                                        isDesktop ? "" : "truncate"
                                                    )}>
                                                        {itemDetails}
                                                    </div>
                                                </div>
                                            </CommandItem>
                                        );
                                    })}
                                </CommandGroup>
                            )}

                            {showCreateOptions && isNewItem && (
                                <CommandGroup heading="Add Custom Item">
                                    <CommandItem
                                        onSelect={() => handleCreateCustomItem(index, searchQuery)}
                                        className="text-primary"
                                        value={searchQuery}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Use "{searchQuery}"
                                    </CommandItem>
                                    <CommandItem
                                        onSelect={() => handleMarkForCreation(index, searchQuery)}
                                        className="text-green-600 dark:text-green-400"
                                        value={`create-${searchQuery}`}
                                    >
                                        <PlusCircle className="mr-2 h-4 w-4" />
                                        Create "{searchQuery}"
                                    </CommandItem>
                                </CommandGroup>
                            )}
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        );
    };

    if (isDesktop) {
        return (
            <div className="space-y-4">
                <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left p-3 font-medium text-sm w-[40px]">#</th>
                                <th className="text-left p-3 font-medium text-sm min-w-[250px]">
                                    {effectiveItemLabel} <span className="text-destructive">*</span>
                                </th>
                                <th className="text-left p-3 font-medium text-sm w-[100px]">{quantityLabel}</th>
                                <th className="text-left p-3 font-medium text-sm w-[100px]">{effectivePriceLabel}</th>
                                <th className="text-right p-3 font-medium text-sm w-[100px]">Total</th>
                                <th className="text-center p-3 font-medium text-sm w-[60px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {fields.map((field, index) => (
                                <tr key={field.id} className="border-b hover:bg-muted/50">
                                    <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                                    <td className="p-3">
                                        <Controller
                                            name={`${fieldName}.${index}.${idField}`}
                                            control={control}
                                            render={({ field }) => renderItemSelector(index, field)}
                                        />
                                    </td>
                                    <td className="p-3">
                                        <Input
                                            type="number"
                                            step="any"
                                            min="0"
                                            className="h-10"
                                            {...register(`${fieldName}.${index}.quantity`, {
                                                onChange: (e) => handleQuantityChange(index, e.target.value)
                                            })}
                                        />
                                    </td>
                                    <td className="p-3">
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            className="h-10 text-left"
                                            {...register(`${fieldName}.${index}.${priceField}`, {
                                                onChange: (e) => handlePriceChange(index, e.target.value)
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
                                                className="h-8 w-8 p-0 text-destructive"
                                                disabled={disabled}
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
                    className="w-full gap-2"
                    disabled={disabled}
                >
                    <Plus className="h-4 w-4" />
                    Add {effectiveItemLabel}
                </Button>
            </div>
        );
    }

    // Mobile card view
    return (
        <div className="space-y-4">
            {fields.map((field, index) => (
                <Card key={field.id} className="border-2">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                            <CardTitle className="text-sm">{effectiveItemLabel} #{index + 1}</CardTitle>
                            {fields.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => onRemoveItem(index)}
                                    className="h-8 w-8 p-0 text-destructive"
                                    disabled={disabled}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">
                                {effectiveItemLabel} <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                name={`${fieldName}.${index}.${idField}`}
                                control={control}
                                render={({ field }) => renderItemSelector(index, field)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-muted-foreground">{quantityLabel}</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    min="0"
                                    className="h-9"
                                    {...register(`${fieldName}.${index}.quantity`, {
                                        onChange: (e) => handleQuantityChange(index, e.target.value)
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
                                    {...register(`${fieldName}.${index}.${priceField}`, {
                                        onChange: (e) => handlePriceChange(index, e.target.value)
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
                className="w-full gap-2"
                disabled={disabled}
            >
                <Plus className="h-4 w-4" />
                Add {effectiveItemLabel}
            </Button>
        </div>
    );
}