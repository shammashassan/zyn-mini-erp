// app/accounting/chart-of-accounts/coa-form.tsx - ENHANCED UI VERSION

"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FolderTree, ChevronsUpDown, Check, Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { IChartOfAccount } from "@/models/ChartOfAccount";
import { Spinner } from "@/components/ui/spinner";

type COAFormData = {
  accountCode: string;
  accountName: string;
  groupName: 'Assets' | 'Liabilities' | 'Equity' | 'Income' | 'Expenses';
  subGroup: string;
  nature: 'debit' | 'credit';
  description?: string;
  isActive: boolean;
};

interface COAFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, id?: string) => void;
  defaultValues?: IChartOfAccount | null;
  existingSubGroups: string[];
  existingAccounts: IChartOfAccount[];
}

const ACCOUNT_GROUPS = [
  { value: 'Assets', nature: 'debit', color: 'text-green-600' },
  { value: 'Liabilities', nature: 'credit', color: 'text-red-600' },
  { value: 'Equity', nature: 'credit', color: 'text-blue-600' },
  { value: 'Income', nature: 'credit', color: 'text-green-600' },
  { value: 'Expenses', nature: 'debit', color: 'text-orange-600' },
] as const;

const COMMON_SUBGROUPS: Record<string, string[]> = {
  'Assets': [
    'Current Assets',
    'Cash and Cash Equivalents',
    'Accounts Receivable',
    'Inventory',
    'Prepaid Expenses',
    'Fixed Assets',
    'Intangible Assets',
  ],
  'Liabilities': [
    'Current Liabilities',
    'Accounts Payable',
    'Short-term Debt',
    'Accrued Expenses',
    'Long-term Liabilities',
    'Long-term Debt',
  ],
  'Equity': [
    'Owner\'s Equity',
    'Retained Earnings',
    'Common Stock',
    'Additional Paid-in Capital',
  ],
  'Income': [
    'Operating Revenue',
    'Sales Revenue',
    'Service Revenue',
    'Other Income',
    'Interest Income',
  ],
  'Expenses': [
    'Cost of Goods Sold',
    'Operating Expenses',
    'Administrative Expenses',
    'Selling Expenses',
    'Interest Expense',
    'Tax Expense',
  ],
};

export function COAForm({ isOpen, onClose, onSubmit, defaultValues, existingSubGroups, existingAccounts }: COAFormProps) {
  const { 
    register, 
    handleSubmit, 
    control, 
    reset, 
    watch, 
    setValue, 
    formState: { isSubmitting, isDirty } 
  } = useForm<COAFormData>({
    defaultValues: {
      isActive: true,
      nature: 'debit',
    }
  });

  const [subGroupPopoverOpen, setSubGroupPopoverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const selectedGroup = watch("groupName");
  const accountCode = watch("accountCode");
  const isActive = watch("isActive");

  // Combine common subgroups for the selected group with any existing custom subgroups
  const availableSubGroups = selectedGroup
    ? [...new Set([...COMMON_SUBGROUPS[selectedGroup], ...existingSubGroups])]
    : [];

  useEffect(() => {
    if (isOpen) {
      if (defaultValues) {
        reset({
          accountCode: defaultValues.accountCode,
          accountName: defaultValues.accountName,
          groupName: defaultValues.groupName,
          subGroup: defaultValues.subGroup,
          nature: defaultValues.nature,
          description: defaultValues.description || "",
          isActive: defaultValues.isActive,
        });
        setSearchQuery(defaultValues.subGroup || "");
      } else {
        reset({
          accountCode: "",
          accountName: "",
          groupName: 'Assets',
          subGroup: "",
          nature: 'debit',
          description: "",
          isActive: true,
        });
        setSearchQuery("");
      }
    }
  }, [isOpen, defaultValues, reset]);

  useEffect(() => {
    if (selectedGroup && !defaultValues) {
      const groupConfig = ACCOUNT_GROUPS.find(g => g.value === selectedGroup);
      if (groupConfig) {
        setValue('nature', groupConfig.nature, { shouldDirty: true });
      }
    }
  }, [selectedGroup, defaultValues, setValue]);

  const handleFormSubmit = (data: COAFormData) => {
    // Manual Validation
    
    // Account Code Validation
    if (!data.accountCode || !data.accountCode.trim()) {
      toast.error("Account Code is required");
      return;
    }
    
    const normalizedCode = data.accountCode.toUpperCase().trim();
    if (!/^[A-Z0-9]{3,10}$/.test(normalizedCode)) {
      toast.error("Code must be 3-10 alphanumeric characters");
      return;
    }

    // Check for duplicates (only if creating new)
    if (!defaultValues) {
      const exists = existingAccounts.some(
        acc => acc.accountCode.toUpperCase() === normalizedCode
      );
      if (exists) {
        toast.error("This account code is already in use");
        return;
      }
    }

    if (!data.accountName || !data.accountName.trim()) {
      toast.error("Account Name is required");
      return;
    }
    
    if (data.accountName.length > 100) {
      toast.error("Account Name cannot exceed 100 characters");
      return;
    }

    if (!data.groupName) {
      toast.error("Account Group is required");
      return;
    }

    if (!data.nature) {
      toast.error("Account Nature is required");
      return;
    }

    if (!data.subGroup) {
      toast.error("Subgroup is required");
      return;
    }

    if (data.description && data.description.length > 500) {
      toast.error("Description cannot exceed 500 characters");
      return;
    }

    const submissionId = defaultValues?._id ? String(defaultValues._id) : undefined;
    onSubmit(data, submissionId);
  };

  const handleAddCustomSubGroup = () => {
    if (searchQuery.trim()) {
      setValue('subGroup', searchQuery.trim(), { shouldDirty: true });
      setSubGroupPopoverOpen(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="h-5 w-5" />
            {defaultValues ? "Edit Account" : "Create Account"}
          </DialogTitle>
          <DialogDescription>
            Define an account in your chart of accounts for transaction categorization.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Account Code */}
            <div className="space-y-2">
              <Label htmlFor="accountCode">
                Account Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="accountCode"
                placeholder="e.g., A1001"
                className="uppercase font-mono"
                {...register("accountCode")}
                disabled={!!defaultValues}
              />
            </div>

            {/* Account Name */}
            <div className="space-y-2">
              <Label htmlFor="accountName">
                Account Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="accountName"
                placeholder="e.g., Cash in Hand"
                {...register("accountName")}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Group Name */}
            <div className="space-y-2">
              <Label>
                Account Group <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="groupName"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    {/* Added ref={field.ref} for scrolling */}
                    <SelectTrigger ref={field.ref}>
                      <SelectValue placeholder="Select group" />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNT_GROUPS.map((group) => (
                        <SelectItem key={group.value} value={group.value}>
                          <div className="flex items-center gap-2">
                            <span className={group.color}>{group.value}</span>
                            <Badge variant="gray" appearance="outline" className="text-xs">
                              {group.nature}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            {/* Nature */}
            <div className="space-y-2">
              <Label>
                Account Nature <span className="text-destructive">*</span>
              </Label>
              <Controller
                name="nature"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    {/* Added ref={field.ref} for scrolling */}
                    <SelectTrigger ref={field.ref}>
                      <SelectValue placeholder="Select nature" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="debit">
                        <Badge variant="primary" appearance="outline">Debit</Badge>
                      </SelectItem>
                      <SelectItem value="credit">
                        <Badge variant="warning" appearance="outline">Credit</Badge>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Subgroup */}
          <div className="space-y-2">
            <Label>
              Subgroup <span className="text-destructive">*</span>
            </Label>
            <Controller
              name="subGroup"
              control={control}
              render={({ field }) => (
                <Popover 
                  open={subGroupPopoverOpen} 
                  onOpenChange={(open) => {
                    setSubGroupPopoverOpen(open);
                    if (open) setSearchQuery(field.value || "");
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      ref={field.ref} // Added ref={field.ref} for scrolling
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      disabled={!selectedGroup}
                    >
                      {field.value || "Select or create subgroup..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Search or type new subgroup..."
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList
                        className="max-h-[200px] overflow-y-auto"
                        onWheel={(e) => e.stopPropagation()}
                      >
                        <CommandEmpty>No subgroups found</CommandEmpty>
                        
                        {availableSubGroups.length > 0 && (
                          <CommandGroup heading="Existing Subgroups">
                            {availableSubGroups
                              .filter(sg => !searchQuery || sg.toLowerCase().includes(searchQuery.toLowerCase()))
                              .map((sg) => (
                                <CommandItem
                                  key={sg}
                                  value={sg}
                                  onSelect={() => {
                                    field.onChange(sg);
                                    setSearchQuery(sg);
                                    setSubGroupPopoverOpen(false);
                                  }}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", field.value === sg ? "opacity-100" : "opacity-0")} />
                                  {sg}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        )}

                        {searchQuery.trim() && !availableSubGroups.some(sg => sg.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                          <CommandGroup heading="Create New">
                            <CommandItem
                              onSelect={handleAddCustomSubGroup}
                              className="text-primary"
                              value={searchQuery}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Create "{searchQuery.trim()}"
                            </CommandItem>
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              )}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Brief description of this account..."
              rows={3}
              {...register("description")}
            />
          </div>

          {/* Active Status - ENHANCED */}
          <Label
            htmlFor="isActive"
            className={cn(
              "hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
              isActive && "border-green-600 bg-green-50 dark:border-green-900 dark:bg-green-950"
            )}
          >
            <div className="grid gap-1.5 font-normal flex-1">
              <p className="text-sm leading-none font-medium">
                Active Status
              </p>
              <p className="text-muted-foreground text-sm">
                {isActive ? "This account is active and will appear in transaction forms" : "Inactive accounts won't appear in transaction forms"}
              </p>
            </div>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Switch
                  id="isActive"
                  checked={field.value}
                  onCheckedChange={(val) => field.onChange(val)}
                  className="data-[state=checked]:bg-green-600 dark:data-[state=checked]:bg-green-700"
                />
              )}
            />
          </Label>

          {/* Summary Card */}
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Code</p>
                  <p className="font-mono font-bold">{watch("accountCode") || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Group</p>
                  <p className="font-medium">{watch("groupName") || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nature</p>
                  <Badge
                    variant={watch("nature") === 'debit' ? 'primary' : 'warning'}
                    appearance="outline"
                    className="capitalize mt-1"
                  >
                    {watch("nature") || "—"}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge
                    variant={watch("isActive") ? 'success' : 'gray'}
                    appearance="outline"
                    className="mt-1"
                  >
                    {watch("isActive") ? "Active" : "Inactive"}
                  </Badge>
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
              ) : defaultValues ? "Update Account" : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}