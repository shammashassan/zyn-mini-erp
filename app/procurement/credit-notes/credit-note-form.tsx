// app/procurement/credit-notes/credit-note-form.tsx - UPDATED: ItemsTable integration & Event Propagation

"use client";

import React, { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarIcon,
  ChevronsUpDown,
  Check,
  FileText,
  AlertCircle,
  List,
  Calculator
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { CreditNote } from "./columns";
import type { IProduct } from "@/models/Product";
import { formatCurrency } from "@/utils/formatters/currency";
import { UAE_VAT_PERCENTAGE } from "@/utils/constants";
import { Spinner } from "@/components/ui/spinner";
import { ItemsTable } from "@/components/ItemsTable";
import { PartyContactSelector } from "@/components/PartyContactSelector";

type CreditNoteMode = 'items' | 'manual';

type CreditNoteItem = {
  productId: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
  shouldCreateProduct?: boolean; // Flag to indicate if product should be created on submit
};

type CreditNoteFormData = {
  partyId: string;
  contactId?: string;
  returnNoteId?: string;
  items: CreditNoteItem[];
  creditDate: Date;
  reason: string;
  notes?: string;
  status: 'pending' | 'approved' | 'cancelled';
  discount: number;
  isTaxPayable: boolean;
  creditType: 'return' | 'adjustment' | 'standalone';
  creditMode: CreditNoteMode;
  manualAmount?: number;
  manualDescription?: string;
};

interface CreditNoteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, id?: string) => Promise<void>;
  defaultValues?: CreditNote | null;
  returnNoteData?: any;
}

export function CreditNoteForm({ isOpen, onClose, onSubmit, defaultValues, returnNoteData }: CreditNoteFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, isDirty }
  } = useForm<CreditNoteFormData>({
    defaultValues: {
      items: [{ productId: '', description: '', quantity: 1, price: 0, total: 0 }],
      discount: 0,
      isTaxPayable: true,
      status: 'pending',
      creditType: 'standalone',
      creditMode: 'items',
      manualAmount: 0,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const [products, setProducts] = useState<IProduct[]>([]);
  const [productTypes, setProductTypes] = useState<string[]>([]);
  const [returnNotes, setReturnNotes] = useState<any[]>([]);
  const [returnNotePopoverOpen, setReturnNotePopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [selectedPartyType, setSelectedPartyType] = useState<'customer' | 'supplier'>('customer');

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  const watchedItems = watch("items");
  const discount = watch("discount") || 0;
  const isTaxPayable = watch("isTaxPayable");
  const partyId = watch("partyId");
  const creditMode = watch("creditMode");
  const manualAmount = watch("manualAmount") || 0;
  const selectedReturnNoteId = watch("returnNoteId");

  const isEditMode = !!defaultValues?._id;
  const isFromReturnNote = !!returnNoteData;

  // Calculate totals
  const grossTotal = creditMode === 'items'
    ? watchedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
    : (manualAmount || 0);
  const subtotal = grossTotal - discount;
  const vatAmount = isTaxPayable ? subtotal * (UAE_VAT_PERCENTAGE / 100) : 0;
  const grandTotal = subtotal + vatAmount;
  const totalItems = creditMode === 'items' ? watchedItems.filter(item => item.productId).length : 1;

  // Fetch products and extract types
  const fetchProducts = async () => {
    try {
      const productsRes = await fetch("/api/products");
      if (productsRes.ok) {
        const productsData = await productsRes.json();
        setProducts(productsData);

        // Extract unique types
        const types = Array.from(new Set(productsData.map((p: IProduct) => p.type).filter(Boolean))) as string[];
        setProductTypes(types);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ✅ FIX: Fetch approved sales return notes based on partyId
  useEffect(() => {
    const fetchReturnNotes = async () => {
      if (!partyId) {
        setReturnNotes([]);
        return;
      }

      try {
        const params = new URLSearchParams({
          returnType: 'salesReturn',
          partyId: partyId,
          status: 'approved',
          excludeLinked: 'true'
        });

        if (defaultValues?.connectedDocuments?.returnNoteId) {
          const rawId = defaultValues.connectedDocuments.returnNoteId;
          const returnNoteId = typeof rawId === 'object' && rawId !== null && '_id' in rawId
            ? (rawId as any)._id.toString()
            : rawId.toString();

          params.append('includeId', returnNoteId);
        }

        const res = await fetch(`/api/return-notes?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setReturnNotes(data);
        }
      } catch (error) {
        console.error("Failed to fetch return notes:", error);
      }
    };

    fetchReturnNotes();
  }, [partyId, defaultValues]);

  useEffect(() => {
    if (isOpen) {
      if (returnNoteData) {
        // Creating from return note
        const itemsFromReturn = returnNoteData.items.map((item: any) => {
          const product = products.find(p => p._id === item.productId);
          const price = item.rate || product?.price || 0;
          return {
            productId: item.productId,
            description: item.productName,
            quantity: item.returnQuantity,
            price: price,
            total: item.returnQuantity * price,
          };
        });

        // Extract party/contact IDs from return note
        const partyIdValue = typeof returnNoteData.partyId === 'object'
          ? returnNoteData.partyId._id
          : returnNoteData.partyId;

        setSelectedPartyType('customer');
        reset({
          partyId: partyIdValue || "",
          contactId: returnNoteData.contactId?.toString() || undefined,
          items: itemsFromReturn.length > 0 ? itemsFromReturn : [{ productId: '', description: '', quantity: 1, price: 0, total: 0 }],
          creditDate: new Date(),
          reason: `Return Note: ${returnNoteData.returnNumber} - ${returnNoteData.reason}`,
          notes: returnNoteData.notes || '',
          status: 'pending',
          discount: 0,
          isTaxPayable: true,
          creditType: 'return',
          creditMode: 'items',
        });
      } else if (defaultValues) {
        // Editing existing credit note
        const isManualEntry = defaultValues.items?.length === 1 && !(defaultValues.items[0] as any).productId;
        const detectedMode: CreditNoteMode = isManualEntry ? 'manual' : 'items';

        // Extract party/contact IDs
        const partyIdValue = typeof defaultValues.partyId === 'object'
          ? (defaultValues.partyId as any)._id
          : defaultValues.partyId;

        // Infer party type from the populated partyId.roles object
        const partyRoles = typeof defaultValues.partyId === 'object' && defaultValues.partyId !== null
          ? (defaultValues.partyId as any).roles
          : null;
        const inferredPartyType: 'customer' | 'supplier' =
          partyRoles?.supplier ? 'supplier' : 'customer';
        setSelectedPartyType(inferredPartyType);

        reset({
          partyId: partyIdValue || "",
          contactId: defaultValues.contactId?.toString() || undefined,
          items: defaultValues.items || [{ productId: '', description: '', quantity: 1, price: 0, total: 0 }],
          creditDate: defaultValues.creditDate ? new Date(defaultValues.creditDate) : new Date(),
          reason: defaultValues.reason || "",
          notes: defaultValues.notes || "",
          status: defaultValues.status || 'pending',
          discount: defaultValues.discount || 0,
          isTaxPayable: defaultValues.isTaxPayable !== undefined ? defaultValues.isTaxPayable : true,
          creditType: defaultValues.creditType || 'standalone',
          creditMode: detectedMode,
          manualAmount: isManualEntry ? defaultValues.items[0].total : 0,
          manualDescription: isManualEntry ? defaultValues.items[0].description : '',
          returnNoteId: defaultValues.connectedDocuments?.returnNoteId
            ? (typeof defaultValues.connectedDocuments.returnNoteId === 'object'
              ? (defaultValues.connectedDocuments.returnNoteId as any)._id
              : defaultValues.connectedDocuments.returnNoteId)
            : undefined,
        });
      } else {
        // Creating new credit note
        setSelectedPartyType('customer');
        reset({
          partyId: "",
          contactId: undefined,
          items: [{ productId: '', description: '', quantity: 1, price: 0, total: 0 }],
          creditDate: new Date(),
          reason: "",
          notes: "",
          status: 'pending',
          discount: 0,
          isTaxPayable: true,
          creditType: 'standalone',
          creditMode: 'items',
          manualAmount: 0,
        });
      }
    }
  }, [isOpen, defaultValues, returnNoteData, products, reset]);

  // Handle return note select - keeping simplified
  const handleReturnNoteSelect = (returnNote: any) => {
    setValue("returnNoteId", returnNote._id, { shouldDirty: true });
    setReturnNotePopoverOpen(false);

    // Try ID matching first, fall back to name matching for old data
    const itemsFromReturn = returnNote.items.map((item: any) => {
      let matchedProduct = products.find(p => p._id === item.productId);

      if (!matchedProduct) {
        const productName = item.productName || item.description;
        matchedProduct = products.find(p =>
          p.name.toLowerCase().trim() === productName?.toLowerCase().trim()
        );
      }

      const productName = item.productName || item.description;
      const price = item.rate || matchedProduct?.price || 0;
      const total = item.total || (item.returnQuantity * price);

      return {
        productId: item.productId || matchedProduct?._id || '',
        description: productName || '',
        quantity: item.returnQuantity || 0,
        price: price,
        total: total,
      };
    });

    setValue("items", itemsFromReturn);
    setValue("reason", `Return Note: ${returnNote.returnNumber} - ${returnNote.reason}`);
    setValue("notes", returnNote.notes || '');
    setValue("creditType", 'return');
  };

  const handleFormSubmit = async (data: CreditNoteFormData) => {
    // ✅ Validation
    if (!data.partyId) {
      toast.error("Please select a party");
      return;
    }

    if (!data.creditDate) {
      toast.error("Please select a credit note date");
      return;
    }

    if (!data.reason || !data.reason.trim()) {
      toast.error("Please provide a reason for this credit note");
      return;
    }

    let validItems: any[] = [];
    let itemsGrossTotal = 0;

    if (data.creditMode === 'manual') {
      if (!data.manualAmount || data.manualAmount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      if (!data.manualDescription || !data.manualDescription.trim()) {
        toast.error("Please provide a description");
        return;
      }

      validItems = [{
        productId: '',
        description: data.manualDescription.trim(),
        quantity: 1,
        price: data.manualAmount,
        total: data.manualAmount
      }];
      itemsGrossTotal = data.manualAmount;
    } else {
      // Allow items with either productId OR description (for deferred product creation)
      validItems = data.items.filter(item => item.productId || (item.description && item.description.trim()));
      if (validItems.length === 0) {
        toast.error("Please add at least one product");
        return;
      }

      const hasInvalidQuantity = validItems.some(item => !item.quantity || Number(item.quantity) <= 0);
      if (hasInvalidQuantity) {
        toast.error("Please enter a valid quantity for all items");
        return;
      }

      itemsGrossTotal = validItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    }

    const discountAmount = Number(data.discount) || 0;

    if (discountAmount < 0) {
      toast.error("Discount cannot be negative");
      return;
    }

    if (discountAmount > itemsGrossTotal) {
      toast.error("Discount cannot exceed gross total");
      return;
    }

    const calculatedSubtotal = itemsGrossTotal - discountAmount;
    const calculatedVatAmount = data.isTaxPayable ? calculatedSubtotal * (UAE_VAT_PERCENTAGE / 100) : 0;
    const calculatedGrandTotal = calculatedSubtotal + calculatedVatAmount;

    const submitData: any = {
      partyId: data.partyId,
      partyType: selectedPartyType,
      contactId: data.contactId,
      items: validItems.map(item => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        total: Number(item.total) || 0
      })),
      totalAmount: itemsGrossTotal,
      discount: discountAmount,
      isTaxPayable: data.isTaxPayable,
      vatAmount: calculatedVatAmount,
      grandTotal: calculatedGrandTotal,
      creditDate: data.creditDate,
      reason: data.reason.trim(),
      notes: data.notes?.trim() || "",
      status: isEditMode ? data.status : 'pending',
      creditType: data.creditType,
    };

    // Add return note if selected
    if (data.returnNoteId) {
      const selectedReturnNote = returnNotes.find(rn => rn._id === data.returnNoteId);
      if (selectedReturnNote) {
        submitData.returnNoteId = selectedReturnNote._id;
        submitData.returnNumber = selectedReturnNote.returnNumber;
        submitData.creditType = 'return';
      }
    } else if (returnNoteData && returnNoteData._id) {
      submitData.returnNoteId = returnNoteData._id;
      submitData.returnNumber = returnNoteData.returnNumber;
      submitData.creditType = 'return';
    }

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    await onSubmit(submitData, submissionId);
  };

  const selectedReturnNote = returnNotes.find(rn => rn._id === selectedReturnNoteId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isFromReturnNote
              ? `Create Credit Note from Return Note ${returnNoteData?.returnNumber}`
              : defaultValues ? "Edit Credit Note" : "Create New Credit Note"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => { e.stopPropagation(); handleSubmit(handleFormSubmit)(e); }} className="space-y-6">
          {isFromReturnNote && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Creating from Return Note
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Items and quantities are pre-filled. You can adjust prices if needed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top Row: Party and Date */}
          <div className={cn("grid grid-cols-1 gap-4", isEditMode ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
            {/* ✅ Party Field - PartyContactSelector */}
            <div>
              <Controller
                name="partyId"
                control={control}
                render={({ field }) => (
                  <PartyContactSelector
                    value={{ partyId: field.value, contactId: watch('contactId'), partyType: selectedPartyType }}
                    onChange={(val) => {
                      field.onChange(val.partyId);
                      setValue('contactId', val.contactId, { shouldDirty: true });
                      if (val.partyType) setSelectedPartyType(val.partyType as 'customer' | 'supplier');
                    }}
                    allowedRoles={['customer', 'supplier']}
                    showCreateButton={true}
                    className="w-full"
                    layout="vertical"
                  />
                )}
              />
            </div>

            {/* Credit Date */}
            <div className="space-y-2">
              <Label>Credit Date</Label>
              <Controller
                name="creditDate"
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

            {/* Status Field (only in edit mode) */}
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

          {/* Return Note Selection (Only shows when party selected and return notes available) */}
          {!isFromReturnNote && returnNotes.length > 0 && (
            <div className="space-y-2">
              <Label>Link to Return Note (Optional)</Label>
              <Controller
                name="returnNoteId"
                control={control}
                render={({ field }) => (
                  <Popover open={returnNotePopoverOpen} onOpenChange={setReturnNotePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        ref={field.ref}
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {selectedReturnNote
                          ? `${selectedReturnNote.returnNumber} - ${selectedReturnNote.reason}`
                          : "Select return note (optional)..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search return notes..." />
                        <CommandList
                          className="max-h-[200px] overflow-y-auto"
                          onWheel={(e) => e.stopPropagation()}
                          onTouchStart={(e) => e.stopPropagation()}
                          onTouchMove={(e) => e.stopPropagation()}
                        >
                          <CommandEmpty>No approved return notes found.</CommandEmpty>
                          <CommandGroup>
                            {returnNotes.map((returnNote) => (
                              <CommandItem
                                key={returnNote._id}
                                value={returnNote.returnNumber}
                                onSelect={() => handleReturnNoteSelect(returnNote)}
                              >
                                <Check className={cn("mr-2 h-4 w-4", field.value === returnNote._id ? "opacity-100" : "opacity-0")} />
                                <div className="flex-1">
                                  <div className="font-medium">{returnNote.returnNumber}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {returnNote.items?.length || 0} items • {returnNote.reason}
                                  </div>
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
              {selectedReturnNote && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900 text-xs">
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    Linked to Return Note: {selectedReturnNote.returnNumber}
                  </div>
                  <div className="text-muted-foreground mt-1">
                    Products will be auto-filled from this return note
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason <span className="text-destructive">*</span></Label>
            <Textarea
              id="reason"
              placeholder="Enter reason for credit note..."
              {...register("reason")}
              rows={2}
            />
          </div>

          {/* Tax Payable */}
          <Label
            htmlFor="isTaxPayable"
            className={cn(
              "hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
              isTaxPayable && "border-green-600 bg-green-50 dark:border-green-900 dark:bg-green-950"
            )}
          >
            <div className="grid gap-1.5 font-normal flex-1">
              <p className="text-sm leading-none font-medium">
                {isTaxPayable ? "Tax Payable" : "Tax Free"}
              </p>
              <p className="text-muted-foreground text-sm">
                {isTaxPayable ? `${UAE_VAT_PERCENTAGE}% VAT will be added to the subtotal` : 'No VAT will be applied to this credit note'}
              </p>
            </div>
            <Controller
              name="isTaxPayable"
              control={control}
              render={({ field }) => (
                <Checkbox
                  id="isTaxPayable"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:border-green-600 data-[state=checked]:bg-green-600 data-[state=checked]:text-white dark:data-[state=checked]:border-green-700 dark:data-[state=checked]:bg-green-700"
                />
              )}
            />
          </Label>

          {/* Items/Manual Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">
                {creditMode === 'items' ? 'Products' : 'Amount Details'}
              </CardTitle>
              {!isFromReturnNote && (
                <Controller
                  name="creditMode"
                  control={control}
                  render={({ field }) => (
                    <Tabs value={field.value} onValueChange={field.onChange} className="w-[250px]">
                      <TabsList className="grid w-full grid-cols-2 h-9">
                        <TabsTrigger value="items" className="text-xs">
                          <List className="mr-2 h-3.5 w-3.5" />
                          Item List
                        </TabsTrigger>
                        <TabsTrigger value="manual" className="text-xs">
                          <Calculator className="mr-2 h-3.5 w-3.5" />
                          Manual
                        </TabsTrigger>
                      </TabsList>
                    </Tabs>
                  )}
                />
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {creditMode === 'manual' && (
                <div className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="manualDescription">Description <span className="text-destructive">*</span></Label>
                    <Input
                      id="manualDescription"
                      placeholder="Enter description or reason..."
                      {...register("manualDescription")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manualAmount">Amount <span className="text-destructive">*</span></Label>
                    <Input
                      id="manualAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...register("manualAmount", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              )}

              {/* Items Mode - Using ItemsTable */}
              {creditMode === 'items' && (
                <div className="animate-in fade-in-50 duration-300">
                  <ItemsTable
                    itemType="product"
                    items={products}
                    onRefreshItems={fetchProducts}
                    existingTypes={productTypes}
                    fields={fields}
                    control={control as any}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    onAppendItem={() => append({ productId: '', description: '', quantity: 1, price: 0, total: 0 })}
                    onRemoveItem={remove}
                    fieldName="items"
                    isDesktop={isDesktop}
                    priceLabel="Price"
                  />
                </div>
              )}
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
              max={grossTotal}
              placeholder="0.00"
              {...register("discount", { valueAsNumber: true })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional notes..."
              {...register("notes")}
              rows={3}
            />
          </div>

          {/* Summary Card */}
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
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount:</span>
                    <span className="font-medium text-destructive">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm pt-2">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {isTaxPayable && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT ({UAE_VAT_PERCENTAGE}%):</span>
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
              {isSubmitting ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (defaultValues ? "Update Credit Note" : "Create Credit Note")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}