// app/sales/quotations/quotation-form.tsx - MINIMAL CHANGES: Event propagation fix + Self-contained ItemsTable

"use client";

import React, { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { FileText, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Quotation } from "./columns";
import { formatCurrency } from "@/utils/formatters/currency";
import { Spinner } from "@/components/ui/spinner";
import { PartyContactSelector } from "@/components/PartyContactSelector";
import { ItemsTable } from "@/components/ItemsTable";

/** Minimal item shape returned from /api/items */
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

type QuotationItem = {
  itemId?: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
  taxRate?: number;      // stored snapshot — needed to recompute taxAmount when qty/price change
  taxAmount?: number;    // pre-computed tax for this line — VATtotal = sum(taxAmount)
  shouldCreateProduct?: boolean;
};

type QuotationFormData = {
  partyId: string;
  contactId?: string;
  items: QuotationItem[];
  discount: number;
  notes: string;
  quotationDate: Date;
  status: 'pending' | 'sent' | 'approved' | 'cancelled' | 'converted';
};

interface QuotationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, id?: string) => Promise<void>;
  defaultValues?: Quotation | null;
}

export function QuotationForm({ isOpen, onClose, onSubmit, defaultValues }: QuotationFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, isDirty }
  } = useForm<QuotationFormData>({
    defaultValues: {
      partyId: "",
      contactId: undefined,
      items: [{ itemId: "", description: "", quantity: 1, price: 0, total: 0, taxRate: 0, taxAmount: 0 }],
      discount: 0,
      notes: "",
      quotationDate: new Date(),
      status: 'pending',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const [itemCatalog, setItemCatalog] = useState<ItemApiData[]>([]);
  const [itemTypes, setItemTypes] = useState<string[]>([]); // distinct categories/types for ItemsTable
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  const watchedItems = watch("items");
  const discount = watch("discount");
  const isEditMode = !!defaultValues?._id;

  const grossTotal = watchedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const subTotal = Math.max(grossTotal - (Number(discount) || 0), 0);
  // VAT = simple sum of per-line taxAmount snapshots (no rate lookup, no fallback)
  const vatAmount = watchedItems.reduce((sum, item) =>
    sum + (Number((item as any).taxAmount) || 0), 0);
  const grandTotal = subTotal + vatAmount;
  const totalItems = watchedItems.filter(item => item.description).length;

  // Fetch from unified /api/items — ?types=product matches ['product'] AND ['product','material']
  const fetchItems = async () => {
    try {
      const res = await fetch("/api/items?types=product");
      if (res.ok) {
        const data: ItemApiData[] = await res.json();
        setItemCatalog(data);
        const types = Array.from(new Set(data.map(p => p.category).filter(Boolean))) as string[];
        setItemTypes(types);
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
          ? defaultValues.partyId._id
          : defaultValues.partyId;

        reset({
          partyId: partyIdValue || "",
          contactId: defaultValues.contactId?.toString() || undefined,
          items: defaultValues.items?.map((it: any) => ({
            itemId: it.itemId?.toString() || '',
            description: it.description || '',
            quantity: it.quantity ?? 1,
            price: it.rate ?? it.price ?? 0,
            total: it.total ?? 0,
            taxRate: it.taxRate ?? 0,
            taxAmount: it.taxAmount ?? 0,
          })) || [{ itemId: "", description: "", quantity: 1, price: 0, total: 0, taxRate: 0, taxAmount: 0 }],
          discount: defaultValues.discount || 0,
          notes: defaultValues.notes || "",
          quotationDate: defaultValues.quotationDate ? new Date(defaultValues.quotationDate) : new Date(),
          status: defaultValues.status || 'pending',
        });
      } else {
        reset({
          partyId: "",
          contactId: undefined,
          items: [{ itemId: "", description: "", quantity: 1, price: 0, total: 0, taxRate: 0, taxAmount: 0 }],
          discount: 0,
          notes: "",
          quotationDate: new Date(),
          status: 'pending',
        });
      }
    }
  }, [isOpen, defaultValues, reset]);

  const handleFormSubmit = async (data: QuotationFormData) => {
    if (!data.partyId) {
      toast.error("Please select a customer (Party)");
      return;
    }

    if (!data.quotationDate) {
      toast.error("Please select a quotation date");
      return;
    }

    const validItems = data.items.filter(item => item.description);
    if (validItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const calculatedGrossTotal = validItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    if (data.discount > calculatedGrossTotal) {
      toast.error("Discount cannot exceed gross total");
      return;
    }

    // Totals: VAT is sum of per-line taxAmount
    const finalGrossTotal = calculatedGrossTotal;
    const finalSubTotal = Math.max(finalGrossTotal - (Number(data.discount) || 0), 0);
    const finalVatAmount = validItems.reduce((sum, item) =>
      sum + (Number((item as any).taxAmount) || 0), 0);
    const finalGrandTotal = finalSubTotal + finalVatAmount;

    const submitData = {
      partyId: data.partyId,
      contactId: data.contactId,
      quotationDate: data.quotationDate,
      items: validItems.map(item => ({
        itemId: item.itemId || '',
        description: item.description,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.price) || 0,
        total: Number(item.total) || 0,
        taxRate: Number((item as any).taxRate) || 0,
        taxAmount: Number((item as any).taxAmount) || 0,
      })),
      discount: Number(data.discount) || 0,
      notes: data.notes,
      status: isEditMode ? data.status : "pending",
      totalAmount: finalGrossTotal,
      vatAmount: finalVatAmount,
      grandTotal: finalGrandTotal,
    };

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    await onSubmit(submitData, submissionId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditMode ? "Edit Quotation" : "Create Quotation"}
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
                    allowedRoles={['customer']}
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
              <Label>Quotation Date</Label>
              <Controller
                name="quotationDate"
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

            {/* Status Field (Edit Mode Only) */}
            {isEditMode && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
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
                allowedTypes={['product']}
                items={itemCatalog}
                onRefreshItems={fetchItems}
                fields={fields}
                control={control as any}
                register={register}
                watch={watch}
                setValue={setValue}
                onAppendItem={() => append({ itemId: "", description: "", quantity: 1, price: 0, total: 0 })}
                onRemoveItem={remove}
                fieldName="items"
                isDesktop={isDesktop}
                priceLabel="Rate"
              />
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="discount">Discount</Label>
            <Input
              id="discount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("discount", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any relevant notes..."
              {...register("notes")}
              rows={3}
            />
          </div>

          <Card className="bg-muted/50">
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Items:</span>
                  <span className="font-medium">{totalItems}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gross Total:</span>
                  <span className="font-medium">{formatCurrency(grossTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="font-medium text-destructive">-{formatCurrency(Number(discount) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Calculated VAT:</span>
                  <span className="font-medium">{formatCurrency(vatAmount)}</span>
                </div>
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
              )) : (isEditMode ? "Update Quotation" : "Create Quotation")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}