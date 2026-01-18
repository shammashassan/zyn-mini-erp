// app/documents/credit-notes/credit-note-form.tsx - UPDATED: Return Note Selection

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
import type { CreditNote } from "./columns";
import type { IProduct } from "@/models/Product";
import type { ICustomer } from "@/models/Customer";
import type { ISupplier } from "@/models/Supplier";
import type { IPayee } from "@/models/Payee";
import { formatCurrency } from "@/utils/formatters/currency";
import { UAE_VAT_PERCENTAGE } from "@/utils/constants";
import { Spinner } from "@/components/ui/spinner";

type PartyType = 'customer' | 'supplier' | 'payee' | 'vendor';
type CreditNoteMode = 'items' | 'manual';

type CreditNoteItem = {
  productId: string;
  description: string;
  quantity: number;
  price: number;
  total: number;
};

type CreditNoteFormData = {
  partyType: PartyType;
  partyName: string;
  vendorName?: string;
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
      partyType: 'customer',
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
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [payees, setPayees] = useState<IPayee[]>([]);
  const [returnNotes, setReturnNotes] = useState<any[]>([]);
  const [partyPopoverOpen, setPartyPopoverOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [returnNotePopoverOpen, setReturnNotePopoverOpen] = useState(false);
  const [productPopovers, setProductPopovers] = useState<Record<number, boolean>>({});
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, customersRes, suppliersRes, payeesRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/customers"),
          fetch("/api/suppliers"),
          fetch("/api/payees")
        ]);

        if (productsRes.ok) setProducts(await productsRes.json());
        if (customersRes.ok) setCustomers(await customersRes.json());
        if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
        if (payeesRes.ok) setPayees(await payeesRes.json());
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  // Fetch approved sales return notes when customer is selected
  useEffect(() => {
    const fetchReturnNotes = async () => {
      if (partyType !== 'customer' || !partySearchQuery) {
        setReturnNotes([]);
        return;
      }

      try {
        const res = await fetch('/api/return-notes?populate=true');
        if (res.ok) {
          const allReturnNotes = await res.json();
          const eligibleReturnNotes = allReturnNotes.filter(
            (rn: any) =>
              rn.returnType === 'salesReturn' &&
              rn.customerName === partySearchQuery &&
              rn.status === 'approved' &&
              !rn.connectedDocuments?.creditNoteId &&
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
          // Try ID matching first, fall back to name matching
          let matchedProduct = products.find(p => p._id === item.productId);

          if (!matchedProduct) {
            const productName = item.productName || item.description;
            matchedProduct = products.find(p =>
              p.name.toLowerCase().trim() === productName?.toLowerCase().trim()
            );
          }

          const productName = item.productName || item.description;

          return {
            productId: item.productId || matchedProduct?._id || '',
            description: productName || '',
            quantity: item.returnQuantity || 0,
            price: item.rate || matchedProduct?.price || 0,
            total: item.total || (item.returnQuantity * (item.rate || matchedProduct?.price || 0)),
          };
        });

        reset({
          partyType: 'customer',
          partyName: returnNoteData.customerName || "",
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
        setPartySearchQuery(returnNoteData.customerName || "");
      } else if (defaultValues) {
        let detectedPartyType: PartyType = 'customer';
        let partyNameValue = '';

        if (defaultValues.customerName) {
          detectedPartyType = 'customer';
          partyNameValue = defaultValues.customerName;
        } else if (defaultValues.supplierName) {
          detectedPartyType = 'supplier';
          partyNameValue = defaultValues.supplierName;
        } else if (defaultValues.payeeName) {
          detectedPartyType = 'payee';
          partyNameValue = defaultValues.payeeName;
        } else if (defaultValues.vendorName) {
          detectedPartyType = 'vendor';
          partyNameValue = defaultValues.vendorName;
        }

        const isManualEntry = defaultValues.items?.length === 1 && !(defaultValues.items[0] as any).productId;
        const detectedMode: CreditNoteMode = isManualEntry ? 'manual' : 'items';

        reset({
          partyType: detectedPartyType,
          partyName: partyNameValue,
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
        });
        setPartySearchQuery(partyNameValue);
      } else {
        reset({
          partyType: 'customer',
          partyName: "",
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
        setPartySearchQuery("");
      }
    }
  }, [isOpen, defaultValues, returnNoteData, products, reset]);

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

      return {
        productId: item.productId || matchedProduct?._id || '',
        description: productName || '',
        quantity: item.returnQuantity || 0,
        price: item.rate || matchedProduct?.price || 0,
        total: item.total || (item.returnQuantity * (item.rate || matchedProduct?.price || 0)),
      };
    });

    setValue("items", itemsFromReturn);
    setValue("reason", `Return Note: ${returnNote.returnNumber} - ${returnNote.reason}`);
    setValue("notes", returnNote.notes || '');
    setValue("creditType", 'return');
  };

  const handleProductSelect = (index: number, productId: string) => {
    const product = products.find(p => p._id === productId);
    if (product) {
      setValue(`items.${index}.productId`, productId);
      setValue(`items.${index}.description`, product.name);
      setValue(`items.${index}.price`, product.price);

      const quantity = parseFloat(String(watchedItems[index].quantity)) || 1;
      setValue(`items.${index}.total`, quantity * product.price, { shouldDirty: true });

      setProductPopovers(prev => ({ ...prev, [index]: false }));
    }
  };

  const handleQuantityChange = (index: number, value: string) => {
    const quantity = parseFloat(value);
    const price = Number(watchedItems[index].price) || 0;
    if (!isNaN(quantity)) {
      setValue(`items.${index}.total`, quantity * price, { shouldDirty: true });
    } else {
      setValue(`items.${index}.total`, 0, { shouldDirty: true });
    }
  };

  const handlePriceChange = (index: number, value: string) => {
    const price = parseFloat(value);
    const quantity = Number(watchedItems[index].quantity) || 0;
    if (!isNaN(price)) {
      setValue(`items.${index}.total`, quantity * price, { shouldDirty: true });
    } else {
      setValue(`items.${index}.total`, 0, { shouldDirty: true });
    }
  };

  const handleFormSubmit = async (data: CreditNoteFormData) => {
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
      validItems = data.items.filter(item => item.productId);
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
              ? `Create Credit Note from Return Note ${returnNoteData?.returnNumber}`
              : defaultValues ? "Edit Credit Note" : "Create New Credit Note"}
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
                    Items and quantities are pre-filled. You can adjust prices if needed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Top Row: Party Type, Party Name, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {!isFromReturnNote && (
              <>
                <div className="space-y-2">
                  <Label>Party Type</Label>
                  <Select
                    value={partyType}
                    onValueChange={(value: PartyType) => {
                      setValue('partyType', value);
                      setValue('partyName', '');
                      setValue('returnNoteId', '');
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
                                          {partyType === 'customer' && (party as any).email && (
                                            <div className="text-xs text-muted-foreground">
                                              {(party as any).email}
                                            </div>
                                          )}
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

            <div className="space-y-2">
              <Label>Credit Date</Label>
              <Controller
                name="creditDate"
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

          {/* Return Note Selection */}
          {!isFromReturnNote && partyType === 'customer' && returnNotes.length > 0 && (
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
                    Products will be auto-filled from this return note
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Status Field */}
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

              {creditMode === 'items' && isDesktop && (
                <div className="animate-in fade-in-50 duration-300 space-y-4">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-3 font-medium text-sm w-[40px]">#</th>
                          <th className="text-left p-3 font-medium text-sm min-w-[250px]">
                            Product <span className="text-destructive">*</span>
                          </th>
                          <th className="text-left p-3 font-medium text-sm w-[100px]">Quantity</th>
                          <th className="text-left p-3 font-medium text-sm w-[120px]">Unit Price</th>
                          <th className="text-right p-3 font-medium text-sm w-[100px]">Total</th>
                          <th className="text-center p-3 font-medium text-sm w-[60px]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fields.map((field, index) => {
                          const product = products.find(p => p._id === watchedItems[index]?.productId);

                          return (
                            <tr key={field.id} className="border-b hover:bg-muted/50">
                              <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                              <td className="p-3">
                                <Controller
                                  name={`items.${index}.productId`}
                                  control={control}
                                  render={({ field }) => (
                                    <Popover
                                      open={productPopovers[index]}
                                      onOpenChange={(open) => setProductPopovers(prev => ({ ...prev, [index]: open }))}
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
                                          <span className="truncate">{product?.name || "Select product..."}</span>
                                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                                        <Command>
                                          <CommandInput
                                            placeholder="Search products..."
                                            value={watchedItems[index]?.description || ""}
                                            onValueChange={(val) => setValue(`items.${index}.description`, val)}
                                          />
                                          <CommandList
                                            className="max-h-[200px] overflow-y-auto"
                                            onWheel={(e) => e.stopPropagation()}
                                          >
                                            <CommandEmpty>No product found.</CommandEmpty>
                                            <CommandGroup>
                                              {products.map((prod) => (
                                                <CommandItem
                                                  key={prod._id}
                                                  value={prod.name}
                                                  onSelect={() => handleProductSelect(index, prod._id)}
                                                >
                                                  <Check className={cn("mr-2 h-4 w-4", field.value === prod._id ? "opacity-100" : "opacity-0")} />
                                                  <div className="flex-1">
                                                    <div>{prod.name}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                      {prod.type} • {formatCurrency(prod.price)}
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
                                  {...register(`items.${index}.price`, {
                                    onChange: (e) => handlePriceChange(index, e.target.value)
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
                      onClick={() => append({ productId: '', description: '', quantity: 1, price: 0, total: 0 })}
                      className="w-full gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Product
                    </Button>
                  )}
                </div>
              )}

              {creditMode === 'items' && !isDesktop && (
                <div className="animate-in fade-in-50 duration-300 space-y-4">
                  <div className="space-y-4">
                    {fields.map((field, index) => {
                      const product = products.find(p => p._id === watchedItems[index]?.productId);

                      return (
                        <Card key={field.id} className="border-2">
                          <CardHeader className="pb-2">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-sm">Product #{index + 1}</CardTitle>
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
                                Product <span className="text-destructive">*</span>
                              </Label>
                              <Controller
                                name={`items.${index}.productId`}
                                control={control}
                                render={({ field }) => (
                                  <Popover
                                    open={productPopovers[index]}
                                    onOpenChange={(open) => setProductPopovers(prev => ({ ...prev, [index]: open }))}
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
                                        <span className="truncate">{product?.name || "Select product..."}</span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0" align="start">
                                      <Command>
                                        <CommandInput
                                          placeholder="Search products..."
                                          value={watchedItems[index]?.description || ""}
                                          onValueChange={(val) => setValue(`items.${index}.description`, val)}
                                        />
                                        <CommandList
                                          className="max-h-[200px] overflow-y-auto"
                                          onWheel={(e) => e.stopPropagation()}
                                        >
                                          <CommandEmpty>No product found.</CommandEmpty>
                                          <CommandGroup>
                                            {products.map((prod) => (
                                              <CommandItem
                                                key={prod._id}
                                                value={prod.name}
                                                onSelect={() => handleProductSelect(index, prod._id)}
                                              >
                                                <Check className={cn("mr-2 h-4 w-4", field.value === prod._id ? "opacity-100" : "opacity-0")} />
                                                <div className="flex-1 min-w-0">
                                                  <div className="truncate">{prod.name}</div>
                                                  <div className="text-xs text-muted-foreground truncate">
                                                    {prod.type} • {formatCurrency(prod.price)}
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
                                <Label className="text-xs text-muted-foreground">Unit Price</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  className="h-9"
                                  {...register(`items.${index}.price`, {
                                    onChange: (e) => handlePriceChange(index, e.target.value)
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
                      onClick={() => append({ productId: '', description: '', quantity: 1, price: 0, total: 0 })}
                      className="w-full gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add Product
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