// app/procurement/purchases/purchase-form.tsx - MINIMAL CHANGES: Event propagation fix + Self-contained ItemsTable

"use client";

import React, { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { IPurchase } from "@/models/Purchase";
import { formatCurrency } from "@/utils/formatters/currency";
import { Spinner } from "@/components/ui/spinner";
import { ItemsTable } from "@/components/ItemsTable";
import { PartyContactSelector } from "@/components/PartyContactSelector";

type ItemApiData = {
  _id: string;
  name: string;
  sellingPrice: number;
  costPrice: number;
  unit?: string;
  category?: string;
  types: string[];
  taxRate?: number;
  taxType?: string;
};

type PurchaseItem = {
  itemId?: string;
  description: string;
  quantity: number;
  price: number; // mapped to unitCost on submit
  total: number;
  taxRate?: number;
  taxAmount?: number;
};

type PurchaseFormData = {
  partyId: string;
  contactId?: string;
  items: PurchaseItem[];
  purchaseDate: Date;
  purchaseStatus: 'pending' | 'approved' | 'cancelled';
  discount: number;
};

interface PurchaseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, id?: string) => Promise<void>;
  defaultValues?: IPurchase | null;
}

export function PurchaseForm({ isOpen, onClose, onSubmit, defaultValues }: PurchaseFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, isDirty }
  } = useForm<PurchaseFormData>({
    defaultValues: {
      partyId: "",
      contactId: undefined,
      items: [{ itemId: '', description: '', quantity: 1, price: 0, total: 0, taxRate: 0, taxAmount: 0 }],
      purchaseDate: new Date(),
      discount: 0,
      purchaseStatus: 'pending',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const [availableItems, setAvailableItems] = useState<ItemApiData[]>([]);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const watchedItems = watch("items");
  const discount = watch("discount");

  const isEditMode = !!defaultValues?._id;

  // Calculate totals
  const grossTotal = watchedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const subtotal = Math.max(grossTotal - (Number(discount) || 0), 0);
  const vatAmount = watchedItems.reduce((sum, item) => sum + (Number((item as any).taxAmount) || 0), 0);
  const grandTotal = subtotal + vatAmount;
  const totalItems = watchedItems.filter(item => item.description).length;

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/items?types=material");
      if (res.ok) {
        const data: ItemApiData[] = await res.json();
        setAvailableItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (defaultValues) {
        const partyIdValue = typeof defaultValues.partyId === 'object'
          ? (defaultValues.partyId as any)._id
          : defaultValues.partyId;

        reset({
          partyId: partyIdValue || "",
          contactId: defaultValues.contactId?.toString() || undefined,
          items: defaultValues.items ? defaultValues.items.map((it: any) => ({
            itemId: it.itemId?.toString() || '',
            description: it.description || '',
            quantity: it.quantity ?? 1,
            price: it.unitCost ?? 0,
            total: it.total ?? 0,
            taxRate: it.taxRate ?? 0,
            taxAmount: it.taxAmount ?? 0,
          })) : [{ itemId: '', description: '', quantity: 1, price: 0, total: 0, taxRate: 0, taxAmount: 0 }],
          purchaseDate: defaultValues.purchaseDate ? new Date(defaultValues.purchaseDate) : new Date(),
          purchaseStatus: defaultValues.purchaseStatus || 'pending',
          discount: defaultValues.discount || 0,
        });
      } else {
        reset({
          partyId: "",
          contactId: undefined,
          items: [{ itemId: '', description: '', quantity: 1, price: 0, total: 0, taxRate: 0, taxAmount: 0 }],
          purchaseDate: new Date(),
          purchaseStatus: 'pending',
          discount: 0,
        });
      }
    }
  }, [isOpen, defaultValues, reset]);

  const handleFormSubmit = async (data: PurchaseFormData) => {
    if (!data.partyId) {
      toast.error("Please select a supplier (Party)");
      return;
    }

    if (!data.purchaseDate) {
      toast.error("Please select a purchase date");
      return;
    }

    const validItems = data.items.filter(item => item.description?.trim());
    if (validItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const hasInvalidQuantity = validItems.some(item => !item.quantity || Number(item.quantity) <= 0);
    if (hasInvalidQuantity) {
      toast.error("Please enter a valid quantity for all items");
      return;
    }

    const itemsGrossTotal = validItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const discountAmount = Number(data.discount) || 0;

    if (discountAmount < 0) {
      toast.error("Discount cannot be negative");
      return;
    }

    if (discountAmount > itemsGrossTotal) {
      toast.error("Discount cannot exceed gross total");
      return;
    }

    // Calculate amounts with discount
    const calculatedSubtotal = Math.max(itemsGrossTotal - discountAmount, 0);
    const calculatedVatAmount = validItems.reduce((sum, item) => sum + (Number(item.taxAmount) || 0), 0);
    const calculatedGrandTotal = calculatedSubtotal + calculatedVatAmount;

    const submitData = {
      partyId: data.partyId,
      contactId: data.contactId,
      purchaseDate: data.purchaseDate,
      items: validItems.map(item => ({
        itemId: item.itemId || null,
        description: item.description,
        quantity: Number(item.quantity) || 0,
        unitCost: Number(item.price) || 0,
        total: Number(item.total) || 0,
        taxRate: Number(item.taxRate) || 0,
        taxAmount: Number(item.taxAmount) || 0,
      })),
      totalAmount: itemsGrossTotal,
      discount: discountAmount,
      vatAmount: calculatedVatAmount,
      grandTotal: calculatedGrandTotal,
      purchaseStatus: isEditMode ? data.purchaseStatus : 'pending',
      inventoryStatus: isEditMode ? (defaultValues?.inventoryStatus || 'pending') : 'pending',
      paymentStatus: 'pending',
      totalPaid: 0,
      remainingAmount: calculatedGrandTotal,
    };

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    await onSubmit(submitData, submissionId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {defaultValues ? "Edit Purchase" : "Create New Purchase"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.stopPropagation(); handleSubmit(handleFormSubmit)(e); }} className="space-y-6">
          <div className={cn("grid grid-cols-1 gap-4", isEditMode ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
            <div>
              <Controller
                name="partyId"
                control={control}
                render={({ field }) => (
                  <PartyContactSelector
                    value={{ partyId: field.value, contactId: watch('contactId') }}
                    onChange={(val) => {
                      field.onChange(val.partyId);
                      setValue('contactId', val.contactId, { shouldDirty: true });
                    }}
                    allowedRoles={['supplier']}
                    showCreateButton={true}
                    className="w-full"
                    layout="vertical"
                  // disablePartyTypeSelector={isEditMode}
                  // disablePartySelector={isEditMode}
                  />
                )}
              />
            </div>

            {/* Date Field */}
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Controller
                name="purchaseDate"
                control={control}
                render={({ field }) => (
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        ref={field.ref}
                        type="button"
                        variant="outline"
                        className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setDatePopoverOpen(false);
                        }}
                        captionLayout="dropdown"
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>

            {/* Purchase Status Field (Edit Mode Only) */}
            {isEditMode && (
              <div className="space-y-2">
                <Label>Purchase Status</Label>
                <Controller
                  name="purchaseStatus"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full h-9 px-3">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ItemsTable
                priceContext="purchase"
                allowedTypes={['material']}
                items={availableItems}
                onRefreshItems={fetchItems}
                fields={fields}
                control={control as any}
                register={register}
                watch={watch}
                setValue={setValue}
                onAppendItem={() => append({ itemId: '', description: '', quantity: 1, price: 0, total: 0, taxRate: 0, taxAmount: 0 })}
                onRemoveItem={remove}
                fieldName="items"
                isDesktop={true}
                priceLabel="Unit Cost"
              />
            </CardContent>
          </Card>

          {/* Discount */}
          <div className="space-y-2">
            <Label htmlFor="discount">Discount:</Label>
            <Input
              id="discount"
              type="number"
              step="0.01"
              min="0"
              max={grossTotal}
              placeholder="0.00"
              {...register("discount", {
                valueAsNumber: true,
                validate: (value) => {
                  const val = Number(value) || 0;
                  if (val < 0) return "Discount cannot be negative";
                  if (val > grossTotal) return "Discount cannot exceed gross total";
                  return true;
                }
              })}
            />
          </div>

          {/* Totals Summary */}
          <Card className="bg-muted/50">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Items:</span>
                  <span className="font-medium">{totalItems}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Quantity:</span>
                  <span className="font-medium">
                    {watchedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross Total:</span>
                  <span className="font-medium">{formatCurrency(grossTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="font-medium text-destructive">-{formatCurrency(Number(discount) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {vatAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT:</span>
                    <span className="font-medium">{formatCurrency(vatAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-3 border-t">
                  <span className="font-semibold">Grand Total:</span>
                  <span className="text-xl font-bold text-green-600">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (isEditMode && !isDirty)}
            >
              {isSubmitting ? (isEditMode ? (
                <>
                  <Spinner />
                  Updating...
                </>
              ) : (
                <>
                  <Spinner />
                  Creating...
                </>
              )) : (isEditMode ? "Update Purchase" : "Create Purchase")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}