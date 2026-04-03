// app/procurement/purchase-returns/purchase-return-form.tsx

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
import { PartyContactSelector } from "@/components/PartyContactSelector";

type ReturnItem = {
  /** References unified Item model */
  itemId: string;
  description: string;
  orderedQuantity?: number;
  receivedQuantity?: number;
  returnedQuantity?: number;
  returnQuantity: number;
  rate?: number;
  total?: number;
  taxRate?: number;
  taxAmount?: number;
};

type PurchaseReturnFormData = {
  returnType: 'purchaseReturn';
  purchaseId: string;
  items: ReturnItem[];
  reason: string;
  notes: string;
  returnDate: Date;
  status: 'pending' | 'approved' | 'cancelled';
};

interface PurchaseReturnFormProps {
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
  'Defective product',
  'Other'
];

export function PurchaseReturnForm({
  isOpen,
  onClose,
  onSubmit,
  defaultValues
}: PurchaseReturnFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    reset,
    formState: { isSubmitting }
  } = useForm<PurchaseReturnFormData>({
    defaultValues: {
      returnType: 'purchaseReturn',
      items: [],
      reason: '',
      notes: '',
      returnDate: new Date(),
      status: 'pending'
    }
  });

  const [purchases, setPurchases] = useState<any[]>([]);

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [selectedContactId, setSelectedContactId] = useState<string | undefined>(undefined);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);

  const [purchasePopoverOpen, setPurchasePopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

  const [isDesktop, setIsDesktop] = useState(true);
  const [initialState, setInitialState] = useState<any>(null);
  const [isLoadingPurchase, setIsLoadingPurchase] = useState(false);

  const isEditMode = !!defaultValues?._id;

  const currentReason = watch('reason');
  const currentNotes = watch('notes');
  const currentStatus = watch('status');
  const currentReturnDate = watch('returnDate');

  const isDirty = useMemo(() => {
    if (!isEditMode || !initialState) return false;
    if (selectedItems.size !== initialState.selectedItems.size) return true;
    for (const item of selectedItems) {
      if (!initialState.selectedItems.has(item)) return true;
    }
    for (const [id, qty] of Object.entries(returnQuantities)) {
      if (initialState.returnQuantities[id] !== qty) return true;
    }
    if (currentReason !== initialState.reason) return true;
    if (currentNotes !== initialState.notes) return true;
    if (currentStatus !== initialState.status) return true;
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

  useEffect(() => {
    const fetchPurchases = async () => {
      if (!selectedSupplierId) {
        setPurchases([]);
        return;
      }

      try {
        // ✅ Filter purchases by partyId at the API level
        const res = await fetch(`/api/purchases?partyId=${selectedSupplierId}&populate=true`);
        if (res.ok) {
          const purchases = await res.json();

          // ✅ Further filter to only include purchases with correct inventory status and returnable items
          const eligible = purchases.filter((p: any) => {
            if (p.isDeleted) return false;

            // Check inventory status
            if (p.inventoryStatus !== 'received' && p.inventoryStatus !== 'partially received') {
              return false;
            }

            // Check if purchase has items with returnable quantity
            const hasReturnableItems = p.items?.some((item: any) => {
              const receivedQty = item.receivedQuantity || 0;
              const returnedQty = item.returnedQuantity || 0;
              return receivedQty > returnedQty;
            });

            return hasReturnableItems;
          });

          setPurchases(eligible);
        }
      } catch (error) {
        console.error("Failed to fetch purchases:", error);
      }
    };

    fetchPurchases();
  }, [selectedSupplierId]);

  useEffect(() => {
    const loadEditMode = async () => {
      if (isOpen && defaultValues) {
        setIsLoadingPurchase(true);

        reset({
          ...defaultValues,
          returnDate: defaultValues.returnDate ? new Date(defaultValues.returnDate) : new Date()
        });

        // Extract partyId and contactId from defaultValues
        if (defaultValues.partyId) {
          setSelectedSupplierId(defaultValues.partyId);
        }
        if (defaultValues.contactId) {
          setSelectedContactId(defaultValues.contactId);
        }

        if (defaultValues.connectedDocuments?.purchaseId) {
          try {
            const purchaseId = typeof defaultValues.connectedDocuments.purchaseId === 'string'
              ? defaultValues.connectedDocuments.purchaseId
              : defaultValues.connectedDocuments.purchaseId._id;

            const res = await fetch(`/api/purchases/${purchaseId}`);
            if (res.ok) {
              const purchase = await res.json();
              setSelectedPurchase(purchase);
              setValue('purchaseId', purchase._id);

              if (defaultValues.items && Array.isArray(defaultValues.items)) {
                const itemsSet = new Set<string>();
                const quantities: Record<string, number> = {};

                defaultValues.items.forEach((item: any) => {
                  const key = item.itemId?.toString();
                  if (key) {
                    itemsSet.add(key);
                    quantities[key] = item.returnQuantity;
                  }
                });

                setSelectedItems(itemsSet);
                setReturnQuantities(quantities);

                setInitialState({
                  selectedItems: itemsSet,
                  returnQuantities: quantities,
                  reason: defaultValues.reason,
                  notes: defaultValues.notes || '',
                  status: defaultValues.status,
                  returnDate: defaultValues.returnDate ? new Date(defaultValues.returnDate).toISOString() : ''
                });
              }
            } else {
              toast.error('Failed to load purchase details');
            }
          } catch (error) {
            console.error('Failed to load connected purchase:', error);
            toast.error('Failed to load purchase details');
          }
        }

        setIsLoadingPurchase(false);
      } else if (isOpen && !defaultValues) {
        reset({
          returnType: 'purchaseReturn',
          items: [],
          reason: '',
          notes: '',
          returnDate: new Date(),
          status: 'pending'
        });
        setSelectedSupplierId("");
        setSelectedPurchase(null);
        setSelectedItems(new Set());
        setReturnQuantities({});
        setInitialState(null);
      }
    };

    loadEditMode();
  }, [isOpen, defaultValues, reset, setValue]);

  const handlePurchaseSelect = (purchase: any) => {
    setSelectedPurchase(purchase);
    setValue('purchaseId', purchase._id);
    setPurchasePopoverOpen(false);
    setSelectedItems(new Set());
    setReturnQuantities({});
  };

  const toggleItemSelection = (itemId: string) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(itemId)) {
      newSet.delete(itemId);
      const newQuantities = { ...returnQuantities };
      delete newQuantities[itemId];
      setReturnQuantities(newQuantities);
    } else {
      newSet.add(itemId);
    }
    setSelectedItems(newSet);
  };

  const handleReturnQuantityChange = (itemId: string, value: string) => {
    const numValue = parseFloat(value) || 0;

    const item = selectedPurchase?.items.find(
      (i: any) => i.itemId?.toString() === itemId
    );
    if (!item) return;

    const receivedQty = item.receivedQuantity || 0;
    const alreadyReturned = item.returnedQuantity || 0;
    const availableToReturn = receivedQty - alreadyReturned;

    if (numValue > availableToReturn) {
      toast.error(`Cannot return more than ${availableToReturn.toFixed(2)} units`);
      return;
    }

    if (numValue < 0) {
      toast.error('Return quantity cannot be negative');
      return;
    }

    setReturnQuantities(prev => ({
      ...prev,
      [itemId]: numValue
    }));
  };

  const totalReturnedQty = Array.from(selectedItems).reduce((sum, itemId) => {
    return sum + (returnQuantities[itemId] || 0);
  }, 0);

  const totalSelectedItems = selectedItems.size;

  const handleFormSubmit = async (data: PurchaseReturnFormData) => {
    if (!selectedSupplierId) {
      toast.error('Please select a supplier');
      return;
    }

    if (!selectedPurchase) {
      toast.error('Please select a purchase');
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

    let returnItems: ReturnItem[] = [];

    for (const key of selectedItems) {
      const item = selectedPurchase.items.find(
        (i: any) => i.itemId?.toString() === key
      );
      const returnQty = returnQuantities[key] || 0;

      if (returnQty <= 0) {
        toast.error(`Please enter a valid return quantity for ${item?.description}`);
        return;
      }

      const unitCost = item.unitCost || 0;
      const lineTotal = returnQty * unitCost;
      const taxRate = item.taxRate ?? 0;
      const taxAmount = lineTotal * (taxRate / 100);

      returnItems.push({
        itemId: item.itemId?.toString(),
        description: item.description,
        orderedQuantity: item.quantity,
        receivedQuantity: item.receivedQuantity || 0,
        returnedQuantity: item.returnedQuantity || 0,
        returnQuantity: returnQty,
        rate: unitCost,
        total: lineTotal,
        taxRate,
        taxAmount,
      });
    }

    const totalAmount = returnItems.reduce((sum, item) => sum + (item.total || 0), 0);
    const vatAmount = returnItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);

    const submitData: any = {
      returnType: 'purchaseReturn',
      purchaseId: selectedPurchase._id,
      partyId: selectedSupplierId,
      contactId: selectedContactId,
      items: returnItems,
      reason: data.reason.trim(),
      notes: data.notes?.trim() || '',
      returnDate: data.returnDate,
      status: isEditMode ? data.status : 'pending',
      totalAmount,
      vatAmount,
      grandTotal: totalAmount + vatAmount,
    };

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    await onSubmit(submitData, submissionId);
  };

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
      <DialogContent className="max-w-[95vw] lg:max-w-4xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5" />
            {defaultValues ? "Edit Purchase Return" : "Create New Purchase Return"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <PartyContactSelector
                allowedRoles={['supplier']}
                value={{ partyId: selectedSupplierId, contactId: selectedContactId }}
                onChange={(val, party) => {
                  const isPartyChange = val.partyId !== selectedSupplierId;

                  setSelectedSupplierId(val.partyId ?? "");
                  setSelectedContactId(val.contactId);

                  if (party) {
                    if (!isEditMode && isPartyChange) {
                      setSelectedPurchase(null);
                      setValue('purchaseId', '');
                      setSelectedItems(new Set());
                      setReturnQuantities({});
                    }
                  }
                }}
                disablePartyTypeSelector={isEditMode}
                disablePartySelector={isEditMode}
                className="w-full"
                layout="vertical"
              />
            </div>

            <div className="space-y-4">
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
                      disabled={isEditMode || !selectedSupplierId || purchases.length === 0 || isLoadingPurchase}
                    >
                      <div className="truncate">
                        {isLoadingPurchase ? (
                          "Loading..."
                        ) : selectedPurchase ? (
                          selectedPurchase.referenceNumber
                        ) : !selectedSupplierId ? (
                          "Select supplier first..."
                        ) : purchases.length === 0 ? (
                          "No eligible purchases"
                        ) : (
                          "Select purchase..."
                        )}
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
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
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
                                <div className="font-medium">
                                  {purchase.referenceNumber}
                                </div>
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

              <div className="space-y-2">
                <Label htmlFor="reason">
                  Reason <span className="text-destructive">*</span>
                </Label>
                <Controller
                  name="reason"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
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
            </div>

            <div className="space-y-4">
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
          </div>

          {selectedPurchase && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base">Select Materials to Return</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {eligibleItems.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      All received materials have been returned
                    </p>
                  </div>
                ) : isDesktop ? (
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
                          const itemId = item.itemId?.toString();
                          const itemName = item.description;
                          const isSelected = selectedItems.has(itemId);

                          const receivedQty = item.receivedQuantity || 0;
                          const returnedQty = item.returnedQuantity || 0;
                          const availableToReturn = receivedQty - returnedQty;

                          return (
                            <React.Fragment key={itemId}>
                              <tr
                                className={cn(
                                  "border-b hover:bg-muted/50",
                                  isSelected && "bg-red-50 dark:bg-red-950/20"
                                )}
                              >
                                <td className="p-3 text-center">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleItemSelection(itemId)}
                                    className="mx-auto"
                                  />
                                </td>
                                <td className="p-3 font-medium">{itemName}</td>
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
                                    <div className="flex items-center justify-end gap-3">
                                      <Label className="text-sm text-muted-foreground whitespace-nowrap">
                                        Return Quantity:
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max={availableToReturn}
                                        placeholder="0.00"
                                        value={returnQuantities[itemId] || ''}
                                        onChange={(e) =>
                                          handleReturnQuantityChange(itemId, e.target.value)
                                        }
                                        className="h-9 w-32"
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
                  <div className="space-y-3">
                    {eligibleItems.map((item: any) => {
                      const itemId = item.itemId?.toString();
                      const itemName = item.description;
                      const isSelected = selectedItems.has(itemId);

                      const receivedQty = item.receivedQuantity || 0;
                      const returnedQty = item.returnedQuantity || 0;
                      const availableToReturn = receivedQty - returnedQty;

                      return (
                        <Card
                          key={itemId}
                          className={cn(
                            "border-2 transition-colors",
                            isSelected && "border-red-600 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                          )}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`item-${itemId}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleItemSelection(itemId)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <Label
                                  htmlFor={`item-${itemId}`}
                                  className="font-medium cursor-pointer"
                                >
                                  {itemName}
                                </Label>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 pt-0">
                            <div className="grid grid-cols-2 gap-3 text-sm">
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
                                  value={returnQuantities[itemId] || ''}
                                  onChange={(e) =>
                                    handleReturnQuantityChange(itemId, e.target.value)
                                  }
                                  className="h-9"
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

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any additional details..."
              {...register("notes")}
              rows={3}
            />
          </div>

          {selectedItems.size > 0 && (
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Materials Selected:</span>
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
              ) : (defaultValues ? "Update Purchase Return" : "Create Purchase Return")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}