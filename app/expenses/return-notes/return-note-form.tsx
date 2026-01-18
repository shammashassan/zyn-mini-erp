// app/expenses/return-notes/return-note-form.tsx - Sales & Purchase Only with Toggle

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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
  materialId?: string;
  materialName?: string;
  productId?: string;
  productName?: string;
  orderedQuantity?: number;
  receivedQuantity?: number;
  returnedQuantity?: number;
  returnQuantity: number;
  rate?: number;
  total?: number;
};

type ReturnNoteFormData = {
  returnType: 'salesReturn' | 'purchaseReturn';
  supplierName?: string;
  customerName?: string;
  purchaseId?: string;
  invoiceId?: string;
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
  'Customer dissatisfaction',
  'Defective product',
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
      returnType: 'purchaseReturn',
      items: [],
      reason: '',
      notes: '',
      returnDate: new Date(),
      status: 'pending'
    }
  });

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);

  const [selectedEntity, setSelectedEntity] = useState<string>("");
  const [selectedDocument, setSelectedDocument] = useState<any>(null);

  const [entityPopoverOpen, setEntityPopoverOpen] = useState(false);
  const [documentPopoverOpen, setDocumentPopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});

  const [entitySearchQuery, setEntitySearchQuery] = useState("");
  const [isDesktop, setIsDesktop] = useState(true);
  const [initialState, setInitialState] = useState<any>(null);

  const isEditMode = !!defaultValues?._id;
  const returnType = watch('returnType');

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

  // Fetch data based on return type
  useEffect(() => {
    const fetchData = async () => {
      if (!isOpen) return;

      try {
        if (returnType === 'purchaseReturn') {
          const res = await fetch('/api/suppliers');
          if (res.ok) setSuppliers(await res.json());
        } else if (returnType === 'salesReturn') {
          const res = await fetch('/api/customers');
          if (res.ok) setCustomers(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };

    fetchData();
  }, [isOpen, returnType]);

  // Fetch documents when entity is selected
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!selectedEntity) {
        setPurchases([]);
        setInvoices([]);
        return;
      }

      try {
        if (returnType === 'purchaseReturn') {
          const res = await fetch('/api/purchases?populate=true');
          if (res.ok) {
            const allPurchases = await res.json();
            const eligible = allPurchases.filter(
              (p: any) =>
                p.supplierName === selectedEntity &&
                (p.inventoryStatus === 'received' || p.inventoryStatus === 'partially received') &&
                !p.isDeleted
            );
            setPurchases(eligible);
          }
        } else if (returnType === 'salesReturn') {
          const res = await fetch('/api/invoices?populate=true');
          if (res.ok) {
            const allInvoices = await res.json();
            const eligible = allInvoices.filter(
              (inv: any) =>
                inv.customerName === selectedEntity &&
                inv.status === 'approved' &&
                !inv.isDeleted
            );
            setInvoices(eligible);
          }
        }
      } catch (error) {
        console.error("Failed to fetch documents:", error);
      }
    };

    fetchDocuments();
  }, [selectedEntity, returnType]);

  // Reset form when modal opens/closes or return type changes
  useEffect(() => {
    const loadEditMode = async () => {
      if (isOpen && defaultValues) {
        reset({
          ...defaultValues,
          returnDate: defaultValues.returnDate ? new Date(defaultValues.returnDate) : new Date()
        });

        // Set entity
        if (defaultValues.supplierName) {
          setSelectedEntity(defaultValues.supplierName);
          setEntitySearchQuery(defaultValues.supplierName);
        } else if (defaultValues.customerName) {
          setSelectedEntity(defaultValues.customerName);
          setEntitySearchQuery(defaultValues.customerName);
        }

        // ✅ NEW: Load the connected document
        if (defaultValues.connectedDocuments) {
          try {
            if (defaultValues.returnType === 'purchaseReturn' && defaultValues.connectedDocuments.purchaseId) {
              // Fetch the purchase document
              const purchaseId = typeof defaultValues.connectedDocuments.purchaseId === 'string'
                ? defaultValues.connectedDocuments.purchaseId
                : defaultValues.connectedDocuments.purchaseId._id;

              const res = await fetch(`/api/purchases/${purchaseId}`);
              if (res.ok) {
                const purchase = await res.json();
                setSelectedDocument(purchase);
                setValue('purchaseId', purchase._id);

                // Pre-populate selected items and quantities
                if (defaultValues.items && Array.isArray(defaultValues.items)) {
                  const itemsSet = new Set<string>();
                  const quantities: Record<string, number> = {};

                  defaultValues.items.forEach((item: any) => {
                    const itemId = item.materialId;
                    itemsSet.add(itemId);
                    quantities[itemId] = item.returnQuantity;
                  });

                  setSelectedItems(itemsSet);
                  setReturnQuantities(quantities);

                  // Set initial state for dirty checking
                  setInitialState({
                    selectedItems: itemsSet,
                    returnQuantities: quantities,
                    reason: defaultValues.reason,
                    notes: defaultValues.notes || '',
                    status: defaultValues.status,
                    returnDate: defaultValues.returnDate ? new Date(defaultValues.returnDate).toISOString() : ''
                  });
                }
              }
            } else if (defaultValues.returnType === 'salesReturn' && defaultValues.connectedDocuments.invoiceId) {
              // Fetch the invoice document
              const invoiceId = typeof defaultValues.connectedDocuments.invoiceId === 'string'
                ? defaultValues.connectedDocuments.invoiceId
                : defaultValues.connectedDocuments.invoiceId._id;

              const res = await fetch(`/api/invoices/${invoiceId}`);
              if (res.ok) {
                const invoice = await res.json();
                setSelectedDocument(invoice);
                setValue('invoiceId', invoice._id);

                // Pre-populate selected items and quantities
                if (defaultValues.items && Array.isArray(defaultValues.items)) {
                  const itemsSet = new Set<string>();
                  const quantities: Record<string, number> = {};

                  defaultValues.items.forEach((item: any) => {
                    const itemId = item.productName; // For sales returns, use productName as key
                    itemsSet.add(itemId);
                    quantities[itemId] = item.returnQuantity;
                  });

                  setSelectedItems(itemsSet);
                  setReturnQuantities(quantities);

                  // Set initial state for dirty checking
                  setInitialState({
                    selectedItems: itemsSet,
                    returnQuantities: quantities,
                    reason: defaultValues.reason,
                    notes: defaultValues.notes || '',
                    status: defaultValues.status,
                    returnDate: defaultValues.returnDate ? new Date(defaultValues.returnDate).toISOString() : ''
                  });
                }
              }
            }
          } catch (error) {
            console.error('Failed to load connected document:', error);
            toast.error('Failed to load document details');
          }
        }
      } else if (isOpen && !defaultValues) {
        // Reset for new return note
        reset({
          returnType: 'purchaseReturn',
          items: [],
          reason: '',
          notes: '',
          returnDate: new Date(),
          status: 'pending'
        });
        setSelectedEntity("");
        setEntitySearchQuery("");
        setSelectedDocument(null);
        setSelectedItems(new Set());
        setReturnQuantities({});
        setInitialState(null);
      }
    };

    loadEditMode();
  }, [isOpen, defaultValues, reset, setValue]);

  // ✅ ALTERNATIVE: If you want to show loading state while fetching
  const [isLoadingDocument, setIsLoadingDocument] = useState(false);

  useEffect(() => {
    const loadEditMode = async () => {
      if (isOpen && defaultValues) {
        setIsLoadingDocument(true);

        reset({
          ...defaultValues,
          returnDate: defaultValues.returnDate ? new Date(defaultValues.returnDate) : new Date()
        });

        // Set entity
        if (defaultValues.supplierName) {
          setSelectedEntity(defaultValues.supplierName);
          setEntitySearchQuery(defaultValues.supplierName);
        } else if (defaultValues.customerName) {
          setSelectedEntity(defaultValues.customerName);
          setEntitySearchQuery(defaultValues.customerName);
        }

        // Load the connected document
        if (defaultValues.connectedDocuments) {
          try {
            if (defaultValues.returnType === 'purchaseReturn' && defaultValues.connectedDocuments.purchaseId) {
              const purchaseId = typeof defaultValues.connectedDocuments.purchaseId === 'string'
                ? defaultValues.connectedDocuments.purchaseId
                : defaultValues.connectedDocuments.purchaseId._id;

              const res = await fetch(`/api/purchases/${purchaseId}`);
              if (res.ok) {
                const purchase = await res.json();
                setSelectedDocument(purchase);
                setValue('purchaseId', purchase._id);

                // Pre-populate items
                if (defaultValues.items && Array.isArray(defaultValues.items)) {
                  const itemsSet = new Set<string>();
                  const quantities: Record<string, number> = {};

                  defaultValues.items.forEach((item: any) => {
                    const itemId = item.materialId;
                    itemsSet.add(itemId);
                    quantities[itemId] = item.returnQuantity;
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
            } else if (defaultValues.returnType === 'salesReturn' && defaultValues.connectedDocuments.invoiceId) {
              const invoiceId = typeof defaultValues.connectedDocuments.invoiceId === 'string'
                ? defaultValues.connectedDocuments.invoiceId
                : defaultValues.connectedDocuments.invoiceId._id;

              const res = await fetch(`/api/invoices/${invoiceId}`);
              if (res.ok) {
                const invoice = await res.json();
                setSelectedDocument(invoice);
                setValue('invoiceId', invoice._id);

                // Pre-populate items
                if (defaultValues.items && Array.isArray(defaultValues.items)) {
                  const itemsSet = new Set<string>();
                  const quantities: Record<string, number> = {};

                  defaultValues.items.forEach((item: any) => {
                    const itemId = item.productName;
                    itemsSet.add(itemId);
                    quantities[itemId] = item.returnQuantity;
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
                toast.error('Failed to load invoice details');
              }
            }
          } catch (error) {
            console.error('Failed to load connected document:', error);
            toast.error('Failed to load document details');
          }
        }

        setIsLoadingDocument(false);
      } else if (isOpen && !defaultValues) {
        reset({
          returnType: 'purchaseReturn',
          items: [],
          reason: '',
          notes: '',
          returnDate: new Date(),
          status: 'pending'
        });
        setSelectedEntity("");
        setEntitySearchQuery("");
        setSelectedDocument(null);
        setSelectedItems(new Set());
        setReturnQuantities({});
        setInitialState(null);
      }
    };

    loadEditMode();
  }, [isOpen, defaultValues, reset, setValue]);

  // Reset selections when return type changes
  useEffect(() => {
    if (!isEditMode) {
      setSelectedEntity("");
      setEntitySearchQuery("");
      setSelectedDocument(null);
      setSelectedItems(new Set());
      setReturnQuantities({});
    }
  }, [returnType, isEditMode]);

  const handleEntitySelect = (entity: any) => {
    setSelectedEntity(entity.name);
    setEntitySearchQuery(entity.name);

    if (returnType === 'purchaseReturn') {
      setValue('supplierName', entity.name);
    } else {
      setValue('customerName', entity.name);
    }

    setEntityPopoverOpen(false);
    if (!isEditMode) {
      setSelectedDocument(null);
      setValue('purchaseId', '');
      setValue('invoiceId', '');
      setSelectedItems(new Set());
      setReturnQuantities({});
    }
  };

  const handleDocumentSelect = (doc: any) => {
    setSelectedDocument(doc);

    if (returnType === 'purchaseReturn') {
      setValue('purchaseId', doc._id);
    } else {
      setValue('invoiceId', doc._id);
    }

    setDocumentPopoverOpen(false);
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

    if (returnType === 'purchaseReturn') {
      const item = selectedDocument?.items.find((i: any) => i.materialId === itemId);
      if (!item) return;

      const receivedQty = item.receivedQuantity || 0;
      const alreadyReturned = item.returnedQuantity || 0;
      const availableToReturn = receivedQty - alreadyReturned;

      if (numValue > availableToReturn) {
        toast.error(`Cannot return more than ${availableToReturn.toFixed(2)} units`);
        return;
      }
    } else if (returnType === 'salesReturn') {
      // ✅ UPDATED: Check against available quantity for sales returns
      const item = selectedDocument?.items.find((i: any) => i.description === itemId);
      if (!item) return;

      const invoicedQty = item.quantity || 0;
      const alreadyReturned = item.returnedQuantity || 0;
      const availableToReturn = invoicedQty - alreadyReturned;

      if (numValue > availableToReturn) {
        toast.error(`Cannot return more than ${availableToReturn.toFixed(2)} units`);
        return;
      }
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

  const handleFormSubmit = async (data: ReturnNoteFormData) => {
    if (!selectedEntity) {
      toast.error(`Please select a ${returnType === 'purchaseReturn' ? 'supplier' : 'customer'}`);
      return;
    }

    if (!selectedDocument) {
      toast.error(`Please select ${returnType === 'purchaseReturn' ? 'a purchase' : 'an invoice'}`);
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

    if (returnType === 'purchaseReturn') {
      for (const materialId of selectedItems) {
        const item = selectedDocument.items.find((i: any) => i.materialId === materialId);
        const returnQty = returnQuantities[materialId] || 0;

        if (returnQty <= 0) {
          toast.error(`Please enter a valid return quantity for ${item.materialName}`);
          return;
        }

        returnItems.push({
          materialId: item.materialId,
          materialName: item.materialName,
          orderedQuantity: item.quantity,
          receivedQuantity: item.receivedQuantity || 0,
          returnedQuantity: item.returnedQuantity || 0,
          returnQuantity: returnQty,
        });
      }
    } else if (returnType === 'salesReturn') {
      for (const description of selectedItems) {
        const item = selectedDocument.items.find((i: any) => i.description === description);
        const returnQty = returnQuantities[description] || 0;

        if (returnQty <= 0) {
          toast.error(`Please enter a valid return quantity for ${item.description}`);
          return;
        }

        returnItems.push({
          productId: item.productId || '',
          productName: item.description,
          returnQuantity: returnQty,
          rate: item.rate,
          total: returnQty * item.rate,
        });
      }
    }

    const submitData: any = {
      returnType: data.returnType,
      items: returnItems,
      reason: data.reason.trim(),
      notes: data.notes?.trim() || '',
      returnDate: data.returnDate,
      status: isEditMode ? data.status : 'pending'
    };

    if (returnType === 'purchaseReturn') {
      submitData.purchaseId = selectedDocument._id;
      submitData.supplierName = selectedEntity;
    } else if (returnType === 'salesReturn') {
      submitData.invoiceId = selectedDocument._id;
      submitData.customerName = selectedEntity;

      // Calculate totals for sales return
      const totalAmount = returnItems.reduce((sum, item) => sum + (item.total || 0), 0);
      submitData.totalAmount = totalAmount;
      submitData.grandTotal = totalAmount;
    }

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    await onSubmit(submitData, submissionId);
  };

  const eligibleItems = useMemo(() => {
    if (!selectedDocument?.items) return []
    if (returnType === 'purchaseReturn') {
      if (!selectedDocument?.items) return [];
      return selectedDocument.items.filter((item: any) => {
        const receivedQty = item.receivedQuantity || 0;
        const returnedQty = item.returnedQuantity || 0;
        return receivedQty > returnedQty;
      });
    } else if (returnType === 'salesReturn') {
      // ✅ UPDATED: Filter out items that are fully returned
      if (!selectedDocument?.items) return [];
      return selectedDocument.items.filter((item: any) => {
        const invoicedQty = item.quantity || 0;
        const returnedQty = item.returnedQuantity || 0;
        return invoicedQty > returnedQty;
      });
    }
    return [];
  }, [selectedDocument, returnType]);

  const getEntityList = () => {
    if (returnType === 'purchaseReturn') return suppliers;
    if (returnType === 'salesReturn') return customers;
    return [];
  };

  const getDocumentList = () => {
    if (returnType === 'purchaseReturn') return purchases;
    if (returnType === 'salesReturn') return invoices;
    return [];
  };

  const getEntityLabel = () => {
    return returnType === 'purchaseReturn' ? 'Supplier' : 'Customer';
  };

  const getDocumentLabel = () => {
    return returnType === 'purchaseReturn' ? 'Purchase' : 'Invoice';
  };

  const handleReturnTypeChange = (value: string) => {
    if (value && (value === 'purchaseReturn' || value === 'salesReturn')) {
      setValue("returnType", value as 'salesReturn' | 'purchaseReturn');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-4xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5" />
            {defaultValues ? "Edit Return Note" : "Create New Return Note"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Return Type Toggle */}
          {!isEditMode && (
            <div className="space-y-2">
              <Label>Return Type <span className="text-destructive">*</span></Label>
              <Controller
                name="returnType"
                control={control}
                render={({ field }) => (
                  <ToggleGroup
                    type="single"
                    value={field.value}
                    onValueChange={handleReturnTypeChange}
                    variant="outline"
                    className="w-full grid grid-cols-2"
                  >
                    <ToggleGroupItem value="purchaseReturn" className="flex-1">
                      Purchase Return
                    </ToggleGroupItem>
                    <ToggleGroupItem value="salesReturn" className="flex-1">
                      Sales Return
                    </ToggleGroupItem>
                  </ToggleGroup>
                )}
              />
            </div>
          )}

          {/* Entity, Document, and Date Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Entity Selection */}
            <div className="space-y-2">
              <Label>
                {getEntityLabel()} <span className="text-destructive">*</span>
              </Label>
              <Popover open={entityPopoverOpen} onOpenChange={setEntityPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    disabled={isEditMode}
                  >
                    <div className="truncate">
                      {selectedEntity || `Select ${getEntityLabel().toLowerCase()}...`}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={`Search ${getEntityLabel().toLowerCase()}s...`}
                      value={entitySearchQuery}
                      onValueChange={setEntitySearchQuery}
                    />
                    <CommandList
                      className="max-h-[200px] overflow-y-auto"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <CommandEmpty>No {getEntityLabel().toLowerCase()} found.</CommandEmpty>
                      <CommandGroup>
                        {getEntityList()
                          .filter(entity =>
                            !entitySearchQuery ||
                            entity.name.toLowerCase().includes(entitySearchQuery.toLowerCase())
                          )
                          .map((entity) => (
                            <CommandItem
                              key={entity._id}
                              value={entity.name}
                              onSelect={() => handleEntitySelect(entity)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedEntity === entity.name ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1">
                                <span>{entity.name}</span>
                                {entity.city && entity.district && (
                                  <div className="text-xs text-muted-foreground">
                                    {entity.city}, {entity.district}
                                  </div>
                                )}
                                {returnType === 'salesReturn' && (entity.email || entity.phone) && (
                                  <div className="text-xs text-muted-foreground">
                                    {entity.email || entity.phone}
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

            {/* Document Selection */}
            <div className="space-y-2">
              <Label>
                {getDocumentLabel()} <span className="text-destructive">*</span>
              </Label>
              <Popover open={documentPopoverOpen} onOpenChange={setDocumentPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                    disabled={isEditMode || !selectedEntity || getDocumentList().length === 0 || isLoadingDocument}
                  >
                    <div className="truncate">
                      {isLoadingDocument ? (
                        "Loading..."
                      ) : selectedDocument ? (
                        returnType === 'purchaseReturn' ? selectedDocument.referenceNumber : selectedDocument.invoiceNumber
                      ) : !selectedEntity ? (
                        `Select ${getEntityLabel().toLowerCase()} first...`
                      ) : getDocumentList().length === 0 ? (
                        `No eligible ${getDocumentLabel().toLowerCase()}s`
                      ) : (
                        `Select ${getDocumentLabel().toLowerCase()}...`
                      )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder={`Search ${getDocumentLabel().toLowerCase()}s...`} />
                    <CommandList
                      className="max-h-[200px] overflow-y-auto"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <CommandEmpty>No {getDocumentLabel().toLowerCase()}s found.</CommandEmpty>
                      <CommandGroup>
                        {getDocumentList().map((doc) => (
                          <CommandItem
                            key={doc._id}
                            value={returnType === 'purchaseReturn' ? doc.referenceNumber : doc.invoiceNumber}
                            onSelect={() => handleDocumentSelect(doc)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedDocument?._id === doc._id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">
                                {returnType === 'purchaseReturn' ? doc.referenceNumber : doc.invoiceNumber}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {returnType === 'purchaseReturn'
                                  ? `${doc.inventoryStatus} • ${doc.items?.length || 0} items`
                                  : `${doc.status} • ${doc.items?.length || 0} items`}
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

          {/* Reason and Status */}
          <div className={cn("flex flex-col gap-4", isEditMode && "sm:flex-row")}>
            <div className="flex-1 space-y-2">
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
              <div className="space-y-2 w-full sm:w-[200px]">
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

          {/* Items Selection */}
          {selectedDocument && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-base">Select Items to Return</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {eligibleItems.length === 0 ? (
                  <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      {returnType === 'purchaseReturn'
                        ? 'All received items have been returned'
                        : 'No items available for return'}
                    </p>
                  </div>
                ) : isDesktop ? (
                  /* Desktop Table View */
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-center p-3 font-medium text-sm w-[60px]">Select</th>
                          <th className="text-left p-3 font-medium text-sm min-w-[200px]">
                            {returnType === 'purchaseReturn' ? 'Material' : 'Product'}
                          </th>
                          {returnType === 'purchaseReturn' && (
                            <>
                              <th className="text-center p-3 font-medium text-sm w-[100px]">Ordered</th>
                              <th className="text-center p-3 font-medium text-sm w-[100px]">Received</th>
                              <th className="text-center p-3 font-medium text-sm w-[100px]">Returned</th>
                              <th className="text-center p-3 font-medium text-sm w-[100px]">Available</th>
                            </>
                          )}
                          {returnType === 'salesReturn' && (
                            <>
                              <th className="text-center p-3 font-medium text-sm w-[100px]">Invoiced</th>
                              <th className="text-center p-3 font-medium text-sm w-[100px]">Returned</th>
                              <th className="text-center p-3 font-medium text-sm w-[100px]">Available</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {eligibleItems.map((item: any) => {
                          const itemId = returnType === 'purchaseReturn' ? item.materialId : item.description;
                          const itemName = returnType === 'purchaseReturn' ? item.materialName : item.description;
                          const isSelected = selectedItems.has(itemId);

                          let availableToReturn = 0;
                          if (returnType === 'purchaseReturn') {
                            const receivedQty = item.receivedQuantity || 0;
                            const returnedQty = item.returnedQuantity || 0;
                            availableToReturn = receivedQty - returnedQty;
                          } else {
                            availableToReturn = item.quantity;
                          }

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
                                {returnType === 'purchaseReturn' && (
                                  <>
                                    <td className="p-3 text-center tabular-nums">{item.quantity}</td>
                                    <td className="p-3 text-center tabular-nums">{(item.receivedQuantity || 0).toFixed(2)}</td>
                                    <td className="p-3 text-center tabular-nums text-orange-600">
                                      {(item.returnedQuantity || 0).toFixed(2)}
                                    </td>
                                    <td className="p-3 text-center tabular-nums text-green-600 font-semibold">
                                      {availableToReturn.toFixed(2)}
                                    </td>
                                  </>
                                )}
                                {returnType === 'salesReturn' && (
                                  <>
                                    <td className="p-3 text-center tabular-nums">{item.quantity.toFixed(2)}</td>
                                    <td className="p-3 text-center tabular-nums text-orange-600">
                                      {(item.returnedQuantity || 0).toFixed(2)}
                                    </td>
                                    <td className="p-3 text-center tabular-nums text-green-600 font-semibold">
                                      {((item.quantity || 0) - (item.returnedQuantity || 0)).toFixed(2)}
                                    </td>
                                  </>
                                )}
                              </tr>
                              {isSelected && (
                                <tr className={cn("border-b", isSelected && "bg-red-50 dark:bg-red-950/20")}>
                                  <td colSpan={returnType === 'purchaseReturn' ? 6 : 5} className="p-3">
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
                  /* Mobile Card View */
                  <div className="space-y-3">
                    {eligibleItems.map((item: any) => {
                      const itemId = returnType === 'purchaseReturn' ? item.materialId : item.description;
                      const itemName = returnType === 'purchaseReturn' ? item.materialName : item.description;
                      const isSelected = selectedItems.has(itemId);

                      let availableToReturn = 0;
                      if (returnType === 'purchaseReturn') {
                        const receivedQty = item.receivedQuantity || 0;
                        const returnedQty = item.returnedQuantity || 0;
                        availableToReturn = receivedQty - returnedQty;
                      } else {
                        availableToReturn = item.quantity;
                      }

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
                              {returnType === 'purchaseReturn' && (
                                <>
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">Ordered</div>
                                    <div className="font-medium">{item.quantity}</div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">Received</div>
                                    <div className="font-medium">{(item.receivedQuantity || 0).toFixed(2)}</div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">Returned</div>
                                    <div className="font-medium text-orange-600">{(item.returnedQuantity || 0).toFixed(2)}</div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">Available</div>
                                    <div className="font-semibold text-green-600">{availableToReturn.toFixed(2)}</div>
                                  </div>
                                </>
                              )}
                              {returnType === 'salesReturn' && (
                                <>
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">Invoiced</div>
                                    <div className="font-medium">{item.quantity.toFixed(2)}</div>
                                  </div>
                                  <div className="space-y-1">
                                    <div className="text-xs text-muted-foreground">Returned</div>
                                    <div className="font-medium text-orange-600">{(item.returnedQuantity || 0).toFixed(2)}</div>
                                  </div>
                                  <div className="space-y-1 col-span-2">
                                    <div className="text-xs text-muted-foreground">Available</div>
                                    <div className="font-semibold text-green-600">
                                      {((item.quantity || 0) - (item.returnedQuantity || 0)).toFixed(2)}
                                    </div>
                                  </div>
                                </>
                              )}
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