// app/expenses/return-notes/return-note-form.tsx - FIXED: All items showing + proper dirty detection

"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  ChevronsUpDown,
  Check,
  PackageX,
  AlertCircle,
  Calendar as CalendarIcon,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

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
    formState: { isSubmitting }
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
  const [isDesktop, setIsDesktop] = useState(true);

  // ✅ NEW: Track initial state for dirty detection
  const [initialState, setInitialState] = useState<{
    selectedItems: Set<string>;
    returnQuantities: Record<string, number>;
    reason: string;
    notes: string;
    status: string;
    returnDate: string;
  } | null>(null);

  const isEditMode = !!defaultValues?._id;

  // Watch form values for dirty detection
  const currentReason = watch('reason');
  const currentNotes = watch('notes');
  const currentStatus = watch('status');
  const currentReturnDate = watch('returnDate');

  // ✅ Calculate if form is dirty
  const isDirty = useMemo(() => {
    if (!isEditMode || !initialState) return false;

    // Check if selected items changed
    if (selectedItems.size !== initialState.selectedItems.size) return true;
    for (const item of selectedItems) {
      if (!initialState.selectedItems.has(item)) return true;
    }

    // Check if return quantities changed
    for (const [materialId, qty] of Object.entries(returnQuantities)) {
      if (initialState.returnQuantities[materialId] !== qty) return true;
    }

    // Check if other fields changed
    if (currentReason !== initialState.reason) return true;
    if (currentNotes !== initialState.notes) return true;
    if (currentStatus !== initialState.status) return true;

    // Compare dates (normalize to same format)
    const currentDateStr = currentReturnDate ? new Date(currentReturnDate).toISOString() : '';
    if (currentDateStr !== initialState.returnDate) return true;

    return false;
  }, [isEditMode, initialState, selectedItems, returnQuantities, currentReason, currentNotes, currentStatus, currentReturnDate]);

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

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

  // ✅ FIXED: Handle edit mode - properly restore all state
  useEffect(() => {
    const loadEditData = async () => {
      if (!isOpen || !isEditMode || !defaultValues) return;

      // Extract purchaseId from connectedDocuments or direct field
      const purchaseId =
        defaultValues.connectedDocuments?.purchaseId?._id ||
        defaultValues.connectedDocuments?.purchaseId ||
        defaultValues.purchaseId;

      if (!purchaseId) {
        console.error("No purchase ID found in defaultValues");
        return;
      }

      try {
        // Fetch full purchase details
        const res = await fetch(`/api/purchases/${purchaseId}`);
        if (res.ok) {
          const purchase = await res.json();
          setSelectedPurchase(purchase);
          setValue('purchaseId', purchase._id);

          // ✅ Restore selected items from defaultValues
          if (defaultValues.items && Array.isArray(defaultValues.items)) {
            const itemIds = new Set<string>(
              defaultValues.items.map((item: any) => String(item.materialId))
            );
            setSelectedItems(itemIds);

            // ✅ Restore return quantities
            const quantities: Record<string, number> = {};
            defaultValues.items.forEach((item: any) => {
              quantities[item.materialId] = item.returnQuantity;
            });
            setReturnQuantities(quantities);

            // ✅ Set initial state for dirty detection
            setInitialState({
              selectedItems: new Set<string>(itemIds),
              returnQuantities: { ...quantities },
              reason: defaultValues.reason || '',
              notes: defaultValues.notes || '',
              status: defaultValues.status || 'pending',
              returnDate: defaultValues.returnDate ? new Date(defaultValues.returnDate).toISOString() : new Date().toISOString()
            });
          }
        }
      } catch (error) {
        console.error("Failed to fetch purchase for edit:", error);
        toast.error("Failed to load purchase details");
      }
    };

    loadEditData();
  }, [isOpen, isEditMode, defaultValues, setValue]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultValues) {
        reset({
          ...defaultValues,
          returnDate: defaultValues.returnDate ? new Date(defaultValues.returnDate) : new Date()
        });
        if (defaultValues.supplierName) {
          setSelectedSupplier(defaultValues.supplierName);
          setSupplierSearchQuery(defaultValues.supplierName);
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
        setInitialState(null);
      }
    }
  }, [isOpen, defaultValues, reset]);

  const handleSupplierSelect = (supplier: any) => {
    setSelectedSupplier(supplier.name);
    setSupplierSearchQuery(supplier.name);
    setValue('supplierName', supplier.name);
    setSupplierPopoverOpen(false);
    if (!isEditMode) {
      setSelectedPurchase(null);
      setValue('purchaseId', '');
      setSelectedItems(new Set());
      setReturnQuantities({});
    }
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

  const totalSelectedItems = selectedItems.size;

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

  // ✅ FIXED: Filter eligible items properly
  const eligibleItems = useMemo(() => {
    if (!selectedPurchase?.items) return [];

    return selectedPurchase.items.filter((item: any) => {
      const receivedQty = item.receivedQuantity || 0;
      const returnedQty = item.returnedQuantity || 0;
      return receivedQty > returnedQty;
    });
  }, [selectedPurchase]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5" />
            {defaultValues ? "Edit Return Note" : "Create New Return Note"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Top Row: Supplier, Purchase, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Supplier Selection */}
            <div className="space-y-2">
              <Label>
                Supplier Name <span className="text-destructive">*</span>
              </Label>
              <Popover open={supplierPopoverOpen} onOpenChange={setSupplierPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    disabled={isEditMode}
                  >
                    <div className="truncate">
                      {selectedSupplier || "Select supplier..."}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
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
                      <CommandEmpty>
                        {supplierSearchQuery.trim() ? "No supplier found." : "Start typing to search..."}
                      </CommandEmpty>
                      <CommandGroup heading="Suppliers">
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
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Purchase Selection */}
            <div className="space-y-2">
              <Label>
                Purchase <span className="text-destructive">*</span>
              </Label>
              <Popover open={purchasePopoverOpen} onOpenChange={setPurchasePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    disabled={isEditMode || !selectedSupplier || purchases.length === 0}
                  >
                    <div className="truncate">
                      {selectedPurchase
                        ? selectedPurchase.referenceNumber
                        : !selectedSupplier
                          ? "Select supplier first..."
                          : purchases.length === 0
                            ? "No eligible purchases"
                            : "Select purchase..."}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
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

            {/* Return Date */}
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
          </div>

          {/* Reason and Status (Status only in edit mode) */}
          <div className={cn("grid gap-4", isEditMode ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1")}>
            <div className="space-y-2">
              <Label htmlFor="reason">
                Reason <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="reason"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select reason for return" />
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

          {/* Items Selection Card */}
          {selectedPurchase && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base">Select Items to Return</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {eligibleItems.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      All received items have been returned
                    </p>
                  </div>
                ) : isDesktop ? (
                  /* Desktop Table View */
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-center p-3 font-medium text-sm w-[60px]">Select</th>
                          <th className="text-left p-3 font-medium text-sm min-w-[200px]">Material</th>
                          <th className="text-center p-3 font-medium text-sm w-[100px]">Ordered</th>
                          <th className="text-center p-3 font-medium text-sm w-[100px]">Received</th>
                          <th className="text-center p-3 font-medium text-sm w-[100px]">Returned</th>
                          <th className="text-center p-3 font-medium text-sm w-[100px]">Available</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eligibleItems.map((item: any) => {
                          const receivedQty = item.receivedQuantity || 0;
                          const returnedQty = item.returnedQuantity || 0;
                          const availableToReturn = receivedQty - returnedQty;
                          const isSelected = selectedItems.has(item.materialId);

                          return (
                            <React.Fragment key={item.materialId}>
                              <tr
                                className={cn(
                                  "border-b hover:bg-muted/50",
                                  isSelected && "bg-red-50 dark:bg-red-950/20"
                                )}
                              >
                                <td className="p-3 text-center">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleItemSelection(item.materialId)}
                                    className="mx-auto"
                                  />
                                </td>
                                <td className="p-3 font-medium">{item.materialName}</td>
                                <td className="p-3 text-center tabular-nums">{item.quantity}</td>
                                <td className="p-3 text-center tabular-nums">{receivedQty.toFixed(2)}</td>
                                <td className="p-3 text-center tabular-nums text-orange-600">
                                  {returnedQty.toFixed(2)}
                                </td>
                                <td className="p-3 text-center tabular-nums text-green-600 font-semibold">
                                  {availableToReturn.toFixed(2)}
                                </td>
                              </tr>
                              {isSelected && (
                                <tr className={cn("border-b", isSelected && "bg-red-50 dark:bg-red-950/20")}>
                                  <td colSpan={6} className="p-3">
                                    <div className="flex items-center gap-3 max-w-sm">
                                      <Label className="text-sm text-muted-foreground whitespace-nowrap">
                                        Return Quantity:
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={availableToReturn}
                                        placeholder="0.00"
                                        value={returnQuantities[item.materialId] || ''}
                                        onChange={(e) =>
                                          handleReturnQuantityChange(item.materialId, e.target.value)
                                        }
                                        className="h-9"
                                        disabled={availableToReturn === 0}
                                      />
                                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        Max: {availableToReturn.toFixed(2)}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  /* Mobile Card View */
                  <div className="space-y-3">
                    {eligibleItems.map((item: any) => {
                      const receivedQty = item.receivedQuantity || 0;
                      const returnedQty = item.returnedQuantity || 0;
                      const availableToReturn = receivedQty - returnedQty;
                      const isSelected = selectedItems.has(item.materialId);

                      return (
                        <Card
                          key={item.materialId}
                          className={cn(
                            "border-2 transition-colors",
                            isSelected && "border-red-600 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                          )}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`item-${item.materialId}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleItemSelection(item.materialId)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <Label
                                  htmlFor={`item-${item.materialId}`}
                                  className="font-medium cursor-pointer"
                                >
                                  {item.materialName}
                                </Label>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-0">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Ordered</div>
                                <div className="font-medium">{item.quantity}</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Received</div>
                                <div className="font-medium">{receivedQty.toFixed(2)}</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Returned</div>
                                <div className="font-medium text-orange-600">{returnedQty.toFixed(2)}</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Available</div>
                                <div className="font-semibold text-green-600">{availableToReturn.toFixed(2)}</div>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="space-y-2 pt-2 border-t">
                                <Label className="text-xs text-muted-foreground">Return Quantity</Label>
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
                                  className="h-9"
                                  disabled={availableToReturn === 0}
                                />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Additional Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional details..."
              {...register("notes")}
              rows={3}
            />
          </div>

          {/* Summary Card */}
          {selectedItems.size > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items Selected:</span>
                    <span className="font-medium">{totalSelectedItems}</span>
                  </div>
                  <div className="flex justify-between pt-3 border-t">
                    <span className="font-semibold">Total Quantity to Return:</span>
                    <span className="text-xl font-bold text-red-600">
                      {totalReturnedQty.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
              ) : (defaultValues ? "Update Return Note" : "Create Return Note")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}