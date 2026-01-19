// app/expenses/expense-form.tsx - UPDATED: Using expenseDate field

"use client";

import React, { useEffect, useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, Banknote, Info, ChevronsUpDown, Check, Store, Users, Building2, Briefcase, Plane, Megaphone, Zap, Code, Cpu, Utensils, Home, DollarSign, Shield, Film, Boxes, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { IExpense } from "@/models/Expense";
import { formatCurrency } from "@/utils/formatters/currency";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

type ExpenseFormData = {
  description: string;
  amount: number | undefined;
  category: string;
  type: 'single' | 'period';
  expenseDate: Date; // ✅ UPDATED: Changed from date to expenseDate
  vendor?: string;
  payeeName?: string;
  supplierName?: string;
  partyType: 'manual' | 'payee' | 'supplier';
  notes?: string;
  status?: 'pending' | 'approved' | 'cancelled';
};

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, id?: string) => Promise<void>;
  defaultValues?: IExpense | null;
}

const EXPENSE_CATEGORIES = [
  { value: 'Office Supplies', label: 'Office Supplies', icon: Briefcase },
  { value: 'Travel', label: 'Travel', icon: Plane },
  { value: 'Marketing', label: 'Marketing', icon: Megaphone },
  { value: 'Utilities', label: 'Utilities', icon: Zap },
  { value: 'Software', label: 'Software', icon: Code },
  { value: 'Equipment', label: 'Equipment', icon: Cpu },
  { value: 'Meals', label: 'Meals', icon: Utensils },
  { value: 'Professional Services', label: 'Professional Services', icon: Users },
  { value: 'Rent', label: 'Rent', icon: Home },
  { value: 'Salary', label: 'Salary', icon: DollarSign },
  { value: 'Insurance', label: 'Insurance', icon: Shield },
  { value: 'Entertainment', label: 'Entertainment', icon: Film },
  { value: 'Miscellaneous', label: 'Miscellaneous', icon: Boxes },
];

export function ExpenseForm({ isOpen, onClose, onSubmit, defaultValues }: ExpenseFormProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, isDirty }
  } = useForm<ExpenseFormData>();

  const [payees, setPayees] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [payeePopoverOpen, setPayeePopoverOpen] = useState(false);
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [payeeSearchQuery, setPayeeSearchQuery] = useState("");
  const [supplierSearchQuery, setSupplierSearchQuery] = useState("");

  const watchedType = watch('type');
  const watchedAmount = watch('amount');
  const watchedVendor = watch('vendor');
  const watchedPayeeName = watch('payeeName');
  const watchedSupplierName = watch('supplierName');
  const watchedPartyType = watch('partyType');
  const watchedCategory = watch('category');

  const selectedCategoryIcon = EXPENSE_CATEGORIES.find(c => c.value === watchedCategory)?.icon || Briefcase;
  const CategoryIcon = selectedCategoryIcon;

  // Get display name based on party type
  const displayPartyName = watchedPartyType === 'manual'
    ? watchedVendor
    : watchedPartyType === 'payee'
      ? watchedPayeeName
      : watchedSupplierName;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [payeesRes, suppliersRes] = await Promise.all([
          fetch("/api/payees"),
          fetch("/api/suppliers")
        ]);

        if (payeesRes.ok) setPayees(await payeesRes.json());
        if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (isOpen) {
      let initialPartyType: 'manual' | 'payee' | 'supplier' = 'manual';
      let initialPartyName = '';

      if (defaultValues?.payeeId) {
        initialPartyType = 'payee';
        const pVal = defaultValues.payeeId as any;

        if (pVal && typeof pVal === 'object' && pVal.name) {
          initialPartyName = pVal.name;
        } else {
          const idToMatch = typeof pVal === 'object' ? pVal._id : pVal;
          const payee = payees.find(p => String(p._id) === String(idToMatch));
          initialPartyName = payee?.name || '';
        }

      } else if (defaultValues?.supplierId) {
        initialPartyType = 'supplier';
        const sVal = defaultValues.supplierId as any;

        if (sVal && typeof sVal === 'object' && sVal.name) {
          initialPartyName = sVal.name;
        } else {
          const idToMatch = typeof sVal === 'object' ? sVal._id : sVal;
          const supplier = suppliers.find(s => String(s._id) === String(idToMatch));
          initialPartyName = supplier?.name || '';
        }

      } else if (defaultValues?.vendor) {
        initialPartyType = 'manual';
        initialPartyName = defaultValues.vendor;
      }

      reset({
        description: defaultValues?.description || "",
        amount: defaultValues?.amount || undefined,
        category: defaultValues?.category || "",
        type: defaultValues?.type || 'single',
        expenseDate: defaultValues?.expenseDate ? new Date(defaultValues.expenseDate) : new Date(), // ✅ UPDATED
        vendor: initialPartyType === 'manual' ? initialPartyName : "",
        payeeName: initialPartyType === 'payee' ? initialPartyName : "",
        supplierName: initialPartyType === 'supplier' ? initialPartyName : "",
        partyType: initialPartyType,
        notes: defaultValues?.notes || "",
        status: defaultValues?.status || 'pending',
      });

      setPayeeSearchQuery(initialPartyType === 'payee' ? initialPartyName : "");
      setSupplierSearchQuery(initialPartyType === 'supplier' ? initialPartyName : "");
    }
  }, [isOpen, defaultValues, reset, payees, suppliers]);

  const handlePayeeSelect = (payeeName: string) => {
    setValue('payeeName', payeeName, { shouldDirty: true });
    setPayeePopoverOpen(false);
    setPayeeSearchQuery(payeeName);
  };

  const handleSupplierSelect = (supplierName: string) => {
    setValue('supplierName', supplierName, { shouldDirty: true });
    setSupplierPopoverOpen(false);
    setSupplierSearchQuery(supplierName);
  };

  const handleFormSubmit: SubmitHandler<ExpenseFormData> = async (data) => {
    // Manual Validation
    if (data.partyType === 'manual' && (!data.vendor || !data.vendor.trim())) {
      toast.error("Please enter a vendor name");
      return;
    }
    if (data.partyType === 'payee' && !data.payeeName) {
      toast.error("Please select a payee");
      return;
    }
    if (data.partyType === 'supplier' && !data.supplierName) {
      toast.error("Please select a supplier");
      return;
    }

    if (!data.expenseDate) { // ✅ UPDATED
      toast.error("Please select an expense date");
      return;
    }

    if (!data.category) {
      toast.error("Please select a category");
      return;
    }

    if (!data.amount || data.amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!data.description || data.description.trim().length < 3) {
      toast.error("Please enter a description (min 3 chars)");
      return;
    }

    const submitData: any = { ...data };

    // Transform based on party type
    if (data.partyType === "payee") {
      submitData.payeeName = data.payeeName;
      delete submitData.supplierId;
      delete submitData.supplierName;
      delete submitData.vendor;
    } else if (data.partyType === "supplier") {
      submitData.supplierName = data.supplierName;
      delete submitData.payeeId;
      delete submitData.payeeName;
      delete submitData.vendor;
    } else {
      delete submitData.payeeId;
      delete submitData.payeeName;
      delete submitData.supplierId;
      delete submitData.supplierName;
    }

    delete submitData.partyType;

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    await onSubmit(submitData, submissionId);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Banknote className="h-4 w-4 sm:h-5 sm:w-5" />
            {defaultValues ? "Edit Expense" : "Record New Expense"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 sm:space-y-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Party Type Dropdown */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Party Type</Label>
              <Controller
                name="partyType"
                control={control}
                defaultValue="manual"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full h-9 sm:h-10 text-sm">
                      <SelectValue placeholder="Select party type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4" />
                          Manual Entry
                        </div>
                      </SelectItem>
                      <SelectItem value="payee">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Payee
                        </div>
                      </SelectItem>
                      <SelectItem value="supplier">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          Supplier
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Party Selection/Input based on type */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Party *</Label>

              {/* Manual Entry */}
              {watchedPartyType === 'manual' && (
                <div className="relative">
                  <Input
                    placeholder="Enter vendor name..."
                    className="pl-9 w-full h-9 sm:h-10 text-sm"
                    {...register("vendor")}
                  />
                  <Store className="absolute left-3 top-2 sm:top-2.5 h-4 w-4 text-muted-foreground" />
                </div>
              )}

              {/* Payee Selector */}
              {watchedPartyType === 'payee' && (
                <Controller
                  name="payeeName"
                  control={control}
                  render={({ field }) => (
                    <>
                      <Popover
                        open={payeePopoverOpen}
                        onOpenChange={(isOpen) => {
                          setPayeePopoverOpen(isOpen);
                          if (isOpen) setPayeeSearchQuery(field.value || "");
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between h-9 sm:h-10 text-sm"
                          >
                            <span className="truncate">
                              {field.value || "Select or type payee..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search payee..."
                              value={payeeSearchQuery}
                              onValueChange={setPayeeSearchQuery}
                            />
                            <CommandList
                              className="max-h-[200px] overflow-y-auto"
                              onWheel={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              onTouchMove={(e) => e.stopPropagation()}
                            >
                              <CommandEmpty>
                                {payeeSearchQuery.trim() ? "No payee found." : "Start typing to search..."}
                              </CommandEmpty>

                              <CommandGroup heading="Existing Payees">
                                {payees
                                  .filter(p => !payeeSearchQuery || p.name.toLowerCase().includes(payeeSearchQuery.toLowerCase()))
                                  .map((payee) => (
                                    <CommandItem
                                      key={payee._id}
                                      value={payee.name}
                                      onSelect={() => handlePayeeSelect(payee.name)}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", field.value === payee.name ? "opacity-100" : "opacity-0")} />
                                      <div className="flex-1 min-w-0">
                                        <div className="truncate">{payee.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {payee.type?.replace(/_/g, ' ')}
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                              </CommandGroup>

                              {payeeSearchQuery.trim() && !payees.some(p => p.name.toLowerCase() === payeeSearchQuery.trim().toLowerCase()) && (
                                <CommandGroup heading="New Payee">
                                  <CommandItem
                                    onSelect={() => handlePayeeSelect(payeeSearchQuery.trim())}
                                    className="text-primary"
                                    value={payeeSearchQuery}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create "{payeeSearchQuery}"
                                  </CommandItem>
                                </CommandGroup>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </>
                  )}
                />
              )}

              {/* Supplier Selector */}
              {watchedPartyType === 'supplier' && (
                <Controller
                  name="supplierName"
                  control={control}
                  render={({ field }) => (
                    <>
                      <Popover
                        open={supplierPopoverOpen}
                        onOpenChange={(isOpen) => {
                          setSupplierPopoverOpen(isOpen);
                          if (isOpen) setSupplierSearchQuery(field.value || "");
                        }}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between h-9 sm:h-10 text-sm"
                          >
                            <span className="truncate">
                              {field.value || "Select or type supplier..."}
                            </span>
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0" align="start">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Search supplier..."
                              value={supplierSearchQuery}
                              onValueChange={setSupplierSearchQuery}
                            />
                            <CommandList
                              className="max-h-[200px] overflow-y-auto"
                              onWheel={(e) => e.stopPropagation()}
                              onTouchStart={(e) => e.stopPropagation()}
                              onTouchMove={(e) => e.stopPropagation()}
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
                                      onSelect={() => handleSupplierSelect(supplier.name)}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", field.value === supplier.name ? "opacity-100" : "opacity-0")} />
                                      <div className="flex-1 min-w-0">
                                        <div className="truncate">{supplier.name}</div>
                                        {supplier.city && (
                                          <div className="text-xs text-muted-foreground truncate">
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
                                    onSelect={() => handleSupplierSelect(supplierSearchQuery.trim())}
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
                    </>
                  )}
                />
              )}
            </div>

            {/* Date Picker - ✅ UPDATED: Using expenseDate */}
            <div className="space-y-2">
              <Label className="text-xs sm:text-sm">Expense Date *</Label>
              <Controller
                name="expenseDate"
                control={control}
                render={({ field }) => (
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-9 sm:h-10 text-sm",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(new Date(field.value), "PPP") : "Pick a date"}
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
                        initialFocus
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>
          </div>

          <Controller
            name="type"
            control={control}
            defaultValue="single"
            render={({ field }) => (
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4"
              >
                <Label
                  htmlFor="type-single"
                  className={cn(
                    "hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 sm:p-4 cursor-pointer transition-colors",
                    field.value === 'single' && "border-primary bg-primary/5 ring-1 ring-primary"
                  )}
                >
                  <RadioGroupItem value="single" id="type-single" className="mt-1" />
                  <div className="grid gap-1.5 leading-none">
                    <span className="font-medium text-sm">Single Expense</span>
                    <span className="text-muted-foreground text-xs">
                      One-time payment for goods or services
                    </span>
                  </div>
                </Label>
                <Label
                  htmlFor="type-period"
                  className={cn(
                    "hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-3 sm:p-4 cursor-pointer transition-colors",
                    field.value === 'period' && "border-primary bg-primary/5 ring-1 ring-primary"
                  )}
                >
                  <RadioGroupItem value="period" id="type-period" className="mt-1" />
                  <div className="grid gap-1.5 leading-none">
                    <span className="font-medium text-sm">Period Expense</span>
                    <span className="text-muted-foreground text-xs">
                      Recurring expense or spanning a specific time
                    </span>
                  </div>
                </Label>
              </RadioGroup>
            )}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <CategoryIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                Expense Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Category Selection */}
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-xs sm:text-sm">Category *</Label>
                  <Controller
                    name="category"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger ref={field.ref} className="h-9 sm:h-10 text-sm">
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORIES.map((category) => {
                            const Icon = category.icon;
                            return (
                              <SelectItem key={category.value} value={category.value}>
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  {category.label}
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {/* Amount */}
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-xs sm:text-sm">Amount (AED) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="h-9 sm:h-10 text-sm"
                    {...register("amount", { valueAsNumber: true })}
                  />
                </div>

                {defaultValues && (
                  <div className="space-y-2">
                    <Label htmlFor="status" className="text-xs sm:text-sm">Status</Label>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value || "pending"} onValueChange={field.onChange}>
                          <SelectTrigger className="h-9 sm:h-10 text-sm">
                            <SelectValue placeholder="Select status..." />
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

              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs sm:text-sm">Description *</Label>
                <div className="relative">
                  <Textarea
                    id="description"
                    placeholder="What was this expense for? (e.g., Office supplies for Q4...)"
                    {...register("description")}
                    rows={3}
                    className="pl-9 resize-none text-sm"
                  />
                  <Info className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-xs sm:text-sm">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional internal notes..."
                  {...register("notes")}
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium capitalize">{watchedType} Expense</span>
                </div>
                {displayPartyName && (
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Payee:</span>
                    <span className="font-medium break-words text-right">{displayPartyName}</span>
                  </div>
                )}
                {watchedCategory && (
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Category:</span>
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="font-medium">{watchedCategory}</span>
                    </div>
                  </div>
                )}
                <div className="flex justify-between pt-2 sm:pt-3 border-t">
                  <span className="font-semibold text-sm">Total Amount:</span>
                  <span className="text-lg sm:text-xl font-bold text-red-600">
                    {formatCurrency(watchedAmount || 0)}
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
              disabled={isSubmitting || (!!defaultValues && !isDirty)}
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Saving...
                </>
              ) : defaultValues ? "Update Expense" : "Record Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}