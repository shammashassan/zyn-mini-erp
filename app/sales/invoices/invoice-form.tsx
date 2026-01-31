// app/sales/invoices/invoice-form.tsx - FINAL: Using PartyContactSelector, no legacy fields

"use client";

import React, { useEffect, useState } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronsUpDown, Check, Plus, PlusCircle, X, FileText, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import type { IProduct } from "@/models/Product";
import type { Invoice } from "./columns";
import { formatCurrency } from "@/utils/formatters/currency";
import { UAE_VAT_PERCENTAGE } from "@/utils/constants";
import { Spinner } from "@/components/ui/spinner";
import { PartyContactSelector } from "@/components/PartyContactSelector";

type InvoiceItem = {
  productId?: string;
  description: string;
  quantity: number;
  rate: number;
  total: number;
  shouldCreateProduct?: boolean;
};

type InvoiceFormData = {
  partyId: string;
  contactId?: string;
  items: InvoiceItem[];
  discount: number;
  notes: string;
  quotationId?: string;
  invoiceDate: Date;
  status: 'pending' | 'approved' | 'cancelled';
};

interface ConnectedQuotation {
  _id: string;
  invoiceNumber: string;
  grandTotal: number;
  discount: number;
  items: InvoiceItem[];
}

interface InvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, id?: string) => Promise<void>;
  defaultValues?: Invoice | null;
}

export function InvoiceForm({ isOpen, onClose, onSubmit, defaultValues }: InvoiceFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, isDirty }
  } = useForm<InvoiceFormData>({
    defaultValues: {
      partyId: "",
      contactId: undefined,
      items: [{ productId: "", description: "", quantity: 1, rate: 0, total: 0 }],
      discount: 0,
      notes: "",
      invoiceDate: new Date(),
      status: 'pending',
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const [products, setProducts] = useState<IProduct[]>([]);
  const [quotations, setQuotations] = useState<ConnectedQuotation[]>([]);
  const [quotationPopoverOpen, setQuotationPopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [productPopovers, setProductPopovers] = useState<Record<number, boolean>>({});
  const [productSearchQueries, setProductSearchQueries] = useState<Record<number, string>>({});
  const [loadingQuotations, setLoadingQuotations] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  const watchedItems = watch("items");
  const partyId = watch("partyId");
  const quotationId = watch("quotationId");
  const discount = watch("discount");

  const isEditMode = !!defaultValues?._id;

  // Calculate totals
  const grossTotal = watchedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  const subTotal = Math.max(grossTotal - (Number(discount) || 0), 0);
  const vatAmount = subTotal * (UAE_VAT_PERCENTAGE / 100);
  const grandTotal = subTotal + vatAmount;
  const totalItems = watchedItems.filter(item => item.description).length;

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsRes = await fetch("/api/products");
        if (productsRes.ok) setProducts(await productsRes.json());
      } catch (error) {
        console.error("Failed to fetch products:", error);
      }
    };
    fetchProducts();
  }, []);

  useEffect(() => {
    if (!partyId || !isOpen || isEditMode) return;

    const fetchQuotations = async () => {
      setLoadingQuotations(true);
      try {
        const res = await fetch(`/api/quotations?partyId=${partyId}&populate=true`);
        if (res.ok) {
          const quotations = await res.json();
          const availableQuotations = quotations.filter(
            (quotation: any) =>
              (quotation.status === 'approved' || quotation.status === 'sent') &&
              (!quotation.connectedDocuments?.invoiceIds ||
                quotation.connectedDocuments.invoiceIds.length === 0)
          );
          setQuotations(availableQuotations);
        }
      } catch (error) {
        console.error("Failed to fetch quotations:", error);
      } finally {
        setLoadingQuotations(false);
      }
    };

    fetchQuotations();
  }, [partyId, isOpen, isEditMode]);

  useEffect(() => {
    if (isOpen) {
      if (defaultValues) {
        // ✅ Extract party/contact IDs correctly
        const partyIdValue = typeof defaultValues.partyId === 'object'
          ? defaultValues.partyId._id
          : defaultValues.partyId;

        reset({
          partyId: partyIdValue || "",
          contactId: defaultValues.contactId?.toString() || undefined,
          items: defaultValues.items || [{ productId: "", description: "", quantity: 1, rate: 0, total: 0 }],
          discount: defaultValues.discount || 0,
          notes: defaultValues.notes || "",
          quotationId: "",
          invoiceDate: defaultValues.invoiceDate ? new Date(defaultValues.invoiceDate) : new Date(),
          status: defaultValues.status || 'pending',
        });
      } else {
        reset({
          partyId: "",
          contactId: undefined,
          items: [{ productId: "", description: "", quantity: 1, rate: 0, total: 0 }],
          discount: 0,
          notes: "",
          quotationId: "",
          invoiceDate: new Date(),
          status: 'pending',
        });
      }
    }
  }, [isOpen, defaultValues, reset]);

  const handleQuotationSelect = (quotation: ConnectedQuotation) => {
    setValue("quotationId", quotation._id, { shouldDirty: true });
    setValue("items", quotation.items, { shouldDirty: true });
    setValue("discount", quotation.discount, { shouldDirty: true });
    setQuotationPopoverOpen(false);
    toast.success(`Linked quotation ${quotation.invoiceNumber}`);
  };

  const handleProductSelect = (index: number, product: IProduct) => {
    setValue(`items.${index}.productId`, product._id, { shouldDirty: true });
    setValue(`items.${index}.description`, product.name, { shouldDirty: true });
    setValue(`items.${index}.rate`, product.price, { shouldDirty: true });

    const quantity = parseFloat(String(watchedItems[index].quantity)) || 1;
    setValue(`items.${index}.total`, quantity * product.price, { shouldDirty: true });

    setProductPopovers(prev => ({ ...prev, [index]: false }));
    setProductSearchQueries(prev => ({ ...prev, [index]: "" }));
  };

  const handleCreateCustomProduct = (index: number) => {
    const searchQuery = productSearchQueries[index] || "";
    if (searchQuery.trim()) {
      setValue(`items.${index}.productId`, "", { shouldDirty: true });
      setValue(`items.${index}.description`, searchQuery.trim(), { shouldDirty: true });
      setValue(`items.${index}.shouldCreateProduct`, false, { shouldDirty: true });
      setProductPopovers(prev => ({ ...prev, [index]: false }));
      setProductSearchQueries(prev => ({ ...prev, [index]: "" }));
    }
  };

  const handleMarkForProductCreation = (index: number) => {
    const searchQuery = productSearchQueries[index] || "";
    if (searchQuery.trim()) {
      setValue(`items.${index}.productId`, "", { shouldDirty: true });
      setValue(`items.${index}.description`, searchQuery.trim(), { shouldDirty: true });
      setValue(`items.${index}.shouldCreateProduct`, true, { shouldDirty: true });
      setProductPopovers(prev => ({ ...prev, [index]: false }));
      setProductSearchQueries(prev => ({ ...prev, [index]: "" }));
      toast.info(`"${searchQuery}" will be created as a product when invoice is submitted`);
    }
  };

  const handleCreateNewProduct = async (index: number) => {
    const searchQuery = productSearchQueries[index] || "";
    if (!searchQuery.trim()) return;

    try {
      const productPayload = {
        name: searchQuery.trim(),
        type: "General", // Default type
        price: 0, // Default price, user can adjust in the rate field
      };

      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(productPayload),
      });

      if (response.ok) {
        const newProduct = await response.json();
        toast.success(`Product "${searchQuery}" created successfully`);

        // Refresh products list
        const productsRes = await fetch("/api/products");
        if (productsRes.ok) {
          const updatedProducts = await productsRes.json();
          setProducts(updatedProducts);
        }

        // Set the newly created product in the form
        setValue(`items.${index}.productId`, newProduct._id, { shouldDirty: true });
        setValue(`items.${index}.description`, newProduct.name, { shouldDirty: true });
        setValue(`items.${index}.rate`, newProduct.price, { shouldDirty: true });

        const quantity = parseFloat(String(watchedItems[index].quantity)) || 1;
        setValue(`items.${index}.total`, quantity * newProduct.price, { shouldDirty: true });
      } else {
        const error = await response.json();
        toast.error("Failed to create product", {
          description: error.error || "Please try again"
        });
      }
    } catch (error) {
      console.error("Error creating product:", error);
      toast.error("Failed to create product");
    } finally {
      setProductPopovers(prev => ({ ...prev, [index]: false }));
      setProductSearchQueries(prev => ({ ...prev, [index]: "" }));
    }
  };

  const handleQuantityChange = (index: number, value: string) => {
    const quantity = parseFloat(value);
    const rate = Number(watchedItems[index].rate) || 0;
    if (!isNaN(quantity)) {
      setValue(`items.${index}.total`, quantity * rate, { shouldDirty: true });
    } else {
      setValue(`items.${index}.total`, 0, { shouldDirty: true });
    }
  };

  const handleRateChange = (index: number, value: string) => {
    const rate = parseFloat(value);
    const quantity = Number(watchedItems[index].quantity) || 0;
    setValue(`items.${index}.rate`, isNaN(rate) ? 0 : rate, { shouldDirty: true });
    if (!isNaN(rate)) {
      setValue(`items.${index}.total`, quantity * rate, { shouldDirty: true });
    } else {
      setValue(`items.${index}.total`, 0, { shouldDirty: true });
    }
  };

  const handleFormSubmit = async (data: InvoiceFormData) => {
    // ✅ Validation
    if (!data.partyId) {
      toast.error("Please select a customer (Party)");
      return;
    }

    if (!data.invoiceDate) {
      toast.error("Please select an invoice date");
      return;
    }

    const validItems = data.items.filter(item => item.description);
    if (validItems.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    const calculatedGrossTotal = validItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    if (data.discount > calculatedGrossTotal) {
      toast.error("Discount cannot exceed gross total");
      return;
    }

    // ✅ Create products for items marked for creation (only on new invoices)
    if (!isEditMode) {
      const itemsWithProductIds = await Promise.all(
        validItems.map(async (item) => {
          if (item.shouldCreateProduct && item.description && !item.productId) {
            try {
              const productPayload = {
                name: item.description.trim(),
                type: "General",
                price: Number(item.rate) || 0,
              };

              const response = await fetch("/api/products", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(productPayload),
              });

              if (response.ok) {
                const newProduct = await response.json();
                toast.success(`Product "${item.description}" created`);
                return {
                  ...item,
                  productId: newProduct._id,
                  shouldCreateProduct: false,
                };
              } else {
                const error = await response.json();
                toast.error(`Failed to create product "${item.description}"`, {
                  description: error.error || "Continuing with custom item"
                });
                return { ...item, shouldCreateProduct: false };
              }
            } catch (error) {
              console.error("Error creating product:", error);
              toast.error(`Failed to create product "${item.description}"`);
              return { ...item, shouldCreateProduct: false };
            }
          }
          return item;
        })
      );

      // Use the processed items
      validItems.splice(0, validItems.length, ...itemsWithProductIds);
    }

    const submitData = {
      partyId: data.partyId,
      contactId: data.contactId,
      invoiceDate: data.invoiceDate,
      items: validItems.map(item => ({
        productId: item.productId || '',
        description: item.description,
        quantity: Number(item.quantity) || 0,
        rate: Number(item.rate) || 0,
        total: Number(item.total) || 0
      })),
      discount: Number(data.discount) || 0,
      notes: data.notes,
      status: isEditMode ? data.status : "pending",
      connectedDocuments: !isEditMode && data.quotationId ? { quotationId: data.quotationId } : {},
    };

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    await onSubmit(submitData, submissionId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isEditMode ? "Edit Invoice" : "Create Invoice"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Main Top Grid */}
          <div className={cn("grid grid-cols-1 gap-4", isEditMode ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
            {/* ✅ Customer Field - PartyContactSelector */}
            <div>
              <Controller
                name="partyId"
                control={control}
                render={({ field }) => (
                  <PartyContactSelector
                    value={{ partyId: field.value, contactId: watch('contactId') }}
                    onChange={(val) => {
                      field.onChange(val.partyId);
                      setValue('contactId', val.contactId);
                    }}
                    allowedRoles={['customer']}
                    showCreateButton={true}
                    className="w-full"
                    layout="vertical"
                  />
                )}
              />
            </div>

            {/* Date Field */}
            <div className="space-y-2">
              <Label>Invoice Date</Label>
              <Controller
                name="invoiceDate"
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

            {/* Status Field (Edit Mode Only) */}
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

          {/* Quotation Link Section */}
          {!isEditMode && partyId && quotations.length > 0 && (
            <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <Label className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
                <FileText className="h-4 w-4" />
                Link Approved Quotation (Optional)
              </Label>
              <Popover open={quotationPopoverOpen} onOpenChange={setQuotationPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" className="w-full justify-between">
                    {quotationId
                      ? quotations.find(q => q._id === quotationId)?.invoiceNumber
                      : loadingQuotations
                        ? "Loading quotations..."
                        : "Select quotation..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                  <Command>
                    <CommandList
                      className="max-h-[200px] overflow-y-auto"
                      onWheel={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onTouchMove={(e) => e.stopPropagation()}
                    >
                      <CommandEmpty>No approved quotations found.</CommandEmpty>
                      <CommandGroup>
                        {quotations.map((quotation) => (
                          <CommandItem
                            key={quotation._id}
                            value={quotation._id}
                            onSelect={() => handleQuotationSelect(quotation)}
                          >
                            <Check className={cn("mr-2 h-4 w-4", quotationId === quotation._id ? "opacity-100" : "opacity-0")} />
                            <div>
                              <div className="font-medium">{quotation.invoiceNumber}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatCurrency(quotation.grandTotal)}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {quotationId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setValue("quotationId", "", { shouldDirty: true })}
                  className="text-xs"
                >
                  Clear Selection
                </Button>
              )}
            </div>
          )}

          {/* Items Section */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDesktop ? (
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-sm w-[40px]">#</th>
                        <th className="text-left p-3 font-medium text-sm min-w-[250px]">Description</th>
                        <th className="text-left p-3 font-medium text-sm w-[100px]">Qty</th>
                        <th className="text-left p-3 font-medium text-sm w-[100px]">Rate</th>
                        <th className="text-right p-3 font-medium text-sm w-[100px]">Total</th>
                        <th className="text-center p-3 font-medium text-sm w-[60px]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => (
                        <tr key={field.id} className="border-b hover:bg-muted/50">
                          <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                          <td className="p-3">
                            <Controller
                              name={`items.${index}.description`}
                              control={control}
                              render={({ field }) => {
                                const searchQuery = productSearchQueries[index] || "";
                                const doesProductExist = products.some(
                                  (p) => p.name.toLowerCase() === searchQuery.trim().toLowerCase()
                                );

                                return (
                                  <Popover
                                    open={productPopovers[index]}
                                    onOpenChange={(open) => {
                                      setProductPopovers(prev => ({ ...prev, [index]: open }));
                                      if (open) {
                                        setProductSearchQueries(prev => ({ ...prev, [index]: field.value || "" }));
                                      }
                                    }}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between h-10 font-normal"
                                      >
                                        <span className="truncate">{field.value || "Select or type product..."}</span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                                      <Command shouldFilter={false}>
                                        <CommandInput
                                          placeholder="Search or type new product..."
                                          value={searchQuery}
                                          onValueChange={(value) => {
                                            setProductSearchQueries(prev => ({ ...prev, [index]: value }));
                                            field.onChange(value);
                                          }}
                                        />
                                        <CommandList
                                          className="max-h-[200px] overflow-y-auto"
                                          onWheel={(e) => e.stopPropagation()}
                                          onTouchStart={(e) => e.stopPropagation()}
                                          onTouchMove={(e) => e.stopPropagation()}
                                        >
                                          <CommandEmpty>No product found.</CommandEmpty>

                                          {products.filter(product =>
                                            !searchQuery || product.name.toLowerCase().includes(searchQuery.toLowerCase())
                                          ).length > 0 && (
                                              <CommandGroup heading="Existing Products">
                                                {products
                                                  .filter(product =>
                                                    !searchQuery || product.name.toLowerCase().includes(searchQuery.toLowerCase())
                                                  )
                                                  .map((product) => (
                                                    <CommandItem
                                                      key={String(product._id)}
                                                      value={product.name}
                                                      onSelect={() => handleProductSelect(index, product)}
                                                    >
                                                      <Check className={cn("mr-2 h-4 w-4", field.value === product.name ? "opacity-100" : "opacity-0")} />
                                                      <div>
                                                        <div>{product.name}</div>
                                                        <div className="text-xs text-muted-foreground">
                                                          {formatCurrency(product.price)}
                                                        </div>
                                                      </div>
                                                    </CommandItem>
                                                  ))
                                                }
                                              </CommandGroup>
                                            )}

                                          {searchQuery.trim() && !doesProductExist && (
                                            <CommandGroup heading="Add Custom Item">
                                              <CommandItem
                                                onSelect={() => handleCreateCustomProduct(index)}
                                                className="text-primary"
                                                value={searchQuery}
                                              >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Use "{searchQuery}"
                                              </CommandItem>
                                              <CommandItem
                                                onSelect={() => handleMarkForProductCreation(index)}
                                                className="text-green-600 dark:text-green-400"
                                                value={`create-${searchQuery}`}
                                              >
                                                <PlusCircle className="mr-2 h-4 w-4" />
                                                Create "{searchQuery}"
                                              </CommandItem>
                                            </CommandGroup>
                                          )}
                                        </CommandList>
                                      </Command>
                                    </PopoverContent>
                                  </Popover>
                                );
                              }}
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
                              step="any"
                              min="0"
                              className="h-10 text-left"
                              {...register(`items.${index}.rate`, {
                                onChange: (e) => handleRateChange(index, e.target.value)
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
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="border-2">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm">Item #{index + 1}</CardTitle>
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
                          <Label className="text-xs text-muted-foreground">Description</Label>
                          <Controller
                            name={`items.${index}.description`}
                            control={control}
                            render={({ field }) => {
                              const searchQuery = productSearchQueries[index] || "";
                              const doesProductExist = products.some(
                                (p) => p.name.toLowerCase() === searchQuery.trim().toLowerCase()
                              );

                              return (
                                <Popover
                                  open={productPopovers[index]}
                                  onOpenChange={(open) => {
                                    setProductPopovers(prev => ({ ...prev, [index]: open }));
                                    if (open) {
                                      setProductSearchQueries(prev => ({ ...prev, [index]: field.value || "" }));
                                    }
                                  }}
                                >
                                  <PopoverTrigger asChild>
                                    <Button type="button" variant="outline" role="combobox" className="w-full justify-between h-9 text-sm font-normal">
                                      <span className="truncate">{field.value || "Select or type product..."}</span>
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0" align="start">
                                    <Command shouldFilter={false}>
                                      <CommandInput
                                        placeholder="Search or type new product..."
                                        value={searchQuery}
                                        onValueChange={(value) => {
                                          setProductSearchQueries(prev => ({ ...prev, [index]: value }));
                                          field.onChange(value);
                                        }}
                                      />
                                      <CommandList
                                        className="max-h-[200px] overflow-y-auto"
                                        onWheel={(e) => e.stopPropagation()}
                                        onTouchStart={(e) => e.stopPropagation()}
                                        onTouchMove={(e) => e.stopPropagation()}
                                      >
                                        <CommandEmpty>No product found.</CommandEmpty>

                                        {products.filter(product =>
                                          !searchQuery || product.name.toLowerCase().includes(searchQuery.toLowerCase())
                                        ).length > 0 && (
                                            <CommandGroup heading="Existing Products">
                                              {products
                                                .filter(product =>
                                                  !searchQuery || product.name.toLowerCase().includes(searchQuery.toLowerCase())
                                                )
                                                .map((product) => (
                                                  <CommandItem
                                                    key={String(product._id)}
                                                    value={product.name}
                                                    onSelect={() => handleProductSelect(index, product)}
                                                  >
                                                    <Check className={cn("mr-2 h-4 w-4", field.value === product.name ? "opacity-100" : "opacity-0")} />
                                                    <div className="flex-1 min-w-0">
                                                      <div className="truncate">{product.name}</div>
                                                      <div className="text-xs text-muted-foreground">{formatCurrency(product.price)}</div>
                                                    </div>
                                                  </CommandItem>
                                                ))
                                              }
                                            </CommandGroup>
                                          )}

                                        {searchQuery.trim() && !doesProductExist && (
                                          <CommandGroup heading="Add Custom Item">
                                            <CommandItem
                                              onSelect={() => handleCreateCustomProduct(index)}
                                              className="text-primary"
                                              value={searchQuery}
                                            >
                                              <Plus className="mr-2 h-4 w-4" />
                                              Use "{searchQuery}"
                                            </CommandItem>
                                            <CommandItem
                                              onSelect={() => handleMarkForProductCreation(index)}
                                              className="text-green-600 dark:text-green-400"
                                              value={`create-${searchQuery}`}
                                            >
                                              <PlusCircle className="mr-2 h-4 w-4" />
                                              Create "{searchQuery}"
                                            </CommandItem>
                                          </CommandGroup>
                                        )}
                                      </CommandList>
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                              );
                            }}
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
                            <Label className="text-xs text-muted-foreground">Rate</Label>
                            <Input
                              type="number"
                              step="any"
                              min="0"
                              className="h-9 text-right"
                              {...register(`items.${index}.rate`, {
                                onChange: (e) => handleRateChange(index, e.target.value)
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
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: "", description: "", quantity: 1, rate: 0, total: 0 })}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="discount">Discount</Label>
            <Input
              id="discount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              {...register("discount", { valueAsNumber: true })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any relevant notes..."
              {...register("notes")}
              rows={3}
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
                  <span className="text-muted-foreground">Gross Total:</span>
                  <span className="font-medium">{formatCurrency(grossTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount:</span>
                  <span className="font-medium text-destructive">-{formatCurrency(Number(discount) || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT ({UAE_VAT_PERCENTAGE}%):</span>
                  <span className="font-medium">{formatCurrency(vatAmount)}</span>
                </div>
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
              )) : (isEditMode ? "Update Invoice" : "Create Invoice")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}