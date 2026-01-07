// app/expenses/purchases/purchase-form.tsx - UPDATED: Populated combobox inputs

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
import { CalendarIcon, ChevronsUpDown, Check, Plus, X, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { IPurchase } from "@/models/Purchase";
import type { IMaterial } from "@/models/Material";
import type { ISupplier } from "@/models/Supplier";
import { formatCurrency } from "@/utils/formatters/currency";
import { UAE_VAT_PERCENTAGE } from "@/utils/constants";
import { Spinner } from "@/components/ui/spinner";

type PurchaseItem = {
  materialId: string;
  materialName: string;
  quantity: number;
  unitCost: number;
  total: number;
};

type PurchaseFormData = {
  supplierName: string;
  items: PurchaseItem[];
  date: Date;
  purchaseStatus: 'pending' | 'approved' | 'cancelled';
  inventoryStatus: 'pending' | 'received' | 'partially received';
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
      items: [{ materialId: '', materialName: '', quantity: 1, unitCost: 0, total: 0 }],
      discount: 0,
      isTaxPayable: true,
      purchaseStatus: 'pending',
      inventoryStatus: 'pending',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const [materials, setMaterials] = useState<IMaterial[]>([]);
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");
  const [materialPopovers, setMaterialPopovers] = useState<Record<number, boolean>>({});
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  const watchedItems = watch("items");
  const discount = watch("discount") || 0;
  const isTaxPayable = watch("isTaxPayable");

  const isEditMode = !!defaultValues?._id;

  // Calculate with discount
  const grossTotal = watchedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const subtotal = grossTotal - discount;
  const vatAmount = isTaxPayable ? subtotal * (UAE_VAT_PERCENTAGE / 100) : 0;
  const grandTotal = subtotal + vatAmount;
  const totalItems = watchedItems.filter(item => item.materialId).length;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [materialsRes, suppliersRes] = await Promise.all([
          fetch("/api/materials"),
          fetch("/api/suppliers")
        ]);

        if (materialsRes.ok) setMaterials(await materialsRes.json());
        if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isOpen) {
      if (defaultValues) {
        reset({
          supplierName: defaultValues.supplierName || "",
          items: defaultValues.items || [{ materialId: '', materialName: '', quantity: 1, unitCost: 0, total: 0 }],
          date: defaultValues.date ? new Date(defaultValues.date) : new Date(),
          purchaseStatus: defaultValues.purchaseStatus || 'pending',
          inventoryStatus: defaultValues.inventoryStatus || 'pending',
          discount: defaultValues.discount || 0,
          isTaxPayable: defaultValues.isTaxPayable !== undefined ? defaultValues.isTaxPayable : true,
        });
        setSupplierSearchQuery(defaultValues.supplierName || "");
      } else {
        reset({
          supplierName: "",
          items: [{ materialId: '', materialName: '', quantity: 1, unitCost: 0, total: 0 }],
          date: new Date(),
          purchaseStatus: 'pending',
          inventoryStatus: 'pending',
          discount: 0,
          isTaxPayable: true,
        });
        setSupplierSearchQuery("");
      }
    }
  }, [isOpen, defaultValues, reset]);

  const handleMaterialSelect = (index: number, materialId: string) => {
    const material = materials.find(m => m._id === materialId);
    if (material) {
      setValue(`items.${index}.materialId`, materialId);
      setValue(`items.${index}.materialName`, material.name);
      setValue(`items.${index}.unitCost`, material.unitCost);

      const quantity = parseFloat(String(watchedItems[index].quantity)) || 1;
      setValue(`items.${index}.total`, quantity * material.unitCost, { shouldDirty: true });

      setMaterialPopovers(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleQuantityChange = (index: number, value: string) => {
    const quantity = parseFloat(value);
    const unitCost = Number(watchedItems[index].unitCost) || 0;
    if (!isNaN(quantity)) {
      setValue(`items.${index}.total`, quantity * unitCost, { shouldDirty: true });
    } else {
      setValue(`items.${index}.total`, 0, { shouldDirty: true });
    }
  };

  const handleFormSubmit = async (data: PurchaseFormData) => {
    if (!data.supplierName || !data.supplierName.trim()) {
      toast.error("Please select or enter a supplier");
      return;
    }

    if (!data.date) {
      toast.error("Please select a purchase date");
      return;
    }

    const validItems = data.items.filter(item => item.materialId);
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

    // Calculate amounts with discount
    const calculatedSubtotal = itemsGrossTotal - discountAmount;
    const calculatedVatAmount = data.isTaxPayable ? calculatedSubtotal * (UAE_VAT_PERCENTAGE / 100) : 0;
    const calculatedGrandTotal = calculatedSubtotal + calculatedVatAmount;

    const submitData = {
      supplierName: data.supplierName.trim(),
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
      date: data.date,
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
          <div className={cn("grid grid-cols-1 gap-4", isEditMode ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
            <div className="space-y-2">
              <Label>Supplier <span className="text-destructive">*</span></Label>
              <Controller
                name="supplierName"
                control={control}
                render={({ field }) => (
                  <Popover
                    open={supplierPopoverOpen}
                    onOpenChange={(isOpen) => {
                      setSupplierPopoverOpen(isOpen);
                      if (isOpen) setSupplierSearchQuery(field.value);
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        ref={field.ref}
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                      >
                        {field.value || "Select or type supplier..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Search supplier..."
                          value={supplierSearchQuery}
                          onValueChange={setSupplierSearchQuery}
                        />
                        <CommandList
                          className="max-h-[200px] overflow-y-auto"
                          onWheel={(e) => e.stopPropagation()}
                        >
                          <CommandEmpty>
                            {supplierSearchQuery.trim() ? "No supplier found." : "Start typing to search..."}
                          </CommandEmpty>

                          <CommandGroup heading="Existing Suppliers">
                            {suppliers
                              .filter(s => !supplierSearchQuery || s.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()))
                              .map((supplier) => (
                                <CommandItem
                                  key={supplier._id}
                                  value={supplier.name}
                                  onSelect={() => {
                                    field.onChange(supplier.name);
                                    setSupplierSearchQuery(supplier.name);
                                    setSupplierPopoverOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", field.value === supplier.name ? "opacity-100" : "opacity-0")} />
                                  <div className="flex-1">
                                    <span>{supplier.name}</span>
                                    {supplier.city && supplier.district && (
                                      <div className="text-xs text-muted-foreground">
                                        {supplier.city}, {supplier.district}
                                      </div>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>

                          {supplierSearchQuery.trim() && !suppliers.some(s => s.name.toLowerCase() === supplierSearchQuery.trim().toLowerCase()) && (
                            <CommandGroup heading="New Supplier">
                              <CommandItem
                                onSelect={() => {
                                  field.onChange(supplierSearchQuery.trim());
                                  setSupplierPopoverOpen(false);
                                }}
                                className="text-primary"
                                value={supplierSearchQuery}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Create "{supplierSearchQuery}"
                              </CommandItem>
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Controller
                name="date"
                control={control}
                render={({ field }) => (
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button ref={field.ref} type="button" variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
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

            {/* Purchase Status (only in edit mode) */}
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

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDesktop ? (
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-sm w-[40px]">#</th>
                        <th className="text-left p-3 font-medium text-sm min-w-[250px]">
                          Material <span className="text-destructive">*</span>
                        </th>
                        <th className="text-left p-3 font-medium text-sm w-[100px]">Quantity</th>
                        <th className="text-right p-3 font-medium text-sm w-[100px]">Unit Cost</th>
                        <th className="text-right p-3 font-medium text-sm w-[100px]">Total</th>
                        <th className="text-center p-3 font-medium text-sm w-[60px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const material = materials.find(m => m._id === watchedItems[index]?.materialId);

                        return (
                          <tr key={field.id} className="border-b hover:bg-muted/50">
                            <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                            <td className="p-3">
                              <Controller
                                name={`items.${index}.materialId`}
                                control={control}
                                render={({ field }) => (
                                  <div className="flex flex-col gap-1">
                                    <Popover
                                      open={materialPopovers[index]}
                                      onOpenChange={(open) => setMaterialPopovers(prev => ({ ...prev, [index]: open }))}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button
                                          ref={field.ref}
                                          type="button"
                                          variant="outline"
                                          role="combobox"
                                          className="w-full justify-between h-10"
                                        >
                                          <span className="truncate">{material?.name || "Select material..."}</span>
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                                        <Command>
                                          <CommandInput 
                                            placeholder="Search materials..." 
                                            value={watchedItems[index]?.materialName || ""}
                                            onValueChange={(val) => setValue(`items.${index}.materialName`, val)}
                                          />
                                          <CommandList
                                            className="max-h-[200px] overflow-y-auto"
                                            onWheel={(e) => e.stopPropagation()}
                                          >
                                            <CommandEmpty>No material found.</CommandEmpty>
                                            <CommandGroup>
                                              {materials.map((mat) => (
                                                <CommandItem
                                                  key={mat._id}
                                                  value={mat.name}
                                                  onSelect={() => handleMaterialSelect(index, mat._id)}
                                                >
                                                  <Check className={cn("mr-2 h-4 w-4", field.value === mat._id ? "opacity-100" : "opacity-0")} />
                                                  <div className="flex-1">
                                                    <div>{mat.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                      {mat.type} • {mat.unitCost}/{mat.unit}
                                                    </div>
                                                  </div>
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>
                                  </div>
                                )}
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                className="h-10"
                                {...register(`items.${index}.quantity`, {
                                  onChange: (e) => handleQuantityChange(index, e.target.value)
                                })}
                              />
                            </td>
                            <td className="p-3 text-right text-sm tabular-nums font-medium">
                              {material ? formatCurrency(material.unitCost) : formatCurrency(0)}
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
                                  onClick={() => remove(index)}
                                  className="h-8 w-8 p-0 text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const material = materials.find(m => m._id === watchedItems[index]?.materialId);

                    return (
                      <Card key={field.id} className="border-2">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm">Material #{index + 1}</CardTitle>
                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
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
                              Material <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                              name={`items.${index}.materialId`}
                              control={control}
                              render={({ field }) => (
                                <>
                                  <Popover
                                    open={materialPopovers[index]}
                                    onOpenChange={(open) => setMaterialPopovers(prev => ({ ...prev, [index]: open }))}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        ref={field.ref}
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between h-9 text-sm"
                                      >
                                        <span className="truncate">{material?.name || "Select material..."}</span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                      <Command>
                                        <CommandInput 
                                            placeholder="Search materials..." 
                                            value={watchedItems[index]?.materialName || ""}
                                            onValueChange={(val) => setValue(`items.${index}.materialName`, val)}
                                        />
                                        <CommandList
                                          className="max-h-[200px] overflow-y-auto"
                                          onWheel={(e) => e.stopPropagation()}
                                        >
                                          <CommandEmpty>No material found.</CommandEmpty>
                                          <CommandGroup>
                                            {materials.map((mat) => (
                                              <CommandItem
                                                key={mat._id}
                                                value={mat.name}
                                                onSelect={() => handleMaterialSelect(index, mat._id)}
                                              >
                                                <Check className={cn("mr-2 h-4 w-4", field.value === mat._id ? "opacity-100" : "opacity-0")} />
                                                <div className="flex-1 min-w-0">
                                                  <div className="truncate">{mat.name}</div>
                                                  <div className="text-xs text-muted-foreground truncate">
                                                    {mat.type} • {mat.unitCost}/{mat.unit}
                                                  </div>
                                                </div>
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                </>
                              )}
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
                                {...register(`items.${index}.quantity`, {
                                  onChange: (e) => handleQuantityChange(index, e.target.value)
                                })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-muted-foreground">Unit Cost</Label>
                              <div className="h-9 flex items-center justify-end px-3 border rounded-md bg-muted/50 text-sm">
                                {material ? formatCurrency(material.unitCost) : formatCurrency(0)}
                              </div>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t">
                            <span className="text-xs font-medium">Total</span>
                            <span className="text-sm font-bold">{formatCurrency(watchedItems[index]?.total || 0)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ materialId: '', materialName: '', quantity: 1, unitCost: 0, total: 0 })}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Material
              </Button>
            </CardContent>
          </Card>

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
              {isSubmitting ? (
                <>
                  <Spinner />
                  Saving...
                </>
              )
                : defaultValues ? "Update Purchase" : "Create Purchase"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}