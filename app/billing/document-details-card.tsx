// app/billing/document-details-card.tsx

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { BillPayload } from "@/lib/types";
import { Check, ChevronsUpDown } from "lucide-react";

const documentTypes = [
  { value: "quotation", label: "Quotation" },
  { value: "invoice", label: "Invoice" },
  { value: "receipt", label: "Receipt Voucher" },
  { value: "payment", label: "Payment Voucher" },
  { value: "delivery", label: "Delivery Note" },
];

const paymentMethods = [
  { value: "Cash", label: "Cash" },
  { value: "Credit Card", label: "Credit Card" },
  { value: "Debit Card", label: "Debit Card" },
  { value: "UPI", label: "UPI" },
  { value: "Bank Transfer", label: "Bank Transfer" },
  { value: "Cheque", label: "Cheque" },
];

interface DocumentDetailsProps {
  payload: BillPayload;
  onFieldChange: (field: keyof BillPayload, value: string | number | Date | null) => void;
}

export function DocumentDetailsCard({ payload, onFieldChange }: DocumentDetailsProps) {
  const [docTypePopoverOpen, setDocTypePopoverOpen] = useState(false);
  const [paymentPopoverOpen, setPaymentPopoverOpen] = useState(false);
  const inputStyles = "bg-background placeholder:text-muted-foreground/70";

  // Payment method is required only for receipt/payment vouchers
  const requiresPaymentMethod = payload.documentType === 'receipt' || payload.documentType === 'payment';

  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Details</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Document Type */}
          <div className="grid w-full items-center gap-1.5">
            <Label>Document Type</Label>
            <Popover open={docTypePopoverOpen} onOpenChange={setDocTypePopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {documentTypes.find((type) => type.value === payload.documentType)?.label ?? "Select type..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search type..." />
                  <CommandList
                    className="max-h-[200px] overflow-y-auto"
                    onWheel={(e) => e.stopPropagation()}
                  >
                    <CommandEmpty>No type found.</CommandEmpty>
                    <CommandGroup>
                      {documentTypes.map((type) => (
                        <CommandItem
                          key={type.value}
                          value={type.value}
                          onSelect={(currentValue) => {
                            onFieldChange("documentType", currentValue);
                            setDocTypePopoverOpen(false);
                          }}
                        >
                          <Check className={cn("mr-2 h-4 w-4", payload.documentType === type.value ? "opacity-100" : "opacity-0")} />
                          {type.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Payment Method - Only for receipt/payment vouchers */}
          {requiresPaymentMethod && (
            <div className="grid w-full items-center gap-1.5">
              <Label>Payment Method *</Label>
              <Popover open={paymentPopoverOpen} onOpenChange={setPaymentPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between">
                    {payload.paymentMethod ? paymentMethods.find((method) => method.value === payload.paymentMethod)?.label : "Select method..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder="Search method..." />
                    <CommandList
                      className="max-h-[200px] overflow-y-auto"
                      onWheel={(e) => e.stopPropagation()}
                    >
                      <CommandEmpty>No payment method found.</CommandEmpty>
                      <CommandGroup>
                        {paymentMethods.map((method) => (
                          <CommandItem
                            key={method.value}
                            value={method.value}
                            onSelect={(currentValue) => {
                              onFieldChange("paymentMethod", currentValue);
                              setPaymentPopoverOpen(false);
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", payload.paymentMethod === method.value ? "opacity-100" : "opacity-0")} />
                            {method.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Amount - Only for vouchers */}
          {requiresPaymentMethod && (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="voucherAmount">Amount (incl. VAT) *</Label>
              <Input
                id="voucherAmount"
                type="number"
                placeholder="0.00"
                step="0.01"
                min="0"
                value={payload.voucherAmount || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || value === '-') {
                    onFieldChange("voucherAmount", 0);
                  } else {
                    const numValue = parseFloat(value);
                    onFieldChange("voucherAmount", isNaN(numValue) ? 0 : numValue);
                  }
                }}
                className={inputStyles}
                required
              />
            </div>
          )}

          {/* Discount - Only for invoices/quotations/deliveries */}
          {!requiresPaymentMethod && (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="discount">Discount</Label>
              <Input
                id="discount"
                type="number"
                placeholder="0"
                value={payload.discount === 0 ? '' : payload.discount}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || value === '-') {
                    onFieldChange("discount", 0);
                  } else {
                    const numValue = parseFloat(value);
                    onFieldChange("discount", isNaN(numValue) ? 0 : numValue);
                  }
                }}
                onFocus={(e) => {
                  if (e.target.value === '0') {
                    e.target.value = '';
                  }
                }}
                onBlur={(e) => {
                  if (e.target.value === '' || e.target.value === '-') {
                    onFieldChange("discount", 0);
                  }
                }}
                className={inputStyles}
              />
            </div>
          )}

          {/* Notes */}
          <div className="grid w-full items-center gap-1.5 md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              placeholder="Add any relevant notes..."
              value={payload.notes}
              onChange={(e) => onFieldChange("notes", e.target.value)}
              className={inputStyles}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}