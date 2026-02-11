// app/procurement/expenses/expense-form.tsx - UPDATED: Using expenseDate field

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
import { CalendarIcon, Banknote, Info, Users, Briefcase, Plane, Megaphone, Zap, Code, Cpu, Utensils, Home, DollarSign, Shield, Film, Boxes } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { IExpense } from "@/models/Expense";
import { formatCurrency } from "@/utils/formatters/currency";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { PartyContactSelector } from "@/components/PartyContactSelector";

type ExpenseFormData = {
  description: string;
  amount: number | undefined;
  category: string;
  type: 'single' | 'period';
  expenseDate: Date; // UPDATED: Changed from date to expenseDate
  partyType: 'vendor' | 'payee';
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

  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [selectedParty, setSelectedParty] = useState("");
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  const watchedType = watch('type');
  const watchedAmount = watch('amount');
  const watchedPartyType = watch('partyType');
  const watchedCategory = watch('category');

  const isEditMode = !!defaultValues?._id;

  const selectedCategoryIcon = EXPENSE_CATEGORIES.find(c => c.value === watchedCategory)?.icon || Briefcase;
  const CategoryIcon = selectedCategoryIcon;



  useEffect(() => {
    if (isOpen) {
      let initialPartyType: 'vendor' | 'payee' = 'vendor';
      let initialPartyId = '';
      let initialPartyName = '';

      if (defaultValues?.payeeId) {
        initialPartyType = 'payee';
        const pVal = defaultValues.payeeId as any;
        if (typeof pVal === 'string') {
          initialPartyId = pVal;
        } else if (pVal?._id) {
          initialPartyId = pVal._id;
          initialPartyName = pVal.name || '';
        }
      } else if (defaultValues?.vendor) {
        initialPartyType = 'vendor';
        initialPartyName = defaultValues.vendor;
      }

      reset({
        description: defaultValues?.description || "",
        amount: defaultValues?.amount || undefined,
        category: defaultValues?.category || "",
        type: defaultValues?.type || 'single',
        expenseDate: defaultValues?.expenseDate ? new Date(defaultValues.expenseDate) : new Date(),
        partyType: initialPartyType,
        notes: defaultValues?.notes || "",
        status: defaultValues?.status || 'pending',
      });

      setSelectedPartyId(initialPartyId);
      setSelectedParty(initialPartyName);
    }
  }, [isOpen, defaultValues, reset]);

  const handleFormSubmit: SubmitHandler<ExpenseFormData> = async (data) => {
    // Validate party selection
    if (!selectedParty && !selectedPartyId) {
      toast.error("Please select a party");
      return;
    }

    if (!data.expenseDate) {
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

    // Set party data based on party type
    if (selectedParty) {
      switch (data.partyType) {
        case 'payee':
          submitData.payeeName = selectedParty;
          if (selectedPartyId) submitData.payeeId = selectedPartyId;
          break;
        case 'vendor':
          submitData.vendor = selectedParty;
          break;
      }
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

          {/* Main Top Grid */}
          <Controller
            name="type"
            control={control}
            defaultValue="single"
            render={({ field }) => (
              <Tabs
                value={field.value}
                onValueChange={field.onChange}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="single">Single Expense</TabsTrigger>
                  <TabsTrigger value="period">Period Expense</TabsTrigger>
                </TabsList>
                <TabsContent value="single" className="mt-2">
                  <p className="text-sm text-muted-foreground">
                    One-time payment for goods or services
                  </p>
                </TabsContent>
                <TabsContent value="period" className="mt-2">
                  <p className="text-sm text-muted-foreground">
                    Recurring expense or spanning a specific time
                  </p>
                </TabsContent>
              </Tabs>
            )}
          />

          <div className={cn("grid grid-cols-1 gap-4", defaultValues ? "lg:grid-cols-3" : "lg:grid-cols-2")}>
            {/* Party Selection */}
            <div className="space-y-2">
              <PartyContactSelector
                allowedRoles={['vendor', 'payee']}
                value={{
                  partyId: selectedPartyId,
                  partyType: watchedPartyType,
                  partyName: selectedParty
                }}
                onChange={(val, party) => {
                  setSelectedPartyId(val.partyId ?? "");

                  // Update partyType from component
                  if (val.partyType) {
                    setValue('partyType', val.partyType as 'vendor' | 'payee');
                  }

                  // Set party name (from API or manual input)
                  if (val.partyName !== undefined) {
                    setSelectedParty(val.partyName);
                  } else if (party) {
                    setSelectedParty(party.company || party.name || "");
                  }
                }}
                layout="vertical"
                showContactSelector={false}
                showCreateButton={true}
                // disablePartyTypeSelector={isEditMode}
                // disablePartySelector={isEditMode}
                className="w-full"
              />
            </div>

            {/* Expense Date */}
            <div className="space-y-2">
              <Label>Expense Date <span className="text-destructive">*</span></Label>
              <Controller
                name="expenseDate"
                control={control}
                render={({ field }) => (
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        ref={field.ref}
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-10",
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
                        initialFocus
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>

            {/* Status (Edit Mode Only) */}
            {defaultValues && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || "pending"} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full h-10">
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
                        <SelectTrigger ref={field.ref} className="w-full h-9 sm:h-10 text-sm">
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
                {selectedParty && (
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-muted-foreground">Payee:</span>
                    <span className="font-medium break-words text-right">{selectedParty}</span>
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
    </Dialog >
  );
}