// app/sales/invoices/invoice-form.tsx
// UPDATED: Uses unified Item model (replaces old Product model)
// Key changes:
//   - Fetches from /api/items (not /api/products)
//   - InvoiceItem uses `itemId` and `price` internally (not `rate`)
//   - `price` is mapped → `rate` on submit so the API/DB field name is unchanged
//   - `rate` is mapped → `price` when loading an existing invoice for editing

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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronsUpDown, Check, FileText, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import type { Invoice } from "./columns";
import { formatCurrency } from "@/utils/formatters/currency";
import { Spinner } from "@/components/ui/spinner";
import { PartyContactSelector } from "@/components/shared/PartyContactSelector";
import { ItemsTable } from "@/components/shared/ItemsTable";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Internal form item — uses `price` (not `rate`) so ItemsTable's field binding works
 * correctly. The `price` field is mapped back to `rate` on submit.
 */
type InvoiceItem = {
  /** References the unified Item model (_id). */
  itemId?: string;
  description: string;
  quantity: number;
  /** Internal form field name used by ItemsTable. Mapped to `rate` on submit. */
  price: number;
  total: number;
  /** Tax rate snapshot stored per line — needed to recompute taxAmount when qty/price change */
  taxRate?: number;
  /** Pre-computed tax for this line — VATtotal = sum(taxAmount) */
  taxAmount?: number;
};

type InvoiceFormData = {
  partyId: string;
  contactId?: string;
  items: InvoiceItem[];
  discount: number;
  notes: string;
  invoiceDate: Date;
  status: 'pending' | 'approved' | 'cancelled';
};

/** Minimal item shape returned from /api/items — matches ItemsTable's ItemData */
interface ItemApiData {
  _id: string;
  name: string;
  sellingPrice: number;
  costPrice: number;
  unit?: string;
  category?: string;
  types: string[];
  taxRate?: number;
  taxType?: string;
}


interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, id?: string) => Promise<void>;
  defaultValues?: Invoice | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise a line item coming from the DB/API into the internal form shape. */
function normaliseLineItem(item: any): InvoiceItem {
  return {
    itemId: item.itemId?.toString() || '',
    description: item.description ?? '',
    quantity: item.quantity ?? 1,
    price: item.price ?? item.rate ?? 0,
    total: item.total ?? 0,
    taxRate: item.taxRate ?? 0,
    taxAmount: item.taxAmount ?? 0,
  };
}

/** Empty line item used when appending a new row. */
const emptyItem = (): InvoiceItem => ({
  itemId: '',
  description: '',
  quantity: 1,
  price: 0,
  total: 0,
  taxRate: 0,
  taxAmount: 0,
});

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function InvoiceForm({ isOpen, onClose, onSubmit, defaultValues }: InvoiceFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, isDirty }
  } = useForm<InvoiceFormData>({
    defaultValues: {
      partyId: "",
      contactId: undefined,
      items: [emptyItem()],
      discount: 0,
      notes: "",
      invoiceDate: new Date(),
      status: 'pending',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const [items, setItems] = useState<ItemApiData[]>([]);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const watchedItems = watch("items");
  const partyId = watch("partyId");
  const discount = watch("discount");

  const isEditMode = !!defaultValues?._id;

  // Calculate totals
  const grossTotal = watchedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const subTotal = Math.max(grossTotal - (Number(discount) || 0), 0);

  // VAT = simple sum of per-line taxAmount snapshots (no rate lookup, no fallback)
  const vatAmount = watchedItems.reduce((sum, item) =>
    sum + (Number((item as any).taxAmount) || 0), 0);

  const grandTotal = subTotal + vatAmount;
  const totalItems = watchedItems.filter(item => item.description).length;

  // ── Fetch items (product type only) ────────────────────────────────────────
  const fetchItems = async () => {
    try {
      // Fetch only product-type items; ItemsTable will also client-filter via allowedTypes
      const res = await fetch("/api/items?types=product");
      if (res.ok) {
        const data: ItemApiData[] = await res.json();
        setItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch items:", error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);


  // ── Populate form when modal opens / defaultValues change ─────────────────
  useEffect(() => {
    if (isOpen) {
      if (defaultValues) {
        const partyIdValue = typeof defaultValues.partyId === 'object'
          ? defaultValues.partyId._id
          : defaultValues.partyId;

        reset({
          partyId: partyIdValue || "",
          contactId: defaultValues.contactId?.toString() || undefined,
          // Map DB `rate` → form `price`
          items: (defaultValues.items ?? [emptyItem()]).map(normaliseLineItem),
          discount: defaultValues.discount || 0,
          notes: defaultValues.notes || "",
          invoiceDate: defaultValues.invoiceDate ? new Date(defaultValues.invoiceDate) : new Date(),
          status: defaultValues.status || 'pending',
        });
      } else {
        reset({
          partyId: "",
          contactId: undefined,
          items: [emptyItem()],
          discount: 0,
          notes: "",
          invoiceDate: new Date(),
          status: 'pending',
        });
      }
    }
  }, [isOpen, defaultValues, reset]);


  // ── Form submit ────────────────────────────────────────────────────────────
  const handleFormSubmit = async (data: InvoiceFormData) => {
    if (!data.partyId) {
      toast.error("Please select a customer (Party)");
      return;
    }
    if (!data.invoiceDate) {
      toast.error("Please select an invoice date");
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

    const submitData = {
      partyId: data.partyId,
      contactId: data.contactId,
      invoiceDate: data.invoiceDate,
      items: validItems.map(item => ({
        itemId: item.itemId || undefined,
        description: item.description,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.price) || 0,
        total: Number(item.total) || 0,
        taxRate: Number((item as any).taxRate) || 0,
        taxAmount: Number((item as any).taxAmount) || 0,
      })),
      discount: Number(data.discount) || 0,
      totalAmount: grossTotal,
      vatAmount: vatAmount,
      grandTotal: grandTotal,
      notes: data.notes,
      status: isEditMode ? data.status : "pending",
      connectedDocuments: {},
    };

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    await onSubmit(submitData, submissionId);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditMode ? "Edit Invoice" : "Create Invoice"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.stopPropagation(); handleSubmit(handleFormSubmit)(e); }} className="space-y-6">
          <div className={cn("grid grid-cols-1 gap-4", isEditMode ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
            {/* Party / Contact selector */}
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
                  />
                )}
              />
            </div>

            {/* Invoice Date */}
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Controller
                name="invoiceDate"
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

            {/* Status (edit mode only) */}
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
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>


          {/* Items table — uses unified Item model, sale price context */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ItemsTable
                items={items}
                allowedTypes={['product']}
                priceContext="sale"
                fields={fields}
                control={control as any}
                register={register}
                watch={watch}
                setValue={setValue}
                onAppendItem={() => append(emptyItem())}
                onRemoveItem={remove}
                onRefreshItems={fetchItems}
                fieldName="items"
                isDesktop={isDesktop}
              />
            </CardContent>
          </Card>

          {/* Discount */}
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

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any relevant notes..."
              {...register("notes")}
              rows={3}
            />
          </div>

          {/* Totals summary */}
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
              {isSubmitting ? (
                <>
                  <Spinner />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : (
                isEditMode ? "Update Invoice" : "Create Invoice"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}