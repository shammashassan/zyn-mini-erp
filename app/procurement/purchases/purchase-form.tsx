// app/procurement/purchases/purchase-form.tsx - FINAL: Using PartyContactSelector, no legacy fields

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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, ChevronsUpDown, Check, Plus, PlusCircle, X, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { IPurchase } from "@/models/Purchase";
import type { IMaterial } from "@/models/Material";
import { formatCurrency } from "@/utils/formatters/currency";
import { UAE_VAT_PERCENTAGE } from "@/utils/constants";
import { Spinner } from "@/components/ui/spinner";
import { ItemsTable } from "@/components/ItemsTable";
import { PartyContactSelector } from "@/components/PartyContactSelector";

type PurchaseItem = {
  materialId: string;
  materialName: string;
  quantity: number;
  unitCost: number;
  total: number;
  shouldCreateMaterial?: boolean;
};

type PurchaseFormData = {
  partyId: string;
  contactId?: string;
  items: PurchaseItem[];
  purchaseDate: Date;
  purchaseStatus: 'pending' | 'approved' | 'cancelled';
  discount: number;
  isTaxPayable: boolean;
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
      items: [{ materialId: '', materialName: '', quantity: 1, unitCost: 0, total: 0 }],
      purchaseDate: new Date(),
      discount: 0,
      isTaxPayable: true,
      purchaseStatus: 'pending',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const [materials, setMaterials] = useState<IMaterial[]>([]);
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
  const isTaxPayable = watch("isTaxPayable");

  const isEditMode = !!defaultValues?._id;

  // Calculate totals
  const grossTotal = watchedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const subtotal = grossTotal - discount;
  const vatAmount = isTaxPayable ? subtotal * (UAE_VAT_PERCENTAGE / 100) : 0;
  const grandTotal = subtotal + vatAmount;
  const totalItems = watchedItems.filter(item => item.materialId).length;

  useEffect(() => {
    const fetchMaterials = async () => {
      try {
        const materialsRes = await fetch("/api/materials");
        if (materialsRes.ok) setMaterials(await materialsRes.json());
      } catch (error) {
        console.error("Failed to fetch materials:", error);
      }
    };
    fetchMaterials();
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (defaultValues) {
        // ✅ Extract party/contact IDs correctly
        const partyIdValue = typeof defaultValues.partyId === 'object'
          ? (defaultValues.partyId as any)._id
          : defaultValues.partyId;

        reset({
          partyId: partyIdValue || "",
          contactId: defaultValues.contactId?.toString() || undefined,
          items: defaultValues.items || [{ materialId: '', materialName: '', quantity: 1, unitCost: 0, total: 0 }],
          purchaseDate: defaultValues.purchaseDate ? new Date(defaultValues.purchaseDate) : new Date(),
          purchaseStatus: defaultValues.purchaseStatus || 'pending',
          discount: defaultValues.discount || 0,
          isTaxPayable: defaultValues.isTaxPayable !== undefined ? defaultValues.isTaxPayable : true,
        });
      } else {
        reset({
          partyId: "",
          contactId: undefined,
          items: [{ materialId: '', materialName: '', quantity: 1, unitCost: 0, total: 0 }],
          purchaseDate: new Date(),
          purchaseStatus: 'pending',
          discount: 0,
          isTaxPayable: true,
        });
      }
    }
  }, [isOpen, defaultValues, reset]);



  const handleFormSubmit = async (data: PurchaseFormData) => {
    // ✅ Validation
    if (!data.partyId) {
      toast.error("Please select a supplier (Party)");
      return;
    }

    if (!data.purchaseDate) {
      toast.error("Please select a purchase date");
      return;
    }

    const validItems = data.items.filter(item => item.materialId || (item.materialName && item.materialName.trim()));
    if (validItems.length === 0) {
      toast.error("Please add at least one material");
      return;
    }

    const hasInvalidQuantity = validItems.some(item => !item.quantity || Number(item.quantity) <= 0);
    if (hasInvalidQuantity) {
      toast.error("Please enter a valid quantity for all items");
      return;
    }

    // Validate discount
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

    // ✅ Create materials for items marked for creation (only on new purchases)
    if (!isEditMode) {
      const itemsWithMaterialIds = await Promise.all(
        validItems.map(async (item) => {
          if (item.shouldCreateMaterial && item.materialName && !item.materialId) {
            try {
              const materialPayload = {
                name: item.materialName.trim(),
                type: "General",
                unit: "pieces",
                unitCost: Number(item.unitCost) || 0,
                stock: 0,
              };

              const response = await fetch("/api/materials", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(materialPayload),
              });

              if (response.ok) {
                const newMaterial = await response.json();
                toast.success(`Material "${item.materialName}" created`);
                return {
                  ...item,
                  materialId: newMaterial._id,
                  shouldCreateMaterial: false,
                };
              } else {
                const error = await response.json();
                toast.error(`Failed to create material "${item.materialName}"`, {
                  description: error.error || "Continuing with custom item"
                });
                return { ...item, shouldCreateMaterial: false };
              }
            } catch (error) {
              console.error("Error creating material:", error);
              toast.error(`Failed to create material "${item.materialName}"`);
              return { ...item, shouldCreateMaterial: false };
            }
          }
          return item;
        })
      );

      // Use the processed items
      validItems.splice(0, validItems.length, ...itemsWithMaterialIds);
    }

    // Calculate amounts with discount
    const calculatedSubtotal = itemsGrossTotal - discountAmount;
    const calculatedVatAmount = data.isTaxPayable ? calculatedSubtotal * (UAE_VAT_PERCENTAGE / 100) : 0;
    const calculatedGrandTotal = calculatedSubtotal + calculatedVatAmount;

    const submitData = {
      partyId: data.partyId,
      contactId: data.contactId,
      purchaseDate: data.purchaseDate,
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

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Main Top Grid */}
          <div className={cn("grid grid-cols-1 gap-4", isEditMode ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
            {/* ✅ Supplier Field - PartyContactSelector */}
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

          {/* Tax Payable Toggle */}
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
                {isTaxPayable ? `${UAE_VAT_PERCENTAGE}% VAT will be added to the subtotal` : 'No VAT will be applied to this purchase'}
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

          {/* Materials Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ItemsTable
                itemType="material"
                items={materials}
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