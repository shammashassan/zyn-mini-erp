// app/sales/debit-notes/debit-note-form.tsx - UPDATED: ItemsTable integration & Event Propagation

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
import type { DebitNote } from "./columns";
import type { IMaterial } from "@/models/Material";
import { formatCurrency } from "@/utils/formatters/currency";
import { UAE_VAT_PERCENTAGE } from "@/utils/constants";
import { Spinner } from "@/components/ui/spinner";
import { ItemsTable } from "@/components/ItemsTable";
import { PartyContactSelector } from "@/components/PartyContactSelector";

type DebitNoteMode = 'items' | 'manual';

type DebitNoteItem = {
  materialId: string;
  materialName: string;
  quantity: number;
  unitCost: number;
  total: number;
};

type DebitNoteFormData = {
  partyId: string;
  contactId?: string;
  returnNoteId?: string;
  items: DebitNoteItem[];
  debitDate: Date;
  reason: string;
  notes?: string;
  status: 'pending' | 'approved' | 'cancelled';
  discount: number;
  isTaxPayable: boolean;
  debitType: 'return' | 'adjustment' | 'standalone';
  debitMode: DebitNoteMode;
  manualAmount?: number;
  manualDescription?: string;
};

interface DebitNoteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, id?: string) => Promise<void>;
  defaultValues?: DebitNote | null;
  returnNoteData?: any;
}

export function DebitNoteForm({
  isOpen,
  onClose,
  onSubmit,
  defaultValues,
  returnNoteData
}: DebitNoteFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, isDirty }
  } = useForm<DebitNoteFormData>({
    defaultValues: {
      partyId: "",
      contactId: undefined,
      items: [{ materialId: '', materialName: '', quantity: 1, unitCost: 0, total: 0 }],
      discount: 0,
      isTaxPayable: true,
      status: 'pending',
      debitType: 'standalone',
      debitMode: 'items',
      manualAmount: 0,
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const [materials, setMaterials] = useState<IMaterial[]>([]);
  const [materialTypes, setMaterialTypes] = useState<string[]>([]);
  const [materialUnits, setMaterialUnits] = useState<string[]>([]);
  const [returnNotes, setReturnNotes] = useState<any[]>([]);
  const [returnNotePopoverOpen, setReturnNotePopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const [selectedPartyType, setSelectedPartyType] = useState<'customer' | 'supplier'>('supplier');

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  const watchedItems = watch("items");
  const discount = watch("discount") || 0;
  const isTaxPayable = watch("isTaxPayable");
  const debitMode = watch("debitMode");
  const manualAmount = watch("manualAmount") || 0;
  const selectedReturnNoteId = watch("returnNoteId");
  const partyId = watch("partyId");

  const isEditMode = !!defaultValues?._id;
  const isFromReturnNote = !!returnNoteData;

  // Calculate totals
  const grossTotal = debitMode === 'items'
    ? watchedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0)
    : (manualAmount || 0);
  const subtotal = grossTotal - discount;
  const vatAmount = isTaxPayable ? subtotal * (UAE_VAT_PERCENTAGE / 100) : 0;
  const grandTotal = subtotal + vatAmount;
  const totalItems = debitMode === 'items' ? watchedItems.filter(item => item.materialId).length : 1;

  // Fetch materials and extract types/units
  const fetchMaterials = async () => {
    try {
      const materialsRes = await fetch("/api/materials");
      if (materialsRes.ok) {
        const materialsData = await materialsRes.json();
        setMaterials(materialsData);

        // Extract unique types and units for the creation form
        const types = Array.from(new Set(materialsData.map((m: IMaterial) => m.type).filter(Boolean))) as string[];
        const units = Array.from(new Set(materialsData.map((m: IMaterial) => m.unit).filter(Boolean))) as string[];
        setMaterialTypes(types);
        setMaterialUnits(units);
      }
    } catch (error) {
      console.error("Failed to fetch materials:", error);
    }
  };

  useEffect(() => {
    fetchMaterials();
  }, []);

  // Fetch approved return notes when party is selected
  useEffect(() => {
    const fetchReturnNotes = async () => {
      if (!partyId) {
        setReturnNotes([]);
        return;
      }

      try {
        const params = new URLSearchParams({
          returnType: 'purchaseReturn',
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
          const material = materials.find(m => m._id === item.materialId);
          const unitCost = item.rate || material?.unitCost || 0;
          return {
            materialId: item.materialId,
            materialName: item.materialName,
            quantity: item.returnQuantity,
            unitCost: unitCost,
            total: item.returnQuantity * unitCost,
          };
        });

        // Extract party/contact IDs from return note
        const partyIdValue = typeof returnNoteData.partyId === 'object'
          ? returnNoteData.partyId._id
          : returnNoteData.partyId;

        setSelectedPartyType('supplier');
        reset({
          partyId: partyIdValue || "",
          contactId: returnNoteData.contactId?.toString() || undefined,
          items: itemsFromReturn.length > 0 ? itemsFromReturn : [{ materialId: '', materialName: '', quantity: 1, unitCost: 0, total: 0 }],
          debitDate: new Date(),
          reason: `Return Note: ${returnNoteData.returnNumber} - ${returnNoteData.reason}`,
          notes: returnNoteData.notes || '',
          status: 'pending',
          discount: 0,
          isTaxPayable: true,
          debitType: 'return',
          debitMode: 'items',
        });
      } else if (defaultValues) {
        // Editing existing debit note
        const isManualEntry = defaultValues.items?.length === 1 && !(defaultValues.items[0] as any).materialId;
        const detectedMode: DebitNoteMode = isManualEntry ? 'manual' : 'items';

        // Extract party/contact IDs
        const partyIdValue = typeof defaultValues.partyId === 'object'
          ? (defaultValues.partyId as any)._id
          : defaultValues.partyId;

        // Infer party type from the populated partyId.roles object
        const partyRoles = typeof defaultValues.partyId === 'object' && defaultValues.partyId !== null
          ? (defaultValues.partyId as any).roles
          : null;
        const inferredPartyType: 'customer' | 'supplier' =
          partyRoles?.customer ? 'customer' : 'supplier';
        setSelectedPartyType(inferredPartyType);

        reset({
          partyId: partyIdValue || "",
          contactId: defaultValues.contactId?.toString() || undefined,
          items: defaultValues.items || [{ materialId: '', materialName: '', quantity: 1, unitCost: 0, total: 0 }],
          debitDate: defaultValues.debitDate ? new Date(defaultValues.debitDate) : new Date(),
          reason: defaultValues.reason || "",
          notes: defaultValues.notes || "",
          status: defaultValues.status || 'pending',
          discount: defaultValues.discount || 0,
          isTaxPayable: defaultValues.isTaxPayable !== undefined ? defaultValues.isTaxPayable : true,
          debitType: defaultValues.debitType || 'standalone',
          debitMode: detectedMode,
          manualAmount: isManualEntry ? defaultValues.items[0].total : 0,
          manualDescription: isManualEntry ? defaultValues.items[0].materialName : '',
          returnNoteId: defaultValues.connectedDocuments?.returnNoteId
            ? (typeof defaultValues.connectedDocuments.returnNoteId === 'object'
              ? (defaultValues.connectedDocuments.returnNoteId as any)._id
              : defaultValues.connectedDocuments.returnNoteId)
            : undefined,
        });
      } else {
        // Creating new debit note
        setSelectedPartyType('supplier');
        reset({
          partyId: "",
          contactId: undefined,
          items: [{ materialId: '', materialName: '', quantity: 1, unitCost: 0, total: 0 }],
          debitDate: new Date(),
          reason: "",
          notes: "",
          status: 'pending',
          discount: 0,
          isTaxPayable: true,
          debitType: 'standalone',
          debitMode: 'items',
          manualAmount: 0,
        });
      }
    }
  }, [isOpen, defaultValues, returnNoteData, materials, reset]);

  const handleReturnNoteSelect = (returnNote: any) => {
    setValue("returnNoteId", returnNote._id, { shouldDirty: true });
    setReturnNotePopoverOpen(false);

    const itemsFromReturn = returnNote.items.map((item: any) => {
      const material = materials.find(m => m._id === item.materialId);
      const unitCost = item.rate || material?.unitCost || 0;
      return {
        materialId: item.materialId,
        materialName: item.materialName,
        quantity: item.returnQuantity,
        unitCost: unitCost,
        total: item.returnQuantity * unitCost,
      };
    });

    setValue("items", itemsFromReturn);
    setValue("reason", `Return Note: ${returnNote.returnNumber} - ${returnNote.reason}`);
    setValue("notes", returnNote.notes || '');
    setValue("debitType", 'return');
  };

  const handleFormSubmit = async (data: DebitNoteFormData) => {
    // ✅ Validation
    if (!data.partyId) {
      toast.error("Please select a party");
      return;
    }

    if (!data.debitDate) {
      toast.error("Please select a debit note date");
      return;
    }

    if (!data.reason || !data.reason.trim()) {
      toast.error("Please provide a reason for this debit note");
      return;
    }

    let validItems: any[] = [];
    let itemsGrossTotal = 0;

    if (data.debitMode === 'manual') {
      if (!data.manualAmount || data.manualAmount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      if (!data.manualDescription || !data.manualDescription.trim()) {
        toast.error("Please provide a description");
        return;
      }

      validItems = [{
        materialId: '',
        materialName: data.manualDescription.trim(),
        quantity: 1,
        unitCost: data.manualAmount,
        total: data.manualAmount
      }];
      itemsGrossTotal = data.manualAmount;
    } else {
      validItems = data.items.filter(item => item.materialId);
      if (validItems.length === 0) {
        toast.error("Please add at least one material");
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
      debitDate: data.debitDate,
      reason: data.reason.trim(),
      notes: data.notes?.trim() || "",
      status: isEditMode ? data.status : 'pending',
      debitType: data.debitType,
    };

    // Add return note if selected
    if (data.returnNoteId) {
      const selectedReturnNote = returnNotes.find(rn => rn._id === data.returnNoteId);
      if (selectedReturnNote) {
        submitData.returnNoteId = selectedReturnNote._id;
        submitData.debitType = 'return';
      }
    } else if (returnNoteData && returnNoteData._id) {
      submitData.returnNoteId = returnNoteData._id;
      submitData.debitType = 'return';
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
              ? `Create Debit Note from Return Note ${returnNoteData?.returnNumber}`
              : defaultValues ? "Edit Debit Note" : "Create New Debit Note"}
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
                    Items and quantities are pre-filled. You can adjust rates if needed.
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
                    allowedRoles={['supplier', 'customer']}
                    showCreateButton={true}
                    className="w-full"
                    layout="vertical"
                  />
                )}
              />
            </div>

            {/* Debit Date */}
            <div className="space-y-2">
              <Label>Debit Date</Label>
              <Controller
                name="debitDate"
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
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    field.value === returnNote._id ? "opacity-100" : "opacity-0"
                                  )}
                                />
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
                    Materials will be auto-filled from this return note
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
              placeholder="Enter reason for debit note..."
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
                {isTaxPayable
                  ? `${UAE_VAT_PERCENTAGE}% VAT will be added to the subtotal`
                  : 'No VAT will be applied to this debit note'}
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

          {/* Combined Entry Details & Materials Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-base">
                {debitMode === 'items' ? 'Materials' : 'Amount Details'}
              </CardTitle>
              {!isFromReturnNote && (
                <Controller
                  name="debitMode"
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
              {/* Manual Mode Inputs */}
              {debitMode === 'manual' && (
                <div className="space-y-4 animate-in fade-in-50 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="manualDescription">
                      Description <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="manualDescription"
                      placeholder="Enter description or reason..."
                      {...register("manualDescription")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manualAmount">
                      Amount <span className="text-destructive">*</span>
                    </Label>
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
              {debitMode === 'items' && (
                <div className="animate-in fade-in-50 duration-300">
                  <ItemsTable
                    itemType="material"
                    items={materials}
                    onRefreshItems={fetchMaterials}
                    existingTypes={materialTypes}
                    existingUnits={materialUnits}
                    fields={fields}
                    control={control}
                    register={register}
                    watch={watch}
                    setValue={setValue}
                    onAppendItem={() => append({ materialId: '', materialName: '', quantity: 1, unitCost: 0, total: 0 })}
                    onRemoveItem={remove}
                    fieldName="items"
                    isDesktop={isDesktop}
                    priceLabel="Unit Cost"
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
                    <span className="font-medium text-destructive">
                      -{formatCurrency(discount)}
                    </span>
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
                  <span className="text-xl font-bold text-red-600">
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
            <Button type="submit" disabled={isSubmitting || (isEditMode && !isDirty)}>
              {isSubmitting ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (
                defaultValues ? "Update Debit Note" : "Create Debit Note"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}