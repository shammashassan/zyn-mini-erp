// app/expenses/return-notes/return-note-form.tsx - UPDATED: Supplier → Purchase Flow, No Commercial Fields

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  ChevronsUpDown,
  Check,
  PackageX,
  AlertCircle,
  Calendar as CalendarIcon,
  Loader2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ReturnItem = {
  materialId: string;
  materialName: string;
  orderedQuantity: number;
  receivedQuantity: number;
  returnedQuantity: number;
  returnQuantity: number;
};

type ReturnNoteFormData = {
  supplierName: string;
  purchaseId: string;
  items: ReturnItem[];
  reason: string;
  notes: string;
  returnDate: Date;
  status: 'pending' | 'approved' | 'cancelled';
};

interface ReturnNoteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, id?: string) => Promise<void>;
  defaultValues?: any | null;
}

const RETURN_REASONS = [
  'Damaged goods',
  'Wrong items delivered',
  'Quality issues',
  'Excess inventory',
  'Cancelled order',
  'Other'
];

export function ReturnNoteForm({
  isOpen,
  onClose,
  onSubmit,
  defaultValues
}: ReturnNoteFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { isSubmitting, isDirty }
  } = useForm<ReturnNoteFormData>({
    defaultValues: {
      items: [],
      reason: '',
      notes: '',
      returnDate: new Date(),
      status: 'pending'
    }
  });

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);
  const [purchasePopoverOpen, setPurchasePopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");

  const isEditMode = !!defaultValues?._id;

  // Fetch suppliers
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const res = await fetch('/api/suppliers');
        if (res.ok) {
          setSuppliers(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch suppliers:", error);
      }
    };

    if (isOpen) {
      fetchSuppliers();
    }
  }, [isOpen]);

  // Fetch purchases when supplier is selected
  useEffect(() => {
    const fetchPurchases = async () => {
      if (!selectedSupplier) {
        setPurchases([]);
        return;
      }

      try {
        const res = await fetch('/api/purchases?populate=true');
        if (res.ok) {
          const allPurchases = await res.json();
          // Filter to only show purchases with received/partially received status from selected supplier
          const eligiblePurchases = allPurchases.filter(
            (p: any) =>
              p.supplierName === selectedSupplier &&
              (p.inventoryStatus === 'received' || p.inventoryStatus === 'partially received') &&
              !p.isDeleted
          );
          setPurchases(eligiblePurchases);
        }
      } catch (error) {
        console.error("Failed to fetch purchases:", error);
      }
    };

    fetchPurchases();
  }, [selectedSupplier]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultValues) {
        reset({
          ...defaultValues,
          returnDate: defaultValues.returnDate ? new Date(defaultValues.returnDate) : new Date()
        });
        // Set supplier and purchase from default values
        if (defaultValues.supplierName) {
          setSelectedSupplier(defaultValues.supplierName);
          setSupplierSearchQuery(defaultValues.supplierName);
        }
        if (defaultValues.purchaseId) {
          // Will be populated when purchases load
        }
      } else {
        reset({
          items: [],
          reason: '',
          notes: '',
          returnDate: new Date(),
          status: 'pending'
        });
        setSelectedSupplier("");
        setSupplierSearchQuery("");
        setSelectedPurchase(null);
        setSelectedItems(new Set());
        setReturnQuantities({});
      }
    }
  }, [isOpen, defaultValues, reset]);

  const handleSupplierSelect = (supplier: any) => {
    setSelectedSupplier(supplier.name);
    setSupplierSearchQuery(supplier.name);
    setValue('supplierName', supplier.name);
    setSupplierPopoverOpen(false);
    // Reset purchase selection when supplier changes
    setSelectedPurchase(null);
    setValue('purchaseId', '');
    setSelectedItems(new Set());
    setReturnQuantities({});
  };

  const handlePurchaseSelect = (purchase: any) => {
    setSelectedPurchase(purchase);
    setValue('purchaseId', purchase._id);
    setPurchasePopoverOpen(false);
    setSelectedItems(new Set());
    setReturnQuantities({});
  };

  const toggleItemSelection = (materialId: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(materialId)) {
      newSet.delete(materialId);
      const newQuantities = { ...returnQuantities };
      delete newQuantities[materialId];
      setReturnQuantities(newQuantities);
    } else {
      newSet.add(materialId);
    }
    setSelectedItems(newSet);
  };

  const handleReturnQuantityChange = (materialId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const item = selectedPurchase?.items.find((i: any) => i.materialId === materialId);
    if (!item) return;

    const receivedQty = item.receivedQuantity || 0;
    const alreadyReturned = item.returnedQuantity || 0;
    const availableToReturn = receivedQty - alreadyReturned;

    if (numValue > availableToReturn) {
      toast.error(
        `Cannot return more than ${availableToReturn.toFixed(2)} units of ${item.materialName}`
      );
      return;
    }

    if (numValue < 0) {
      toast.error(`Return quantity cannot be negative`);
      return;
    }

    setReturnQuantities(prev => ({
      ...prev,
      [materialId]: numValue
    }));
  };

  const totalReturnedQty = Array.from(selectedItems).reduce((sum, materialId) => {
    return sum + (returnQuantities[materialId] || 0);
  }, 0);

  const handleFormSubmit = async (data: ReturnNoteFormData) => {
    if (!selectedSupplier) {
      toast.error("Please select a supplier");
      return;
    }

    if (!selectedPurchase) {
      toast.error("Please select a purchase");
      return;
    }

    if (selectedItems.size === 0) {
      toast.error("Please select at least one item to return");
      return;
    }

    if (!data.reason || !data.reason.trim()) {
      toast.error("Please provide a reason for the return");
      return;
    }

    // Build items array
    const returnItems: ReturnItem[] = [];
    for (const materialId of selectedItems) {
      const item = selectedPurchase.items.find((i: any) => i.materialId === materialId);
      const returnQty = returnQuantities[materialId] || 0;

      if (returnQty <= 0) {
        toast.error(`Please enter a valid return quantity for ${item.materialName}`);
        return;
      }

      const receivedQty = item.receivedQuantity || 0;
      const alreadyReturned = item.returnedQuantity || 0;

      returnItems.push({
        materialId: item.materialId,
        materialName: item.materialName,
        orderedQuantity: item.quantity,
        receivedQuantity: receivedQty,
        returnedQuantity: alreadyReturned,
        returnQuantity: returnQty,
      });
    }

    const submitData = {
      purchaseId: selectedPurchase._id,
      supplierName: selectedSupplier,
      items: returnItems,
      reason: data.reason.trim(),
      notes: data.notes?.trim() || '',
      returnDate: data.returnDate,
      status: isEditMode ? data.status : 'pending'
    };

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    await onSubmit(submitData, submissionId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5" />
            {defaultValues ? "Edit Return Note" : "Create Return Note"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Supplier Selection */}
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Popover open={supplierPopoverOpen} onOpenChange={setSupplierPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      disabled={isEditMode}
                    >
                      {selectedSupplier || "Select supplier..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search suppliers..." 
                        value={supplierSearchQuery}
                        onValueChange={setSupplierSearchQuery}
                      />
                      <CommandList
                        className="max-h-[200px] overflow-y-auto"
                        onWheel={(e) => e.stopPropagation()}
                      >
                        <CommandEmpty>No supplier found.</CommandEmpty>
                        <CommandGroup>
                          {suppliers
                            .filter(supplier => 
                              !supplierSearchQuery || 
                              supplier.name.toLowerCase().includes(supplierSearchQuery.toLowerCase())
                            )
                            .map((supplier) => (
                              <CommandItem
                                key={supplier._id}
                                value={supplier.name}
                                onSelect={() => handleSupplierSelect(supplier)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedSupplier === supplier.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{supplier.name}</div>
                                  {supplier.city && supplier.district && (
                                    <div className="text-xs text-muted-foreground">
                                      {supplier.city}, {supplier.district}
                                    </div>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Purchase Selection (only shows if supplier is selected) */}
              {selectedSupplier && (
                <div className="space-y-2">
                  <Label>Purchase *</Label>
                  <Popover open={purchasePopoverOpen} onOpenChange={setPurchasePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                        disabled={isEditMode || purchases.length === 0}
                      >
                        {selectedPurchase
                          ? `${selectedPurchase.referenceNumber}`
                          : purchases.length === 0
                          ? "No eligible purchases"
                          : "Select purchase..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search purchases..." />
                        <CommandList
                          className="max-h-[200px] overflow-y-auto"
                          onWheel={(e) => e.stopPropagation()}
                        >
                          <CommandEmpty>No purchases found.</CommandEmpty>
                          <CommandGroup>
                            {purchases.map((purchase) => (
                              <CommandItem
                                key={purchase._id}
                                value={purchase.referenceNumber}
                                onSelect={() => handlePurchaseSelect(purchase)}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedPurchase?._id === purchase._id ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex-1">
                                  <div className="font-medium">{purchase.referenceNumber}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {purchase.inventoryStatus} • {purchase.items?.length || 0} items
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Return Date</Label>
                  <Controller
                    name="returnDate"
                    control={control}
                    render={({ field }) => (
                      <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            ref={field.ref}
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
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

                {isEditMode && (
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
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
            </CardContent>
          </Card>

          {selectedPurchase && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Select Items to Return</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {selectedPurchase.items
                  .filter((item: any) => {
                    const receivedQty = item.receivedQuantity || 0;
                    const returnedQty = item.returnedQuantity || 0;
                    return receivedQty > returnedQty;
                  })
                  .map((item: any) => {
                    const receivedQty = item.receivedQuantity || 0;
                    const returnedQty = item.returnedQuantity || 0;
                    const availableToReturn = receivedQty - returnedQty;
                    const isSelected = selectedItems.has(item.materialId);

                    return (
                      <Label
                        key={item.materialId}
                        htmlFor={`item-${item.materialId}`}
                        className={cn(
                          "flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                          isSelected && "border-red-600 bg-red-50 dark:border-red-900 dark:bg-red-950"
                        )}
                      >
                        <input
                          type="checkbox"
                          id={`item-${item.materialId}`}
                          checked={isSelected}
                          onChange={() => toggleItemSelection(item.materialId)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="font-medium">{item.materialName}</div>
                          <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                            <div>Ordered: {item.quantity}</div>
                            <div>Received: {receivedQty}</div>
                            <div className="text-orange-600">Returned: {returnedQty}</div>
                            <div className="text-green-600">
                              Available: {availableToReturn.toFixed(2)}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="space-y-1">
                              <Label className="text-xs">Return Quantity</Label>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={availableToReturn}
                                placeholder={`Max: ${availableToReturn.toFixed(2)}`}
                                value={returnQuantities[item.materialId] || ''}
                                onChange={(e) =>
                                  handleReturnQuantityChange(item.materialId, e.target.value)
                                }
                                className="h-8"
                                disabled={availableToReturn === 0}
                              />
                            </div>
                          )}
                        </div>
                      </Label>
                    );
                  })}

                {selectedPurchase.items.every((item: any) => {
                  const receivedQty = item.receivedQuantity || 0;
                  const returnedQty = item.returnedQuantity || 0;
                  return receivedQty <= returnedQty;
                }) && (
                    <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <p className="text-sm text-yellow-900 dark:text-yellow-100">
                        All received items have been returned
                      </p>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Return Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Reason *</Label>
                <Controller
                  name="reason"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {RETURN_REASONS.map((reason) => (
                          <SelectItem key={reason} value={reason}>
                            {reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  {...register("notes")}
                  placeholder="Add any additional details..."
                  rows={3}
                />
              </div>

              {selectedItems.size > 0 && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Quantity to Return:</span>
                    <span className="text-xl font-bold text-red-600">
                      {totalReturnedQty.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleSubmit(handleFormSubmit)} 
              disabled={isSubmitting || (isEditMode && !isDirty)}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : defaultValues ? "Update Return Note" : "Create Return Note"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}