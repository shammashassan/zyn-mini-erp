// app/inventory/stock-adjustment/adjustment-form.tsx - UPDATED: Uses Item model

'use client';

import React, { useEffect, useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Check, ChevronsUpDown, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
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
import { formatCurrency } from '@/utils/formatters/currency';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import type { IItem } from '@/models/Item';

type AdjustmentFormData = {
  itemId: string;
  adjustmentType: 'increment' | 'decrement';
  value: number | '';
  newCostPrice?: number;
  adjustmentReason?: string;
};

interface AdjustmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: AdjustmentFormData) => void | Promise<void>;
  /** Pass in pre-fetched items or leave empty; the form will fetch material-type items */
  items?: IItem[];
  isLoadingItems?: boolean;
  /** Pre-select a specific item when the form opens (e.g. from a row-level Adjust button) */
  defaultItemId?: string;
}

export function AdjustmentForm({
  isOpen,
  onClose,
  onSubmit,
  items: propItems,
  isLoadingItems = false,
  defaultItemId,
}: AdjustmentFormProps) {
  const {
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting },
  } = useForm<AdjustmentFormData>({
    defaultValues: {
      itemId: '',
      adjustmentType: 'increment',
      value: 1,
      newCostPrice: undefined,
      adjustmentReason: '',
    },
  });

  const [adjustmentMode, setAdjustmentMode] = useState<'stock' | 'price'>('stock');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [fetchedItems, setFetchedItems] = useState<IItem[]>([]);

  const watchedItemId = watch('itemId');

  // Use prop items if provided, otherwise fetch material-type items
  const items = propItems ?? fetchedItems;

  useEffect(() => {
    if (!propItems && isOpen) {
      fetch('/api/items?types=material')
        .then((r) => r.json())
        .then(setFetchedItems)
        .catch(console.error);
    }
  }, [isOpen, propItems]);

  useEffect(() => {
    if (isOpen) {
      setAdjustmentMode('stock');
      reset({
        itemId: defaultItemId || '',
        adjustmentType: 'increment',
        value: 1,
        newCostPrice: undefined,
        adjustmentReason: '',
      });
      setSearchQuery('');
    }
  }, [isOpen, reset, defaultItemId]);

  // Sync search query when popover opens
  useEffect(() => {
    if (isPopoverOpen && watchedItemId) {
      const selected = items.find((m) => m._id === watchedItemId);
      if (selected) setSearchQuery(selected.name);
    }
  }, [isPopoverOpen, watchedItemId, items]);

  const handleFormSubmit: SubmitHandler<AdjustmentFormData> = (data) => {
    if (!data.itemId) { toast.error('Please select an item'); return; }
    if (!data.adjustmentReason?.trim()) { toast.error('Please provide a reason'); return; }

    let submission = { ...data };

    if (adjustmentMode === 'stock') {
      if (data.value === '' || Number(data.value) <= 0) {
        toast.error('Quantity must be greater than 0');
        return;
      }
    } else {
      submission = { ...submission, adjustmentType: 'increment', value: 0 };
      if (typeof data.newCostPrice !== 'number' || data.newCostPrice < 0) {
        toast.error('Enter a valid cost price');
        return;
      }
    }

    onSubmit(submission);
  };

  const selectedItem = items.find((m) => m._id === watchedItemId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Make a Stock Adjustment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 mt-4">
          {/* Item selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Item (material)</Label>
            <Controller
              name="itemId"
              control={control}
              render={({ field }) => (
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between h-auto py-2 px-3 text-left"
                    >
                      <span className="truncate flex-1">
                        {field.value
                          ? items.find((m) => m._id === field.value)?.name
                          : 'Select an item…'}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search item…"
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList
                        className="max-h-[200px] overflow-y-auto"
                        onWheel={(e) => e.stopPropagation()}
                      >
                        <CommandEmpty>No item found.</CommandEmpty>
                        <CommandGroup>
                          {items
                            .filter(
                              (m) =>
                                !searchQuery ||
                                m.name.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((item) => (
                              <CommandItem
                                key={item._id}
                                value={item.name}
                                onSelect={() => {
                                  field.onChange(item._id);
                                  setIsPopoverOpen(false);
                                  setSearchQuery('');
                                }}
                                className="flex items-start gap-2 py-2"
                              >
                                <Check
                                  className={cn(
                                    'mt-1 h-4 w-4 shrink-0',
                                    field.value === item._id ? 'opacity-100' : 'opacity-0'
                                  )}
                                />
                                <div className="flex flex-col gap-0.5">
                                  <span className="font-medium">{item.name}</span>
                                  <span className="text-xs text-muted-foreground">
                                    Stock: {item.stock} {item.unit} •{' '}
                                    {formatCurrency(item.costPrice ?? 0)}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          {/* Adjustment type toggle */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Adjustment Type</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              value={adjustmentMode}
              onValueChange={(v: 'stock' | 'price') => { if (v) setAdjustmentMode(v); }}
              className="w-full justify-start p-1"
            >
              <ToggleGroupItem value="stock" className="flex-1 h-8 text-sm">
                Adjust Stock
              </ToggleGroupItem>
              <ToggleGroupItem value="price" className="flex-1 h-8 text-sm">
                Adjust Cost Price
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Stock adjustment */}
          {adjustmentMode === 'stock' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-accent/5 animate-in fade-in-0 duration-300">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground">
                  Stock Change
                </Label>
                <Controller
                  name="adjustmentType"
                  control={control}
                  render={({ field }) => (
                    <ToggleGroup
                      type="single"
                      value={field.value}
                      onValueChange={(v: 'increment' | 'decrement') =>
                        v && field.onChange(v)
                      }
                      className="w-full"
                    >
                      <ToggleGroupItem value="increment" className="flex-1 border text-xs h-9">
                        Increment (+)
                      </ToggleGroupItem>
                      <ToggleGroupItem value="decrement" className="flex-1 border text-xs h-9">
                        Decrement (−)
                      </ToggleGroupItem>
                    </ToggleGroup>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="value" className="text-xs font-semibold text-muted-foreground">
                  By Quantity
                </Label>
                <Controller
                  name="value"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="value"
                      type="number"
                      placeholder="e.g., 5"
                      className="h-9"
                      value={field.value ?? ''}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === '' ? '' : parseInt(v, 10));
                      }}
                    />
                  )}
                />
              </div>
            </div>
          )}

          {/* Cost price adjustment */}
          {adjustmentMode === 'price' && (
            <div className="p-4 border rounded-lg bg-accent/5 animate-in fade-in-0 duration-300">
              <div className="space-y-2">
                <Label htmlFor="newCostPrice" className="text-sm font-medium">
                  New Cost Price
                </Label>
                <Controller
                  name="newCostPrice"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      id="newCostPrice"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      className="h-10"
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        field.onChange(isNaN(v) ? '' : v);
                      }}
                      value={field.value ?? ''}
                    />
                  )}
                />
                {selectedItem && (
                  <p className="text-xs text-muted-foreground">
                    Current: {formatCurrency(selectedItem.costPrice ?? 0)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="adjustmentReason" className="text-sm font-medium">
              Reason for Adjustment
            </Label>
            <Controller
              name="adjustmentReason"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="adjustmentReason"
                  placeholder="e.g., Damaged during transit, physical count variance…"
                  className="min-h-[90px] resize-none"
                  value={field.value ?? ''}
                />
              )}
            />
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className="w-full sm:w-auto">
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Processing…
                </>
              ) : (
                'Apply Adjustment'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}