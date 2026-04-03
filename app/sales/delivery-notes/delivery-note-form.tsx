// app/sales/delivery-notes/delivery-note-form.tsx - FINAL: Using PartyContactSelector, no legacy fields

"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
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
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { ChevronsUpDown, Check, AlertCircle, Truck, CalendarIcon, Package } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DeliveryNote } from "./columns";
import { formatCurrency } from "@/utils/formatters/currency";
import { Spinner } from "@/components/ui/spinner";
import { PartyContactSelector } from "@/components/PartyContactSelector";

interface ConnectedInvoice {
  _id: string;
  invoiceNumber: string;
  grandTotal: number;
  totalAmount: number;
  vatAmount: number;
  discount: number;
  items: Array<{
    itemId?: string;
    description: string;
    quantity: number;
    rate: number;
    total: number;
    taxRate?: number;
    taxAmount?: number;
  }>;
}

interface DeliveryNoteFormData {
  partyId: string;
  contactId?: string;
  invoiceId: string;
  deliveryDate: Date;
  status: 'pending' | 'dispatched' | 'delivered' | 'cancelled';
  notes: string;
}

interface DeliveryNoteFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  defaultValues?: DeliveryNote | null;
}

export function DeliveryNoteForm({
  isOpen,
  onClose,
  onSubmit,
  defaultValues
}: DeliveryNoteFormProps) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { isSubmitting, isDirty }
  } = useForm<DeliveryNoteFormData>({
    defaultValues: {
      partyId: '',
      contactId: undefined,
      invoiceId: "",
      deliveryDate: new Date(),
      status: 'pending',
      notes: "",
    }
  });

  const [invoices, setInvoices] = useState<ConnectedInvoice[]>([]);
  const [invoicePopoverOpen, setInvoicePopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ConnectedInvoice | null>(null);
  const [isDesktop, setIsDesktop] = useState(true);

  const partyId = watch("partyId");
  const invoiceId = watch("invoiceId");
  const isEditMode = !!defaultValues?._id;

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

  // Fetch invoices when partyId changes
  useEffect(() => {
    if (!partyId || !isOpen) return;

    const fetchInvoices = async () => {
      setLoadingInvoices(true);
      try {
        const res = await fetch(
          `/api/invoices?status=approved&partyId=${partyId}&populate=true`
        );
        if (res.ok) {
          const fetchedInvoices = await res.json();
          const availableInvoices = fetchedInvoices.filter(
            (inv: any) => !inv.connectedDocuments?.deliveryId ||
              (defaultValues && inv.connectedDocuments?.deliveryId === defaultValues._id)
          );
          setInvoices(availableInvoices);
        }
      } catch (error) {
        console.error("Failed to fetch invoices:", error);
      } finally {
        setLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, [partyId, isOpen, defaultValues]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (defaultValues) {
        // Edit mode - Extract party/contact IDs correctly
        const partyIdValue = typeof defaultValues.partyId === 'object'
          ? (defaultValues.partyId as any)._id
          : defaultValues.partyId;

        const contactIdValue = typeof defaultValues.contactId === 'object'
          ? (defaultValues.contactId as any)._id
          : defaultValues.contactId;

        reset({
          partyId: partyIdValue || "",
          contactId: contactIdValue?.toString() || undefined,
          invoiceId: (defaultValues.connectedDocuments?.invoiceIds?.[0] as any)?._id || "",
          deliveryDate: defaultValues.deliveryDate ? new Date(defaultValues.deliveryDate) : new Date(),
          status: defaultValues.status || 'pending',
          notes: defaultValues.notes || "",
        });

        const invoiceData = defaultValues.connectedDocuments?.invoiceIds?.[0];
        if (invoiceData && typeof invoiceData === 'object') {
          setSelectedInvoice({
            _id: invoiceData._id,
            invoiceNumber: invoiceData.invoiceNumber,
            grandTotal: defaultValues.grandTotal,
            totalAmount: defaultValues.totalAmount ?? defaultValues.grandTotal,
            vatAmount: defaultValues.vatAmount ?? 0,
            discount: defaultValues.discount ?? 0,
            items: defaultValues.items || []
          });
        }
      } else {
        // Create mode
        reset({
          partyId: "",
          contactId: undefined,
          invoiceId: "",
          deliveryDate: new Date(),
          status: 'pending',
          notes: "",
        });
        setSelectedInvoice(null);
        setInvoices([]);
      }
    }
  }, [isOpen, defaultValues, reset]);

  const handleInvoiceSelect = (invoice: ConnectedInvoice) => {
    setValue("invoiceId", invoice._id, { shouldDirty: true });
    setSelectedInvoice(invoice);
    setInvoicePopoverOpen(false);
  };

  const handleFormSubmit = async (data: DeliveryNoteFormData) => {
    if (!data.partyId) {
      toast.error("Please select a customer (Party)");
      return;
    }

    if (!data.invoiceId) {
      toast.error("Please select an invoice");
      return;
    }

    if (!selectedInvoice && !isEditMode) {
      toast.error("Invoice data is missing");
      return;
    }

    if (!data.deliveryDate) {
      toast.error("Please select a delivery date");
      return;
    }

    const submitData: any = {
      partyId: data.partyId,
      contactId: data.contactId,
      status: isEditMode ? data.status : 'pending',
      deliveryDate: data.deliveryDate,
      notes: data.notes.trim() || (selectedInvoice ? `Delivery note for invoice ${selectedInvoice.invoiceNumber}` : ""),
    };

    // Only include items and invoice connection if creating (not editing)
    if (!isEditMode && selectedInvoice) {
      submitData.items = selectedInvoice.items;  // carries itemId, taxRate, taxAmount from invoice
      submitData.discount = selectedInvoice.discount ?? 0;
      // Pass through the invoice totals directly — no VAT recalculation needed
      submitData.totalAmount = selectedInvoice.totalAmount;
      submitData.vatAmount = selectedInvoice.vatAmount;
      submitData.grandTotal = selectedInvoice.grandTotal;
      submitData.connectedDocuments = {
        invoiceId: data.invoiceId,
      };
    }

    await onSubmit(submitData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            {defaultValues ? "Edit Delivery Note" : "Create Delivery Note"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          <div className={cn(
            "grid grid-cols-1 gap-4",
            isEditMode ? "lg:grid-cols-4" : "lg:grid-cols-3"
          )}>
            {/* Customer Field - PartyContactSelector */}
            <div>
              <Controller
                name="partyId"
                control={control}
                render={({ field }) => (
                  <PartyContactSelector
                    value={{ partyId: field.value, contactId: watch('contactId') }}
                    onChange={(val, party) => {
                      const isPartyChange = val.partyId !== field.value;
                      field.onChange(val.partyId);
                      setValue('contactId', val.contactId, { shouldDirty: true });
                      // Reset invoice selection when party changes
                      if (!isEditMode && isPartyChange) {
                        setInvoices([]);
                        setValue("invoiceId", "");
                        setValue("notes", "");
                        setSelectedInvoice(null);
                      }
                    }}
                    allowedRoles={['customer']}
                    className="w-full"
                    layout="vertical"
                    disablePartySelector={isEditMode}
                  />
                )}
              />
            </div>

            {/* Invoice */}
            <div className="space-y-2">
              <Label>Invoice <span className="text-destructive">*</span></Label>
              <Controller
                name="invoiceId"
                control={control}
                render={({ field }) => (
                  <Popover
                    open={invoicePopoverOpen}
                    onOpenChange={setInvoicePopoverOpen}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        ref={field.ref}
                        type="button"
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-9 px-3"
                        disabled={!partyId || loadingInvoices || isEditMode}
                      >
                        {field.value
                          ? (invoices.find(inv => inv._id === field.value)?.invoiceNumber ||
                            (selectedInvoice?._id === field.value ? selectedInvoice.invoiceNumber : "Select invoice..."))
                          : loadingInvoices
                            ? "Loading invoices..."
                            : "Select invoice..."}
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
                          <CommandEmpty>No invoices found.</CommandEmpty>
                          <CommandGroup>
                            {invoices.map((invoice) => (
                              <CommandItem
                                key={invoice._id}
                                value={invoice._id}
                                onSelect={() => handleInvoiceSelect(invoice)}
                              >
                                <Check className={cn(
                                  "mr-2 h-4 w-4",
                                  field.value === invoice._id ? "opacity-100" : "opacity-0"
                                )} />
                                <div>
                                  <div className="font-medium">{invoice.invoiceNumber}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {invoice.items.length} items • {formatCurrency(invoice.grandTotal)}
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

            {/* Delivery Date */}
            <div className="space-y-2">
              <Label>Delivery Date</Label>
              <Controller
                name="deliveryDate"
                control={control}
                render={({ field }) => (
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
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

            {/* Status (only in edit mode) */}
            {isEditMode && (
              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full h-9 px-3">
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="dispatched">Dispatched</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}
          </div>

          {/* Warning if no invoices available */}
          {partyId && invoices.length === 0 && !loadingInvoices && (
            <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                No approved invoices without delivery notes found for this customer.
              </p>
            </div>
          )}

          {/* Invoice Summary & Items */}
          {selectedInvoice && (
            <>
              {/* Invoice Summary Card */}
              <Card className="bg-muted/50">
                <CardContent className="p-4 sm:p-6 space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Invoice No.:</span>
                      <span className="font-medium font-mono">{selectedInvoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Items:</span>
                      <span className="font-medium">{selectedInvoice.items.length} item(s)</span>
                    </div>

                    {/* Total Amount with muted note */}
                    <div className="pt-3 border-t">
                      <div className="flex justify-between">
                        <span className="text-lg font-semibold">Total Amount:</span>
                        <span className="text-xl font-bold text-green-600">
                          {formatCurrency(selectedInvoice.grandTotal)}
                        </span>
                      </div>
                      <div className="text-right text-xs text-muted-foreground mt-1">
                        (includes discounts + vat)
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Items List - Responsive View */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Items to Ship
                </Label>

                {/* Desktop View (Table) */}
                <div className="hidden md:block overflow-x-auto rounded-md border bg-background">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left p-3 font-medium text-sm">#</th>
                        <th className="text-left p-3 font-medium text-sm">Description</th>
                        <th className="text-right p-3 font-medium text-sm">Quantity</th>
                        <th className="text-right p-3 font-medium text-sm">Rate</th>
                        <th className="text-right p-3 font-medium text-sm">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index} className="border-b hover:bg-muted/50 last:border-0">
                          <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                          <td className="p-3">
                            <div className="font-medium text-sm">{item.description}</div>
                          </td>
                          <td className="p-3 text-right font-medium text-sm">
                            {item.quantity.toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-muted-foreground text-sm">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="p-3 text-right font-semibold text-sm">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile View (Cards) */}
                <div className="md:hidden space-y-2 max-h-[300px] overflow-y-auto sidebar-scroll">
                  {selectedInvoice.items.map((item, idx) => (
                    <Card key={idx} className="border">
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Item #{idx + 1}</div>
                            <div className="font-medium text-sm wrap-break-word">{item.description}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Quantity</div>
                            <div className="font-medium">{item.quantity.toFixed(2)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-0.5">Rate</div>
                            <div className="font-medium">{formatCurrency(item.rate)}</div>
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Total</span>
                            <span className="font-bold text-sm">
                              {formatCurrency(item.total)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Notes Field */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="notes"
                  placeholder={
                    selectedInvoice
                      ? `Add delivery notes... (Default: "Delivery note for invoice ${selectedInvoice.invoiceNumber}")`
                      : "Add delivery notes..."
                  }
                  rows={3}
                />
              )}
            />
            <p className="text-xs text-muted-foreground">
              ðŸ’¡ If left empty, a default note will be generated automatically
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !invoiceId || (isEditMode && !isDirty)}
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  {defaultValues ? "Updating..." : "Creating..."}
                </>
              ) : (
                defaultValues ? "Update Delivery Note" : "Create Delivery Note"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}