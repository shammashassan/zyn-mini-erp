// app/documents/quotations/quotation-form.tsx - FIXED: VAT on Gross Total

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronsUpDown, Check, Plus, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ICustomer } from "@/models/Customer";
import type { IProduct } from "@/models/Product";
import type { Quotation } from "./columns";
import { formatCurrency } from "@/utils/formatters/currency";
import { UAE_VAT_PERCENTAGE } from "@/utils/constants";
import { Spinner } from "@/components/ui/spinner";

type QuotationItem = {
  description: string;
  quantity: number;
  rate: number;
  total: number;
};

type QuotationFormData = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: QuotationItem[];
  discount: number;
  notes: string;
};

interface QuotationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, id?: string) => Promise<void>;
  defaultValues?: Quotation | null;
}

export function QuotationForm({ isOpen, onClose, onSubmit, defaultValues }: QuotationFormProps) {
  const { 
    register, 
    handleSubmit, 
    control, 
    reset, 
    watch, 
    setValue, 
    formState: { isSubmitting, isDirty } 
  } = useForm<QuotationFormData>({
    defaultValues: {
      items: [{ description: "", quantity: 1, rate: 0, total: 0 }],
      discount: 0,
      notes: "",
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [productPopovers, setProductPopovers] = useState<Record<number, boolean>>({});

  // Responsive check
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  const watchedItems = watch("items");
  const discount = watch("discount");

  const isEditMode = !!defaultValues?._id;

  // ✅ FIXED: Correct calculation - VAT on Subtotal
  // 1. Gross Total = Sum of all items
  const grossTotal = watchedItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  
  // 2. Subtotal = Gross Total - Discount
  const subTotal = Math.max(grossTotal - (Number(discount) || 0), 0);

  // 3. VAT = Subtotal × 5%
  const vatAmount = subTotal * (UAE_VAT_PERCENTAGE / 100);

  // 4. Grand Total = Subtotal + VAT
  const grandTotal = subTotal + vatAmount;
  
  const totalItems = watchedItems.filter(item => item.description).length;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, productsRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/products")
        ]);

        if (customersRes.ok) setCustomers(await customersRes.json());
        if (productsRes.ok) setProducts(await productsRes.json());
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
          customerName: defaultValues.customerName || "",
          customerPhone: defaultValues.customerPhone || "",
          customerEmail: defaultValues.customerEmail || "",
          items: defaultValues.items || [{ description: "", quantity: 1, rate: 0, total: 0 }],
          discount: defaultValues.discount || 0,
          notes: defaultValues.notes || "",
        });
      } else {
        reset({
          customerName: "",
          customerPhone: "",
          customerEmail: "",
          items: [{ description: "", quantity: 1, rate: 0, total: 0 }],
          discount: 0,
          notes: "",
        });
      }
    }
  }, [isOpen, defaultValues, reset]);

  const handleCustomerSelect = (customer: ICustomer) => {
    setValue("customerName", customer.name, { shouldDirty: true });
    setValue("customerPhone", customer.phone || "", { shouldDirty: true });
    setValue("customerEmail", customer.email || "", { shouldDirty: true });
    setCustomerPopoverOpen(false);
  };

  const handleProductSelect = (index: number, product: IProduct) => {
    setValue(`items.${index}.description`, product.name, { shouldDirty: true });
    setValue(`items.${index}.rate`, product.price, { shouldDirty: true });

    const quantity = Number(watchedItems[index].quantity) || 1;
    setValue(`items.${index}.total`, quantity * product.price, { shouldDirty: true });

    setProductPopovers(prev => ({ ...prev, [index]: false }));
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

  const handleFormSubmit = async (data: QuotationFormData) => {
    // Manual Validation with toast messages
    if (!data.customerName || !data.customerName.trim()) {
      toast.error("Customer name is required", {
        description: "Please select or enter a customer name"
      });
      return;
    }

    const validItems = data.items.filter(item => item.description);
    if (validItems.length === 0) {
      toast.error("Please add at least one item", {
        description: "Quotations must have at least one item with a description"
      });
      return;
    }

    const calculatedGrossTotal = validItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    const calculatedSubTotal = Math.max(calculatedGrossTotal - (Number(data.discount) || 0), 0);
    const calculatedVatAmount = calculatedSubTotal * (UAE_VAT_PERCENTAGE / 100);

    if (data.discount > calculatedGrossTotal) {
      toast.error("Invalid discount amount", {
        description: "Discount cannot exceed the gross total"
      });
      return;
    }

    const submitData = {
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone.trim(),
      customerEmail: data.customerEmail.trim(),
      items: validItems.map(item => ({
        ...item,
        quantity: Number(item.quantity) || 0,
        total: Number(item.total) || 0
      })),
      discount: Number(data.discount) || 0,
      notes: data.notes,
      status: defaultValues?.status || "pending",
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
            {isEditMode ? "Edit Quotation" : "Create Quotation"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer *</Label>
                <Controller
                  name="customerName"
                  control={control}
                  render={({ field }) => (
                    <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                        >
                          {field.value || "Select or type customer..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search customer..."
                            value={field.value}
                            onValueChange={field.onChange}
                          />
                          <CommandList
                            className="max-h-[200px] overflow-y-auto"
                            onWheel={(e) => e.stopPropagation()}
                          >
                            <CommandEmpty>
                              No customer found.<br />
                              Type to create a new one.
                            </CommandEmpty>
                            <CommandGroup>
                              {customers.map((customer) => (
                                <CommandItem
                                  key={String(customer._id)}
                                  value={customer.name}
                                  onSelect={() => handleCustomerSelect(customer)}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", field.value === customer.name ? "opacity-100" : "opacity-0")} />
                                  <div>
                                    <div>{customer.name}</div>
                                    {customer.email && (
                                      <div className="text-xs text-muted-foreground">{customer.email}</div>
                                    )}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    placeholder="Enter phone number"
                    {...register("customerPhone")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    placeholder="Enter email address"
                    {...register("customerEmail")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDesktop ? (
                /* Desktop Table View */
                <div className="w-full overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-sm w-[40px]">#</th>
                        <th className="text-left p-3 font-medium text-sm min-w-[250px]">Description</th>
                        <th className="text-left p-3 font-medium text-sm w-[100px]">Qty</th>
                        <th className="text-right p-3 font-medium text-sm w-[100px]">Rate</th>
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
                              render={({ field }) => (
                                <Popover
                                  open={productPopovers[index]}
                                  onOpenChange={(open) => setProductPopovers(prev => ({ ...prev, [index]: open }))}
                                >
                                  <PopoverTrigger asChild>
                                    <Button type="button" variant="outline" role="combobox" className="w-full justify-between h-10 font-normal">
                                      <span className="truncate">{field.value || "Select or type product..."}</span>
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                                    <Command>
                                      <CommandInput placeholder="Search products..." value={field.value} onValueChange={field.onChange} />
                                      <CommandList
                                        className="max-h-[200px] overflow-y-auto"
                                        onWheel={(e) => e.stopPropagation()}
                                      >
                                        <CommandEmpty>No product found.</CommandEmpty>
                                        <CommandGroup>
                                          {products.map((product) => (
                                            <CommandItem key={String(product._id)} value={product.name} onSelect={() => handleProductSelect(index, product)}>
                                              <Check className={cn("mr-2 h-4 w-4", field.value === product.name ? "opacity-100" : "opacity-0")} />
                                              <div>
                                                <div>{product.name}</div>
                                                <div className="text-xs text-muted-foreground">{formatCurrency(product.price)}</div>
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
                          <td className="p-3 text-right text-sm tabular-nums font-medium">
                            {formatCurrency(watchedItems[index]?.rate || 0)}
                          </td>
                          <td className="p-3 text-right font-semibold tabular-nums">
                            {formatCurrency(watchedItems[index]?.total || 0)}
                          </td>
                          <td className="p-3 text-center">
                            {fields.length > 1 && (
                              <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="h-8 w-8 p-0 text-destructive">
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
                /* Mobile Card View */
                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <Card key={field.id} className="border-2">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-sm">Item #{index + 1}</CardTitle>
                          {fields.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} className="h-8 w-8 p-0 text-destructive">
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
                            render={({ field }) => (
                              <Popover
                                open={productPopovers[index]}
                                onOpenChange={(open) => setProductPopovers(prev => ({ ...prev, [index]: open }))}
                              >
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="outline" role="combobox" className="w-full justify-between h-9 text-sm font-normal">
                                    <span className="truncate">{field.value || "Select..."}</span>
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0" align="start">
                                  <Command>
                                    <CommandInput placeholder="Search..." value={field.value} onValueChange={field.onChange} />
                                    <CommandList
                                      className="max-h-[200px] overflow-y-auto"
                                      onWheel={(e) => e.stopPropagation()}
                                    >
                                      <CommandEmpty>No product found.</CommandEmpty>
                                      <CommandGroup>
                                        {products.map((product) => (
                                          <CommandItem key={String(product._id)} value={product.name} onSelect={() => handleProductSelect(index, product)}>
                                            <Check className={cn("mr-2 h-4 w-4", field.value === product.name ? "opacity-100" : "opacity-0")} />
                                            <div className="flex-1 min-w-0">
                                              <div className="truncate">{product.name}</div>
                                              <div className="text-xs text-muted-foreground">{formatCurrency(product.price)}</div>
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
                            <Label className="text-xs text-muted-foreground">Rate</Label>
                            <div className="h-9 flex items-center justify-end px-3 border rounded-md bg-muted/50 text-sm">
                              {formatCurrency(watchedItems[index]?.rate || 0)}
                            </div>
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
                onClick={() => append({ description: "", quantity: 1, rate: 0, total: 0 })}
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

          {/* ✅ FIXED: Display correct calculation flow */}
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
              {isSubmitting ? (
                <>
                  <Spinner />
                  {isEditMode ? "Updating..." : "Creating..."}
                </>
              ) : isEditMode ? "Update Quotation" : "Create Quotation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}