// app/documents/debit-notes/debit-note-form.tsx - MINIMAL CHANGES: Only add Return Note selection

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
import { CalendarIcon, ChevronsUpDown, Check, Plus, X, FileText, AlertCircle, Users, Building2, User, Store, List, Calculator } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DebitNote } from "./columns";
import type { IMaterial } from "@/models/Material";
import type { ISupplier } from "@/models/Supplier";
import type { ICustomer } from "@/models/Customer";
import type { IPayee } from "@/models/Payee";
import { formatCurrency } from "@/utils/formatters/currency";
import { UAE_VAT_PERCENTAGE } from "@/utils/constants";
import { Spinner } from "@/components/ui/spinner";

type PartyType = 'customer' | 'supplier' | 'payee' | 'vendor';
type DebitNoteMode = 'items' | 'manual';

type DebitNoteItem = {
  materialId: string;
  materialName: string;
  quantity: number;
  unitCost: number;
  total: number;
};

type DebitNoteFormData = {
  partyType: PartyType;
  partyName: string;
  vendorName?: string;
  returnNoteId?: string; // ✅ NEW: Optional return note selection
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

const getPartyTypeIcon = (type: PartyType) => {
  switch (type) {
    case 'customer': return Users;
    case 'supplier': return Building2;
    case 'payee': return User;
    case 'vendor': return Store;
  }
};

const getPartyTypeLabel = (type: PartyType) => {
  return type.charAt(0).toUpperCase() + type.slice(1);
};

export function DebitNoteForm({ isOpen, onClose, onSubmit, defaultValues, returnNoteData }: DebitNoteFormProps) {
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
      partyType: 'supplier',
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
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [payees, setPayees] = useState<IPayee[]>([]);
  const [returnNotes, setReturnNotes] = useState<any[]>([]); // ✅ NEW
  const [partyPopoverOpen, setPartyPopoverOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [returnNotePopoverOpen, setReturnNotePopoverOpen] = useState(false); // ✅ NEW
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
  const partyType = watch("partyType");
  const debitMode = watch("debitMode");
  const manualAmount = watch("manualAmount") || 0;
  const selectedReturnNoteId = watch("returnNoteId"); // ✅ NEW

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [materialsRes, suppliersRes, customersRes, payeesRes] = await Promise.all([
          fetch("/api/materials"),
          fetch("/api/suppliers"),
          fetch("/api/customers"),
          fetch("/api/payees")
        ]);

        if (materialsRes.ok) setMaterials(await materialsRes.json());
        if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
        if (customersRes.ok) setCustomers(await customersRes.json());
        if (payeesRes.ok) setPayees(await payeesRes.json());
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  // ✅ NEW: Fetch approved return notes when supplier is selected
  useEffect(() => {
    const fetchReturnNotes = async () => {
      if (partyType !== 'supplier' || !partySearchQuery) {
        setReturnNotes([]);
        return;
      }

      try {
        const res = await fetch('/api/return-notes?populate=true');
        if (res.ok) {
          const allReturnNotes = await res.json();
          // Filter to only show approved return notes from selected supplier that don't have a debit note yet
          const eligibleReturnNotes = allReturnNotes.filter(
            (rn: any) =>
              rn.supplierName === partySearchQuery &&
              rn.status === 'approved' &&
              !rn.connectedDocuments?.debitNoteId &&
              !rn.isDeleted
          );
          setReturnNotes(eligibleReturnNotes);
        }
      } catch (error) {
        console.error("Failed to fetch return notes:", error);
      }
    };

    fetchReturnNotes();
  }, [partyType, partySearchQuery]);

  useEffect(() => {
    if (isOpen) {
      if (returnNoteData) {
        const itemsFromReturn = returnNoteData.items.map((item: any) => {
          const material = materials.find(m => m._id === item.materialId);
          return {
            materialId: item.materialId,
            materialName: item.materialName,
            quantity: item.returnQuantity,
            unitCost: material?.unitCost || 0,
            total: item.returnQuantity * (material?.unitCost || 0),
          };
        });

        reset({
          partyType: 'supplier',
          partyName: returnNoteData.supplierName || "",
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
        setPartySearchQuery(returnNoteData.supplierName || "");
      } else if (defaultValues) {
        let detectedPartyType: PartyType = 'supplier';
        let partyNameValue = '';
        
        if (defaultValues.customerName) {
          detectedPartyType = 'customer';
          partyNameValue = defaultValues.customerName;
        } else if (defaultValues.payeeName) {
          detectedPartyType = 'payee';
          partyNameValue = defaultValues.payeeName;
        } else if (defaultValues.vendorName) {
          detectedPartyType = 'vendor';
          partyNameValue = defaultValues.vendorName;
        } else if (defaultValues.supplierName) {
          detectedPartyType = 'supplier';
          partyNameValue = defaultValues.supplierName;
        }
        
        reset({
          partyType: detectedPartyType,
          partyName: partyNameValue,
          items: defaultValues.items || [{ materialId: '', materialName: '', quantity: 1, unitCost: 0, total: 0 }],
          debitDate: defaultValues.debitDate ? new Date(defaultValues.debitDate) : new Date(),
          reason: defaultValues.reason || "",
          notes: defaultValues.notes || "",
          status: defaultValues.status || 'pending',
          discount: defaultValues.discount || 0,
          isTaxPayable: defaultValues.isTaxPayable !== undefined ? defaultValues.isTaxPayable : true,
          debitType: defaultValues.debitType || 'standalone',
          debitMode: 'items',
        });
        setPartySearchQuery(partyNameValue);
      } else {
        reset({
          partyType: 'supplier',
          partyName: "",
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
        setPartySearchQuery("");
      }
    }
  }, [isOpen, defaultValues, returnNoteData, materials, reset]);

  const getPartyList = () => {
    switch (partyType) {
      case 'customer': return customers;
      case 'supplier': return suppliers;
      case 'payee': return payees;
      case 'vendor': return [];
      default: return [];
    }
  };

  const handlePartySelect = (party: ICustomer | ISupplier | IPayee) => {
    setValue("partyName", party.name, { shouldDirty: true });
    setPartySearchQuery(party.name);
    setPartyPopoverOpen(false);
  };

  const handleCreateNew = () => {
    if (partySearchQuery.trim()) {
      setValue("partyName", partySearchQuery.trim(), { shouldDirty: true });
      setPartyPopoverOpen(false);
    }
  };

  // ✅ NEW: Handle return note selection
  const handleReturnNoteSelect = (returnNote: any) => {
    setValue("returnNoteId", returnNote._id, { shouldDirty: true });
    setReturnNotePopoverOpen(false);

    // Auto-fill items from return note
    const itemsFromReturn = returnNote.items.map((item: any) => {
      const material = materials.find(m => m._id === item.materialId);
      return {
        materialId: item.materialId,
        materialName: item.materialName,
        quantity: item.returnQuantity,
        unitCost: material?.unitCost || 0,
        total: item.returnQuantity * (material?.unitCost || 0),
      };
    });

    setValue("items", itemsFromReturn);
    setValue("reason", `Return Note: ${returnNote.returnNumber} - ${returnNote.reason}`);
    setValue("notes", returnNote.notes || '');
    setValue("debitType", 'return');
  };

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

  const handleUnitCostChange = (index: number, value: string) => {
    const unitCost = parseFloat(value);
    const quantity = Number(watchedItems[index].quantity) || 0;
    if (!isNaN(unitCost)) {
      setValue(`items.${index}.total`, quantity * unitCost, { shouldDirty: true });
    } else {
      setValue(`items.${index}.total`, 0, { shouldDirty: true });
    }
  };

  const handleFormSubmit = async (data: DebitNoteFormData) => {
    // Validation for party
    if (partyType === 'vendor') {
      if (!data.vendorName || !data.vendorName.trim()) {
        toast.error("Please enter a vendor name");
        return;
      }
    } else {
      if (!data.partyName || !data.partyName.trim()) {
        toast.error(`Please select or enter a ${partyType}`);
        return;
      }
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

    // Set party name based on type
    switch (partyType) {
      case 'customer':
        submitData.customerName = data.partyName.trim();
        break;
      case 'supplier':
        submitData.supplierName = data.partyName.trim();
        break;
      case 'payee':
        submitData.payeeName = data.partyName.trim();
        break;
      case 'vendor':
        submitData.vendorName = data.vendorName?.trim() || data.partyName?.trim();
        break;
    }

    // ✅ NEW: If return note selected, add it to submit data
    if (data.returnNoteId) {
      const selectedReturnNote = returnNotes.find(rn => rn._id === data.returnNoteId);
      if (selectedReturnNote) {
        submitData.returnNoteId = selectedReturnNote._id;
        submitData.returnNumber = selectedReturnNote.returnNumber;
        submitData.debitType = 'return';
      }
    } else if (returnNoteData && returnNoteData._id) {
      submitData.returnNoteId = returnNoteData._id;
      submitData.returnNumber = returnNoteData.returnNumber;
      submitData.debitType = 'return';
    }

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    await onSubmit(submitData, submissionId);
  };

  const partyList = getPartyList();
  const doesPartyExist = partyList.some(
    (p) => p.name.toLowerCase() === partySearchQuery.trim().toLowerCase()
  );

  const PartyIcon = getPartyTypeIcon(partyType);
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

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
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

          {/* Top Row: Party Type, Party Name, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {!isFromReturnNote && (
              <>
                {/* Party Type Dropdown */}
                <div className="space-y-2">
                  <Label>Party Type</Label>
                  <Select
                    value={partyType}
                    onValueChange={(value: PartyType) => {
                      setValue('partyType', value);
                      setValue('partyName', '');
                      setValue('returnNoteId', ''); // ✅ Clear return note when party type changes
                      setPartySearchQuery('');
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          <PartyIcon className="h-4 w-4" />
                          {getPartyTypeLabel(partyType)}
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(['customer', 'supplier', 'payee', 'vendor'] as PartyType[]).map((type) => {
                        const Icon = getPartyTypeIcon(type);
                        return (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {getPartyTypeLabel(type)}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Party Name */}
                <div className="space-y-2">
                  <Label>
                    {getPartyTypeLabel(partyType)} Name <span className="text-destructive">*</span>
                  </Label>
                  {partyType === 'vendor' ? (
                    <Input
                      placeholder="Enter vendor name..."
                      {...register("vendorName")}
                      disabled={isFromReturnNote}
                    />
                  ) : (
                    <Controller
                      name="partyName"
                      control={control}
                      render={({ field }) => (
                        <Popover
                          open={partyPopoverOpen}
                          onOpenChange={(isOpen) => {
                            setPartyPopoverOpen(isOpen);
                            if (isOpen) setPartySearchQuery(field.value);
                          }}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              ref={field.ref}
                              type="button"
                              variant="outline"
                              role="combobox"
                              className="w-full justify-between"
                              disabled={isFromReturnNote}
                            >
                              <div className="truncate">
                                {field.value || `Select or type ${partyType}...`}
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder={`Search ${partyType}...`}
                                value={partySearchQuery}
                                onValueChange={setPartySearchQuery}
                              />
                              <CommandList
                                className="max-h-[200px] overflow-y-auto"
                                onWheel={(e) => e.stopPropagation()}
                              >
                                <CommandEmpty>
                                  {partySearchQuery.trim() ? `No ${partyType} found.` : "Start typing to search..."}
                                </CommandEmpty>

                                <CommandGroup heading={`Existing ${getPartyTypeLabel(partyType)}s`}>
                                  {partyList
                                    .filter(p => !partySearchQuery || p.name.toLowerCase().includes(partySearchQuery.toLowerCase()))
                                    .map((party) => (
                                      <CommandItem
                                        key={party._id}
                                        value={party.name}
                                        onSelect={() => handlePartySelect(party)}
                                      >
                                        <Check className={cn("mr-2 h-4 w-4", field.value === party.name ? "opacity-100" : "opacity-0")} />
                                        <div className="flex-1">
                                          <span>{party.name}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                </CommandGroup>

                                {partySearchQuery.trim() && !doesPartyExist && (
                                  <CommandGroup heading={`Create New`}>
                                    <CommandItem
                                      onSelect={handleCreateNew}
                                      className="text-primary"
                                      value={partySearchQuery}
                                    >
                                      <Plus className="mr-2 h-4 w-4" />
                                      Create "{partySearchQuery}"
                                    </CommandItem>
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  )}
                </div>
              </>
            )}

            {/* Debit Date */}
            <div className="space-y-2">
              <Label>Debit Date</Label>
              <Controller
                name="debitDate"
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
          </div>

          {/* ✅ NEW: Return Note Selection (Only shows when supplier selected and return notes available) */}
          {!isFromReturnNote && partyType === 'supplier' && returnNotes.length > 0 && (
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
                        <CommandList className="max-h-[200px] overflow-y-auto" onWheel={(e) => e.stopPropagation()}>
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
                    Materials will be auto-filled from this return note
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Field (only in edit mode) */}
          {isEditMode && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                {isTaxPayable ? `${UAE_VAT_PERCENTAGE}% VAT will be added to the subtotal` : 'No VAT will be applied to this debit note'}
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

              {/* Items Mode - Desktop Table */}
              {debitMode === 'items' && isDesktop && (
                <div className="animate-in fade-in-50 duration-300 space-y-4">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium text-sm w-[40px]">#</th>
                          <th className="text-left p-3 font-medium text-sm min-w-[250px]">
                            Material <span className="text-destructive">*</span>
                          </th>
                          <th className="text-left p-3 font-medium text-sm w-[100px]">Quantity</th>
                          <th className="text-left p-3 font-medium text-sm w-[120px]">Unit Cost</th>
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
                                          disabled={isFromReturnNote || !!selectedReturnNoteId}
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
                              <td className="p-3">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="h-10 text-left"
                                  {...register(`items.${index}.unitCost`, {
                                    onChange: (e) => handleUnitCostChange(index, e.target.value)
                                  })}
                                />
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
                                    disabled={isFromReturnNote || !!selectedReturnNoteId}
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
                  {!isFromReturnNote && !selectedReturnNoteId && (
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
                  )}
                </div>
              )}

              {/* Items Mode - Mobile Cards */}
              {debitMode === 'items' && !isDesktop && (
                <div className="animate-in fade-in-50 duration-300 space-y-4">
                  <div className="space-y-4">
                    {fields.map((field, index) => {
                      const material = materials.find(m => m._id === watchedItems[index]?.materialId);

                      return (
                        <Card key={field.id} className="border-2">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-sm">Material #{index + 1}</CardTitle>
                              {fields.length > 1 && !isFromReturnNote && !selectedReturnNoteId && (
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
                                        disabled={isFromReturnNote || !!selectedReturnNoteId}
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
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="h-9"
                                  {...register(`items.${index}.unitCost`, {
                                    onChange: (e) => handleUnitCostChange(index, e.target.value)
                                  })}
                                />
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
                  {!isFromReturnNote && !selectedReturnNoteId && (
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
                  )}
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
            <Button
              type="submit"
              disabled={isSubmitting || (isEditMode && !isDirty)}
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : (defaultValues ? "Update Debit Note" : "Create Debit Note")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}