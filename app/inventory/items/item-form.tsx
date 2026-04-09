// app/inventory/items/item-form.tsx

'use client';

import * as React from 'react';
import { useForm, SubmitHandler, Controller, useFieldArray } from 'react-hook-form';
import { Check, ChevronsUpDown, Plus, Trash2, Package, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from '@/components/ui/dialog';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import type { IItem } from '@/models/Item';

const PREDEFINED_UNITS = [
    'piece', 'kilogram', 'gram', 'milligram', 'liter', 'milliliter',
    'meter', 'centimeter', 'millimeter', 'squaremeter', 'foot', 'inch',
    'box', 'pack', 'roll', 'set', 'can', 'dozen',
];

export type ItemFormData = {
    name: string;
    types: ('product' | 'material')[];
    category: string;
    sellingPrice: number;
    costPrice: number;
    taxRate: number;
    taxType: 'standard' | 'zero' | 'exempt';
    unit: string;
    stock: number;
    minStockLevel: number;
    bom: Array<{ itemId: string; quantity: number; unit: string }>;
    sku?: string;
    barcode?: string;
    notes?: string;
};

interface ItemFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ItemFormData, id?: string) => void;
    defaultValues?: Partial<IItem> | null;
    existingCategories?: string[];
}

export function ItemForm({
    isOpen,
    onClose,
    onSubmit,
    defaultValues,
    existingCategories = [],
}: ItemFormProps) {
    const {
        register,
        handleSubmit,
        reset,
        control,
        watch,
        setValue,
        formState: { isSubmitting, isDirty },
    } = useForm<ItemFormData>({
        defaultValues: {
            name: '',
            types: ['product'],
            category: '',
            sellingPrice: 0,
            costPrice: 0,
            taxRate: 5,
            taxType: 'standard',
            unit: 'piece',
            stock: 0,
            minStockLevel: 0,
            bom: [],
            sku: '',
            barcode: '',
            notes: '',
        },
    });

    const { fields: bomFields, append: appendBOM, remove: removeBOM } = useFieldArray({
        control,
        name: 'bom',
    });

    const [availableItems, setAvailableItems] = React.useState<IItem[]>([]);
    const [isCategoryPopoverOpen, setIsCategoryPopoverOpen] = React.useState(false);
    const [categorySearch, setCategorySearch] = React.useState('');
    const [isUnitPopoverOpen, setIsUnitPopoverOpen] = React.useState(false);
    const [unitSearch, setUnitSearch] = React.useState('');

    const watchedTypes = watch('types');
    const watchedCategory = watch('category');
    const watchedName = watch('name');
    const isProduct = watchedTypes.includes('product');
    const isMaterial = watchedTypes.includes('material');

    React.useEffect(() => {
        if (isOpen) {
            reset({
                name: defaultValues?.name || '',
                types: (defaultValues?.types as any[]) || ['product'],
                category: defaultValues?.category || '',
                sellingPrice: defaultValues?.sellingPrice ?? 0,
                costPrice: defaultValues?.costPrice ?? 0,
                taxRate: defaultValues?.taxRate ?? 5,
                taxType: defaultValues?.taxType || 'standard',
                unit: defaultValues?.unit || 'piece',
                stock: defaultValues?.stock ?? 0,
                minStockLevel: defaultValues?.minStockLevel ?? 0,
                bom:
                    defaultValues?.bom?.map((b: any) => ({
                        itemId: b.itemId?.toString() || '',
                        quantity: b.quantity,
                        unit: b.unit,
                    })) || [],
                sku: defaultValues?.sku || '',
                barcode: defaultValues?.barcode || '',
                notes: defaultValues?.notes || '',
            });
            setCategorySearch('');
            setUnitSearch('');

            fetch('/api/items?types=material')
                .then((r) => r.json())
                .then(setAvailableItems)
                .catch(console.error);
        }
    }, [isOpen, defaultValues, reset]);

    const toggleType = (type: 'product' | 'material') => {
        const current = watch('types');
        if (current.includes(type)) {
            setValue('types', current.filter((t) => t !== type), { shouldDirty: true });
        } else {
            setValue('types', [...current, type], { shouldDirty: true });
        }
    };

    const handleFormSubmit: SubmitHandler<ItemFormData> = (data) => {
        if (!data.name?.trim()) { toast.error('Item name is required'); return; }
        if (!data.types?.length) { toast.error('Select at least one type (Product or Material)'); return; }
        if (!data.category?.trim()) { toast.error('Category is required'); return; }

        if (data.taxType === 'zero' || data.taxType === 'exempt') {
            data.taxRate = 0;
        }

        const id = defaultValues?._id ? String(defaultValues._id) : undefined;
        onSubmit(data, id);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] lg:max-w-4xl max-h-[90vh] overflow-y-auto sidebar-scroll">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        {defaultValues?._id ? 'Edit Item' : 'Create Item'}
                    </DialogTitle>
                    <DialogDescription>
                        Items can be products (sold), materials (purchased / consumed), or both.
                    </DialogDescription>
                </DialogHeader>

                <form
                    onSubmit={(e) => {
                        e.stopPropagation();
                        handleSubmit(handleFormSubmit)(e);
                    }}
                    className="space-y-6"
                >
                    {/* Identity & Categorization */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Identity & Categorization
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Item Name <span className="text-destructive">*</span>
                                </Label>
                                <Input id="name" placeholder="e.g., Stainless Steel Bolt" {...register('name')} />
                            </div>

                            <div className="space-y-2">
                                <Label>
                                    Category <span className="text-destructive">*</span>
                                </Label>
                                <Controller
                                    control={control}
                                    name="category"
                                    render={({ field }) => (
                                        <Popover
                                            open={isCategoryPopoverOpen}
                                            onOpenChange={setIsCategoryPopoverOpen}
                                        >
                                            <PopoverTrigger asChild>
                                                <Button variant="outline" role="combobox" className="w-full justify-between">
                                                    {field.value || 'Select or create category…'}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                <Command shouldFilter={false}>
                                                    <CommandInput
                                                        placeholder="Search or type new category…"
                                                        value={categorySearch}
                                                        onValueChange={setCategorySearch}
                                                    />
                                                    <CommandList
                                                        className="max-h-[180px] overflow-y-auto"
                                                        onWheel={(e) => e.stopPropagation()}
                                                    >
                                                        {existingCategories
                                                            .filter(
                                                                (c) =>
                                                                    !categorySearch ||
                                                                    c.toLowerCase().includes(categorySearch.toLowerCase())
                                                            )
                                                            .map((cat) => (
                                                                <CommandItem
                                                                    key={cat}
                                                                    value={cat}
                                                                    onSelect={() => {
                                                                        field.onChange(cat);
                                                                        setIsCategoryPopoverOpen(false);
                                                                        setCategorySearch('');
                                                                    }}
                                                                >
                                                                    <Check
                                                                        className={cn(
                                                                            'mr-2 h-4 w-4',
                                                                            field.value === cat ? 'opacity-100' : 'opacity-0'
                                                                        )}
                                                                    />
                                                                    {cat}
                                                                </CommandItem>
                                                            ))}
                                                        {categorySearch.trim() &&
                                                            !existingCategories.some(
                                                                (c) =>
                                                                    c.toLowerCase() === categorySearch.trim().toLowerCase()
                                                            ) && (
                                                                <CommandItem
                                                                    value={categorySearch}
                                                                    onSelect={() => {
                                                                        field.onChange(categorySearch.trim());
                                                                        setIsCategoryPopoverOpen(false);
                                                                        setCategorySearch('');
                                                                    }}
                                                                    className="text-primary"
                                                                >
                                                                    <Plus className="mr-2 h-4 w-4" />
                                                                    Create &ldquo;{categorySearch.trim()}&rdquo;
                                                                </CommandItem>
                                                            )}
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                    )}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Types Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Item Types
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Label
                                htmlFor="type-product"
                                className={cn(
                                    "hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                                    isProduct && "border-blue-600 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
                                )}
                            >
                                <div className="grid gap-1.5 font-normal flex-1">
                                    <p className="text-sm leading-none font-medium">
                                        Product
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        Appears in sales transactions
                                    </p>
                                </div>
                                <Switch
                                    id="type-product"
                                    checked={isProduct}
                                    onCheckedChange={() => toggleType('product')}
                                    className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-700"
                                />
                            </Label>

                            <Label
                                htmlFor="type-material"
                                className={cn(
                                    "hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                                    isMaterial && "border-amber-600 bg-amber-50 dark:border-amber-900 dark:bg-amber-950"
                                )}
                            >
                                <div className="grid gap-1.5 font-normal flex-1">
                                    <p className="text-sm leading-none font-medium">
                                        Material
                                    </p>
                                    <p className="text-muted-foreground text-sm">
                                        Appears in purchase transactions and inventory tracking
                                    </p>
                                </div>
                                <Switch
                                    id="type-material"
                                    checked={isMaterial}
                                    onCheckedChange={() => toggleType('material')}
                                    className="data-[state=checked]:bg-amber-600 dark:data-[state=checked]:bg-amber-700"
                                />
                            </Label>
                        </div>

                        {!isProduct && !isMaterial && (
                            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                    Select at least one type (Product or Material) for this item
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Pricing */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Pricing
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {isProduct && (
                                <div className="space-y-2">
                                    <Label htmlFor="sellingPrice">Selling Price</Label>
                                    <Input
                                        id="sellingPrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        {...register('sellingPrice', { valueAsNumber: true })}
                                    />
                                </div>
                            )}
                            {isMaterial && (
                                <div className="space-y-2">
                                    <Label htmlFor="costPrice">Cost Price</Label>
                                    <Input
                                        id="costPrice"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        {...register('costPrice', { valueAsNumber: true })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tax Configuration */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Tax Configuration
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Tax Type</Label>
                                <Controller
                                    control={control}
                                    name="taxType"
                                    render={({ field }) => (
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="standard">Standard (taxable)</SelectItem>
                                                <SelectItem value="zero">Zero-rated</SelectItem>
                                                <SelectItem value="exempt">Exempt</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            {watch('taxType') === 'standard' && (
                                <div className="space-y-2">
                                    <Label htmlFor="taxRate">Tax Rate (%)</Label>
                                    <Input
                                        id="taxRate"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        {...register('taxRate', { valueAsNumber: true })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stock & Units (material only conceptually but kept per existing logic) */}
                    {isMaterial && (
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                Inventory Tracking
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>
                                        Unit <span className="text-destructive">*</span>
                                    </Label>
                                    <Controller
                                        control={control}
                                        name="unit"
                                        render={({ field }) => {
                                            const locked = defaultValues?.baseUnitLocked;
                                            if (locked) {
                                                return (
                                                    <div>
                                                        <Input value={field.value} readOnly disabled className="opacity-70" />
                                                        <p className="text-xs text-muted-foreground mt-1">
                                                            Unit locked after stock movement
                                                        </p>
                                                    </div>
                                                );
                                            }
                                            return (
                                                <Popover open={isUnitPopoverOpen} onOpenChange={setIsUnitPopoverOpen}>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className="w-full justify-between"
                                                        >
                                                            {field.value || 'Select unit…'}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                        <Command shouldFilter={false}>
                                                            <CommandInput
                                                                placeholder="Search or add unit…"
                                                                value={unitSearch}
                                                                onValueChange={setUnitSearch}
                                                            />
                                                            <CommandList
                                                                className="max-h-[180px] overflow-y-auto"
                                                                onWheel={(e) => e.stopPropagation()}
                                                            >
                                                                <CommandGroup>
                                                                    {PREDEFINED_UNITS.filter(
                                                                        (u) =>
                                                                            !unitSearch ||
                                                                            u.toLowerCase().includes(unitSearch.toLowerCase())
                                                                    ).map((u) => (
                                                                        <CommandItem
                                                                            key={u}
                                                                            value={u}
                                                                            onSelect={() => {
                                                                                field.onChange(u);
                                                                                setIsUnitPopoverOpen(false);
                                                                                setUnitSearch('');
                                                                            }}
                                                                        >
                                                                            <Check
                                                                                className={cn(
                                                                                    'mr-2 h-4 w-4',
                                                                                    field.value === u ? 'opacity-100' : 'opacity-0'
                                                                                )}
                                                                            />
                                                                            {u}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                                {unitSearch.trim() &&
                                                                    !PREDEFINED_UNITS.some(
                                                                        (u) =>
                                                                            u.toLowerCase() === unitSearch.trim().toLowerCase()
                                                                    ) && (
                                                                        <CommandItem
                                                                            value={unitSearch}
                                                                            onSelect={() => {
                                                                                field.onChange(unitSearch.trim());
                                                                                setIsUnitPopoverOpen(false);
                                                                                setUnitSearch('');
                                                                            }}
                                                                            className="text-primary"
                                                                        >
                                                                            <Plus className="mr-2 h-4 w-4" />
                                                                            Create &ldquo;{unitSearch.trim()}&rdquo;
                                                                        </CommandItem>
                                                                    )}
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            );
                                        }}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="stock">Current Stock</Label>
                                    <Input
                                        id="stock"
                                        type="number"
                                        step="any"
                                        min="0"
                                        {...register('stock', { valueAsNumber: true })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="minStockLevel">Min Stock Level</Label>
                                    <Input
                                        id="minStockLevel"
                                        type="number"
                                        step="any"
                                        min="0"
                                        {...register('minStockLevel', { valueAsNumber: true })}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* BOM (product only) */}
                    {isProduct && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                                        Bill of Materials (BOM)
                                    </h3>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Materials consumed to produce this item
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => appendBOM({ itemId: '', quantity: 1, unit: '' })}
                                >
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    Add Material
                                </Button>
                            </div>

                            {bomFields.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed rounded-lg text-sm text-muted-foreground bg-muted/20">
                                    No BOM defined. Click &ldquo;Add Material&rdquo; to define components.
                                </div>
                            )}

                            <div className="space-y-3">
                                {bomFields.map((bomField, i) => {
                                    const selectedItem = availableItems.find(
                                        (m) => m._id === watch(`bom.${i}.itemId`)
                                    );
                                    return (
                                        <div
                                            key={bomField.id}
                                            className="flex flex-col md:flex-row md:items-end gap-3 p-3 border rounded-lg bg-muted/10"
                                        >
                                            <div className="flex-1 space-y-1.5">
                                                <Label className="text-xs">Material Component <span className="text-destructive">*</span></Label>
                                                <Controller
                                                    control={control}
                                                    name={`bom.${i}.itemId`}
                                                    render={({ field: f }) => (
                                                        <Select
                                                            value={f.value}
                                                            onValueChange={(v) => {
                                                                f.onChange(v);
                                                                const m = availableItems.find((x) => x._id === v);
                                                                if (m) setValue(`bom.${i}.unit`, m.unit);
                                                            }}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select material item…" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {availableItems.map((m) => (
                                                                    <SelectItem key={m._id} value={m._id}>
                                                                        {m.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </div>

                                            <div className="md:w-24 space-y-1.5">
                                                <Label className="text-xs">Quantity <span className="text-destructive">*</span></Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    placeholder="1.0"
                                                    {...register(`bom.${i}.quantity`, { valueAsNumber: true })}
                                                />
                                            </div>

                                            <div className="md:w-24 space-y-1.5">
                                                <Label className="text-xs">Unit</Label>
                                                <Input
                                                    value={selectedItem?.unit || '—'}
                                                    readOnly
                                                    disabled
                                                    className="bg-muted text-muted-foreground"
                                                />
                                            </div>

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="mb-0.5 text-muted-foreground hover:text-destructive w-full md:w-auto"
                                                onClick={() => removeBOM(i)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Optional metadata */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                            Additional Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU</Label>
                                <Input id="sku" placeholder="Stock Keeping Unit" {...register('sku')} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="barcode">Barcode</Label>
                                <Input id="barcode" placeholder="EAN / UPC / custom" {...register('barcode')} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="notes">Internal Notes</Label>
                                <Input id="notes" placeholder="Any additional notes about this item..." {...register('notes')} />
                            </div>
                        </div>
                    </div>

                    {/* Summary Card */}
                    <Card className="bg-muted/50 border-dashed">
                        <CardContent className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs">Item Name</p>
                                    <p className="font-medium truncate">
                                        {watchedName || "Not Set"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs">Types</p>
                                    <div className="flex flex-wrap gap-1">
                                        {isProduct && (
                                            <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">
                                                Product
                                            </Badge>
                                        )}
                                        {isMaterial && (
                                            <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400">
                                                Material
                                            </Badge>
                                        )}
                                        {!isProduct && !isMaterial && (
                                            <span className="text-muted-foreground text-xs">None</span>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs">Category</p>
                                    <p className="font-medium truncate">
                                        {watchedCategory || "Not Set"}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-muted-foreground text-xs">Stock</p>
                                    <p className="font-medium">
                                        {isMaterial ? `${watch('stock') || 0} ${watch('unit') || ''}` : 'N/A'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" onClick={onClose}>
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={isSubmitting || (!!defaultValues?._id && !isDirty)}
                        >
                            {isSubmitting ? (
                                <>
                                    <Spinner />
                                    Saving…
                                </>
                            ) : defaultValues?._id ? (
                                'Update Item'
                            ) : (
                                'Create Item'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}