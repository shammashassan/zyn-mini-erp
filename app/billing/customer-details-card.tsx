// app/billing/customer-details-card.tsx - UPDATED: Sync search query with selection on open

"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { BillPayload } from "@/lib/types";
import type { ICustomer } from "@/models/Customer";
import type { ISupplier } from "@/models/Supplier";
import { Check, ChevronsUpDown, Plus, Users, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerDetailsProps {
  payload: BillPayload;
  onFieldChange: (field: keyof BillPayload, value: string) => void;
  customers: ICustomer[];
  suppliers?: ISupplier[];
}

export function CustomerDetailsCard({ payload, onFieldChange, customers, suppliers = [] }: CustomerDetailsProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Default to customer
  const [partyType, setPartyType] = React.useState<'customer' | 'supplier'>('customer');

  // Enable toggle for vouchers, disable for invoices and quotations
  const isVoucher = payload.documentType === 'receipt' || payload.documentType === 'payment';
  const isToggleDisabled = !isVoucher;

  // Get current name for button label and search sync
  const currentName = partyType === 'customer' ? payload.customerName : (payload as any).supplierName;

  // Sync search query with current selection when opening
  React.useEffect(() => {
    if (open) {
      setSearchQuery(currentName || "");
    }
  }, [open, currentName]);

  // Clear data when switching party type manually or when document type changes
  React.useEffect(() => {
    // For non-vouchers (invoice, quotation), always force customer
    if (!isVoucher && partyType !== 'customer') {
      setPartyType('customer');
      onFieldChange("supplierName" as any, "");
      onFieldChange("customerPhone", "");
      onFieldChange("customerEmail", "");
      setSearchQuery("");
    }
  }, [payload.documentType, isVoucher, partyType, onFieldChange]);

  const handlePartyTypeChange = (newType: string) => {
    if (newType && (newType === 'customer' || newType === 'supplier')) {
      setPartyType(newType as 'customer' | 'supplier');
      
      // Clear all party data when switching
      onFieldChange("customerName", "");
      onFieldChange("supplierName" as any, "");
      onFieldChange("customerPhone", "");
      onFieldChange("customerEmail", "");
      setSearchQuery("");
    }
  };

  const handleSelection = (party: ICustomer | ISupplier) => {
    if (partyType === 'customer') {
      const c = party as ICustomer;
      onFieldChange("customerName", c.name);
      onFieldChange("supplierName" as any, ""); // Clear supplier
      onFieldChange("customerPhone", c.phone || "");
      onFieldChange("customerEmail", c.email || "");
    } else {
      const s = party as ISupplier;
      onFieldChange("supplierName" as any, s.name);
      onFieldChange("customerName", ""); // Clear customer

      const phone = (s.contactNumbers && s.contactNumbers.length > 0) ? s.contactNumbers[0] : "";

      onFieldChange("customerPhone", phone);
      onFieldChange("customerEmail", s.email || "");
    }
    setOpen(false);
    setSearchQuery("");
  };

  const handleCreateNew = () => {
    if (searchQuery.trim()) {
      if (partyType === 'customer') {
        onFieldChange("customerName", searchQuery.trim());
        onFieldChange("supplierName" as any, "");
      } else {
        onFieldChange("supplierName" as any, searchQuery.trim());
        onFieldChange("customerName", "");
      }
      onFieldChange("customerPhone", "");
      onFieldChange("customerEmail", "");
      setOpen(false);
      setSearchQuery("");
    }
  };

  const listToRender = partyType === 'customer' ? customers : suppliers;

  const doesPartyExist = listToRender.some(
    (p) => p.name.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Party Details</CardTitle>
          <ToggleGroup
            type="single"
            value={partyType}
            onValueChange={handlePartyTypeChange}
            size="sm"
            className="border rounded-md p-1"
            disabled={isToggleDisabled}
          >
            <ToggleGroupItem value="customer" size="sm" className="gap-2 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <Users className="h-3 w-3" /> Customer
            </ToggleGroupItem>
            <ToggleGroupItem value="supplier" size="sm" className="gap-2 px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
              <Truck className="h-3 w-3" /> Supplier
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="partyName">{partyType === 'customer' ? 'Customer Name' : 'Supplier Name'}</Label>
          <Popover
            open={open}
            onOpenChange={setOpen}
          >
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {currentName || `Select or type a ${partyType}...`}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command shouldFilter={false}>
                <CommandInput
                  placeholder={`Search ${partyType}...`}
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                />
                <CommandList
                  className="max-h-[200px] overflow-y-auto"
                  onWheel={(e) => e.stopPropagation()}
                >
                  <CommandEmpty>
                    {searchQuery.trim() ? `No ${partyType} found.` : "Start typing to search..."}
                  </CommandEmpty>

                  {listToRender.length > 0 && (
                    <CommandGroup heading={`Existing ${partyType === 'customer' ? 'Customers' : 'Suppliers'}`}>
                      {listToRender.filter(party =>
                        !searchQuery || party.name.toLowerCase().includes(searchQuery.toLowerCase())
                      ).map((party) => (
                        <CommandItem
                          key={String(party._id)}
                          value={party.name}
                          onSelect={() => handleSelection(party)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              currentName === party.name ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {party.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}

                  {searchQuery.trim() && !doesPartyExist && (
                    <CommandGroup heading="Create New">
                      <CommandItem
                        onSelect={handleCreateNew}
                        className="text-primary"
                        value={searchQuery}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Create "{searchQuery}"
                      </CommandItem>
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="customerPhone">Phone Number</Label>
          <Input
            id="customerPhone"
            placeholder="Enter phone number"
            value={payload.customerPhone}
            onChange={(e) => onFieldChange("customerPhone", e.target.value)}
          />
        </div>
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="customerEmail">Email</Label>
          <Input
            id="customerEmail"
            type="email"
            placeholder="Enter email address"
            value={payload.customerEmail}
            onChange={(e) => onFieldChange("customerEmail", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
}