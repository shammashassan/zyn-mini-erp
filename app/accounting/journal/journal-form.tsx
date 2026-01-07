// app/accounting/journal/journal-form.tsx

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
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
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
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, ChevronsUpDown, Check, Plus, X, BookOpen, CheckCircle2, AlertCircle, Users, Info } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { IJournal } from "@/models/Journal";
import type { IChartOfAccount } from "@/models/ChartOfAccount";
import { formatCurrency } from "@/utils/formatters/currency";
import { Spinner } from "@/components/ui/spinner";

type JournalEntry = {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
};

type JournalFormData = {
  entryDate: Date;
  referenceType: 'Invoice' | 'Receipt' | 'Payment' | 'Purchase' | 'Expense' | 'Refund' | 'Manual';
  referenceNumber?: string;
  partyType?: 'Customer' | 'Supplier' | 'Payee' | 'Vendor';
  partyId?: string;
  partyName?: string;
  narration: string;
  entries: JournalEntry[];
  status: 'draft' | 'posted' | 'void';
};

interface JournalFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, id?: string) => Promise<void>;
  defaultValues?: IJournal | null;
}

export function JournalForm({ isOpen, onClose, onSubmit, defaultValues }: JournalFormProps) {
  const { 
    register, 
    handleSubmit, 
    control, 
    reset, 
    watch, 
    setValue, 
    formState: { isSubmitting, isDirty } 
  } = useForm<JournalFormData>({
    defaultValues: {
      entryDate: new Date(),
      referenceType: 'Manual',
      status: 'draft',
      entries: [
        { accountCode: '', accountName: '', debit: 0, credit: 0 },
        { accountCode: '', accountName: '', debit: 0, credit: 0 }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries"
  });

  const [accounts, setAccounts] = useState<IChartOfAccount[]>([]);
  const [accountPopovers, setAccountPopovers] = useState<Record<number, boolean>>({});

  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [payees, setPayees] = useState<any[]>([]);
  const [partyPopoverOpen, setPartyPopoverOpen] = useState(false);
  const [partySearchQuery, setPartySearchQuery] = useState("");

  // Responsive check
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  const watchedEntries = watch("entries");
  const watchedPartyType = watch("partyType");

  const totalDebit = watchedEntries.reduce((sum, entry) => sum + (Number(entry.debit) || 0), 0);
  const totalCredit = watchedEntries.reduce((sum, entry) => sum + (Number(entry.credit) || 0), 0);
  const difference = Math.abs(totalDebit - totalCredit);
  const isBalanced = difference < 0.01;
  const isZero = totalDebit === 0 && totalCredit === 0;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const accountsRes = await fetch("/api/chart-of-accounts?isActive=true");
        if (accountsRes.ok) {
          const accountsData = await accountsRes.json();
          setAccounts(accountsData);
        }

        const customersRes = await fetch("/api/customers");
        if (customersRes.ok) {
          const customersData = await customersRes.json();
          setCustomers(customersData);
        }

        const suppliersRes = await fetch("/api/suppliers");
        if (suppliersRes.ok) {
          const suppliersData = await suppliersRes.json();
          setSuppliers(suppliersData);
        }

        const payeesRes = await fetch("/api/payees");
        if (payeesRes.ok) {
          const payeesData = await payeesRes.json();
          setPayees(payeesData);
        }
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
          entryDate: defaultValues.entryDate ? new Date(defaultValues.entryDate) : new Date(),
          referenceType: defaultValues.referenceType,
          referenceNumber: defaultValues.referenceNumber || "",
          partyType: defaultValues.partyType,
          partyId: defaultValues.partyId,
          partyName: defaultValues.partyName,
          narration: defaultValues.narration,
          entries: defaultValues.entries || [
            { accountCode: '', accountName: '', debit: 0, credit: 0 },
            { accountCode: '', accountName: '', debit: 0, credit: 0 }
          ],
          status: defaultValues.status,
        });
        setPartySearchQuery(defaultValues.partyName || "");
      } else {
        reset({
          entryDate: new Date(),
          referenceType: 'Manual',
          referenceNumber: "",
          partyType: undefined,
          partyId: undefined,
          partyName: undefined,
          narration: "",
          entries: [
            { accountCode: '', accountName: '', debit: 0, credit: 0 },
            { accountCode: '', accountName: '', debit: 0, credit: 0 }
          ],
          status: 'draft',
        });
        setPartySearchQuery("");
      }
    }
  }, [isOpen, defaultValues, reset]);

  const handleAccountSelect = (index: number, accountCode: string) => {
    const account = accounts.find(a => a.accountCode === accountCode);
    if (account) {
      setValue(`entries.${index}.accountCode`, accountCode, { shouldDirty: true });
      setValue(`entries.${index}.accountName`, account.accountName, { shouldDirty: true });
      setAccountPopovers(prev => ({ ...prev, [index]: false }));
    }
  };

  const handlePartySelect = (partyType: 'Customer' | 'Supplier' | 'Payee', party: any) => {
    setValue('partyType', partyType, { shouldDirty: true });
    setValue('partyId', party._id, { shouldDirty: true });
    setValue('partyName', party.name, { shouldDirty: true });
    setPartySearchQuery(party.name);
    setPartyPopoverOpen(false);
  };

  const clearParty = () => {
    setValue('partyType', undefined, { shouldDirty: true });
    setValue('partyId', undefined, { shouldDirty: true });
    setValue('partyName', undefined, { shouldDirty: true });
    setPartySearchQuery("");
  };

  const handleDebitChange = (index: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setValue(`entries.${index}.credit`, 0, { shouldDirty: true });
    }
  };

  const handleCreditChange = (index: number, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setValue(`entries.${index}.debit`, 0, { shouldDirty: true });
    }
  };

  const handleFormSubmit = async (data: JournalFormData) => {
    // Manual Validation
    if (!data.entryDate) {
      toast.error("Please select an entry date");
      return;
    }

    if (!data.referenceType) {
      toast.error("Please select a reference type");
      return;
    }

    if (!data.narration || data.narration.trim().length === 0) {
      toast.error("Please enter a narration");
      return;
    }

    if (data.narration.length > 500) {
      toast.error("Narration cannot exceed 500 characters");
      return;
    }

    const validEntries = data.entries.filter(e => e.accountCode && (Number(e.debit) > 0 || Number(e.credit) > 0));
    
    if (validEntries.length < 2) {
      toast.error("At least two valid entries (with account & amount) are required");
      return;
    }

    if (!isBalanced) {
      toast.error(`Entries are not balanced. Difference: ${formatCurrency(difference)}`);
      return;
    }

    const submitData = {
      ...data,
      entries: validEntries.map(e => ({
        ...e,
        debit: Number(e.debit) || 0,
        credit: Number(e.credit) || 0
      })),
    };

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    await onSubmit(submitData, submissionId);
  };

  const getCurrentPartyList = () => {
    switch (watchedPartyType) {
      case 'Customer': return customers;
      case 'Supplier': return suppliers;
      case 'Payee': return payees;
      case 'Vendor': return [];
      default: return [];
    }
  };

  const currentPartyList = getCurrentPartyList();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-4xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {defaultValues ? "Edit Journal Entry" : "Create Journal Entry"}
          </DialogTitle>
          <DialogDescription>
            Record a double-entry accounting transaction
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Entry Date <span className="text-destructive">*</span></Label>
              <Controller
                name="entryDate"
                control={control}
                render={({ field }) => (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        ref={field.ref}
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal h-9 px-3",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        captionLayout="dropdown"
                      />
                    </PopoverContent>
                  </Popover>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Reference Type <span className="text-destructive">*</span></Label>
              <Controller
                name="referenceType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger ref={field.ref} className="w-full h-9 px-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manual">Manual Entry</SelectItem>
                      <SelectItem value="Invoice">Invoice</SelectItem>
                      <SelectItem value="Receipt">Receipt</SelectItem>
                      <SelectItem value="Payment">Payment</SelectItem>
                      <SelectItem value="Purchase">Purchase</SelectItem>
                      <SelectItem value="Expense">Expense</SelectItem>
                      <SelectItem value="Refund">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input
                placeholder="e.g., INV-2024-001"
                {...register("referenceNumber")}
                className="h-9"
              />
            </div>

            <div className="space-y-2">
              <Label>Status <span className="text-destructive">*</span></Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value === 'void' ? 'draft' : field.value}
                    onValueChange={field.onChange}
                    disabled={defaultValues?.status === 'void'}
                  >
                    <SelectTrigger ref={field.ref} className="w-full h-9 px-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="posted">Posted</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {defaultValues?.status === 'void' && (
                <p className="text-xs text-destructive">Void entries cannot be edited</p>
              )}
            </div>
          </div>

          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4" />
                Optional References (for filtering)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Party Reference
                </Label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Controller
                    name="partyType"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value || ''}
                        onValueChange={(value) => {
                          field.onChange(value || undefined);
                          setValue('partyId', undefined, { shouldDirty: true });
                          setValue('partyName', undefined, { shouldDirty: true });
                          setPartySearchQuery("");
                        }}
                      >
                        <SelectTrigger className="w-full sm:w-[120px]">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Customer">Customer</SelectItem>
                          <SelectItem value="Supplier">Supplier</SelectItem>
                          <SelectItem value="Payee">Payee</SelectItem>
                          <SelectItem value="Vendor">Vendor</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />

                  {watchedPartyType && watchedPartyType !== 'Vendor' && (
                    <Popover 
                      open={partyPopoverOpen} 
                      onOpenChange={(open) => {
                        setPartyPopoverOpen(open);
                        if(open) setPartySearchQuery(watch('partyName') || "");
                      }}
                    >
                      <PopoverTrigger asChild>
                        <Button
                          type="button"
                          variant="outline"
                          role="combobox"
                          className="flex-1 justify-between"
                        >
                          <span className="truncate">
                            {watch('partyName') || `Select ${watchedPartyType?.toLowerCase()}...`}
                          </span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[300px] p-0">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder={`Search ${watchedPartyType?.toLowerCase()}s...`} 
                            value={partySearchQuery}
                            onValueChange={setPartySearchQuery}
                          />
                          <CommandList
                            className="max-h-[200px] overflow-y-auto"
                            onWheel={(e) => e.stopPropagation()}
                          >
                            <CommandEmpty>No {watchedPartyType?.toLowerCase()} found.</CommandEmpty>
                            <CommandGroup>
                              {currentPartyList
                                .filter(party => !partySearchQuery || party.name.toLowerCase().includes(partySearchQuery.toLowerCase()))
                                .map((party) => (
                                  <CommandItem
                                    key={party._id}
                                    value={party.name}
                                    onSelect={() => handlePartySelect(watchedPartyType!, party)}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", watch('partyId') === party._id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex-1">
                                      <div>{party.name}</div>
                                      {party.email && (
                                        <div className="text-xs text-muted-foreground">{party.email}</div>
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

                  {watchedPartyType === 'Vendor' && (
                    <Input
                      placeholder="Enter vendor name..."
                      value={watch('partyName') || ''}
                      onChange={(e) => setValue('partyName', e.target.value, { shouldDirty: true })}
                      className="flex-1"
                    />
                  )}

                  {watch('partyId') && (
                    <Button type="button" variant="ghost" size="icon" onClick={clearParty} className="shrink-0">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="narration">
              Narration <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="narration"
              placeholder="Brief description of the transaction..."
              rows={2}
              {...register("narration")}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Journal Entries</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDesktop ? (
                /* Desktop Table */
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2 font-medium text-sm">#</th>
                        <th className="text-left p-2 font-medium text-sm">
                          Account
                        </th>
                        <th className="text-left p-2 font-medium text-sm text-green-600">Debit</th>
                        <th className="text-left p-2 font-medium text-sm text-red-600">Credit</th>
                        <th className="text-center p-2 font-medium text-sm">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fields.map((field, index) => {
                        const account = accounts.find(a => a.accountCode === watchedEntries[index]?.accountCode);
                        
                        return (
                          <tr key={field.id} className="border-b">
                            <td className="p-2 text-sm text-muted-foreground">{index + 1}</td>
                            <td className="p-2 min-w-[250px]">
                              <Controller
                                name={`entries.${index}.accountCode`}
                                control={control}
                                render={({ field }) => (
                                  <Popover
                                    open={accountPopovers[index]}
                                    onOpenChange={(open) => setAccountPopovers(prev => ({ ...prev, [index]: open }))}
                                  >
                                    <PopoverTrigger asChild>
                                      <Button
                                        ref={field.ref}
                                        type="button"
                                        variant="outline"
                                        role="combobox"
                                        className="w-full justify-between"
                                      >
                                        <span className="truncate">
                                          {account ? `${account.accountCode} - ${account.accountName}` : "Select account..."}
                                        </span>
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[350px] sm:w-[450px] p-0">
                                      <Command>
                                        <CommandInput placeholder="Search accounts..." />
                                        <CommandList
                                          className="max-h-[200px] overflow-y-auto"
                                          onWheel={(e) => e.stopPropagation()}
                                        >
                                          <CommandEmpty>No account found.</CommandEmpty>
                                          <CommandGroup>
                                            {accounts.map((acc) => (
                                              <CommandItem
                                                key={acc._id}
                                                value={`${acc.accountCode} ${acc.accountName}`}
                                                onSelect={() => handleAccountSelect(index, acc.accountCode)}
                                              >
                                                <Check className={cn("mr-2 h-4 w-4", field.value === acc.accountCode ? "opacity-100" : "opacity-0")} />
                                                <div className="flex-1">
                                                  <div className="font-mono text-xs">{acc.accountCode}</div>
                                                  <div>{acc.accountName}</div>
                                                  <div className="text-xs text-muted-foreground">
                                                    {acc.groupName} › {acc.subGroup}
                                                  </div>
                                                </div>
                                                <Badge variant={acc.nature === 'debit' ? 'primary' : 'warning'} appearance="outline" className="text-xs">
                                                  {acc.nature}
                                                </Badge>
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
                            <td className="p-2">
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                className="text-left"
                                {...register(`entries.${index}.debit`, {
                                  onChange: (e) => handleDebitChange(index, e.target.value)
                                })}
                              />
                            </td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                className="text-left"
                                {...register(`entries.${index}.credit`, {
                                  onChange: (e) => handleCreditChange(index, e.target.value)
                                })}
                              />
                            </td>
                            <td className="p-2 text-center">
                              {fields.length > 2 && (
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
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold">
                        <td colSpan={2} className="p-2 text-right">Total:</td>
                        <td className="p-2 text-left text-green-600">
                          {formatCurrency(totalDebit)}
                        </td>
                        <td className="p-2 text-left text-red-600">
                          {formatCurrency(totalCredit)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                /* Mobile Cards */
                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const account = accounts.find(a => a.accountCode === watchedEntries[index]?.accountCode);
                    
                    return (
                      <Card key={field.id} className="border-2">
                        <CardHeader className="pb-2">
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-sm">Entry #{index + 1}</CardTitle>
                            {fields.length > 2 && (
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
                              Account
                            </Label>
                            <Controller
                              name={`entries.${index}.accountCode`}
                              control={control}
                              render={({ field }) => (
                                <Popover
                                  open={accountPopovers[index]}
                                  onOpenChange={(open) => setAccountPopovers(prev => ({ ...prev, [index]: open }))}
                                >
                                  <PopoverTrigger asChild>
                                    <Button
                                      ref={field.ref}
                                      type="button"
                                      variant="outline"
                                      role="combobox"
                                      className="w-full justify-between h-auto min-h-[2.5rem] py-2"
                                    >
                                      <span className="truncate text-left text-sm">
                                        {account ? (
                                          <div>
                                            <div className="font-mono text-xs">{account.accountCode}</div>
                                            <div className="text-xs">{account.accountName}</div>
                                          </div>
                                        ) : "Select account..."}
                                      </span>
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0" align="start">
                                    <Command>
                                      <CommandInput placeholder="Search accounts..." />
                                      <CommandList
                                        className="max-h-[250px] overflow-y-auto"
                                        onWheel={(e) => e.stopPropagation()}
                                      >
                                        <CommandEmpty>No account found.</CommandEmpty>
                                        <CommandGroup>
                                          {accounts.map((acc) => (
                                            <CommandItem
                                              key={acc._id}
                                              value={`${acc.accountCode} ${acc.accountName}`}
                                              onSelect={() => handleAccountSelect(index, acc.accountCode)}
                                            >
                                              <Check className={cn("mr-2 h-4 w-4", field.value === acc.accountCode ? "opacity-100" : "opacity-0")} />
                                              <div className="flex-1 min-w-0">
                                                <div className="font-mono text-xs">{acc.accountCode}</div>
                                                <div className="text-sm truncate">{acc.accountName}</div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                  {acc.groupName} › {acc.subGroup}
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
                              <Label className="text-xs text-green-600">Debit</Label>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                className="h-9"
                                {...register(`entries.${index}.debit`, {
                                  onChange: (e) => handleDebitChange(index, e.target.value)
                                })}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-red-600">Credit</Label>
                              <Input
                                type="number"
                                step="any"
                                min="0"
                                className="h-9"
                                {...register(`entries.${index}.credit`, {
                                  onChange: (e) => handleCreditChange(index, e.target.value)
                                })}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ accountCode: '', accountName: '', debit: 0, credit: 0 })}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Entry
              </Button>
            </CardContent>
          </Card>

          <div
            className={cn(
              "rounded-lg border p-4 transition-colors duration-300 flex items-center gap-3",
              isZero 
                ? "border-yellow-500/50 bg-yellow-50 text-yellow-900 dark:border-yellow-500/30 dark:bg-yellow-500/10 dark:text-yellow-200"
                : isBalanced
                  ? "border-green-500/50 bg-green-50 text-green-900 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200"
                  : "border-destructive/50 bg-destructive/10 text-destructive dark:border-destructive/50 dark:bg-destructive/10"
            )}
          >
            {isZero ? (
              <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
            ) : isBalanced ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}

            <div className="flex-1 flex items-center justify-between">
              <span className="font-semibold text-base">
                {isZero 
                  ? "No Amounts Recorded" 
                  : isBalanced 
                    ? "Entry is Balanced" 
                    : "Entry is Not Balanced"}
              </span>

              {!isZero && !isBalanced && (
                <div className="text-right">
                  <div className="text-sm opacity-80">Difference:</div>
                  <div className="text-lg font-bold">
                    {formatCurrency(difference)}
                  </div>
                </div>
              )}
            </div>
          </div>

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
              ) : defaultValues ? "Update Entry" : "Create Entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}