// app/documents/delivery-notes/delivery-note-form.tsx - UPDATED: Populated combobox input

"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { ChevronsUpDown, Check, FileText, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ICustomer } from "@/models/Customer";
import { formatCurrency } from "@/utils/formatters/currency";
import { Spinner } from "@/components/ui/spinner";

interface ConnectedInvoice {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  grandTotal: number;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
}

interface DeliveryNoteFormData {
  invoiceId: string;
}

interface DeliveryNoteFormProps {
  isOpen: boolean;
  onClose: () => void;
  // Updated type to Promise so we can await it
  onSubmit: (data: any) => Promise<void>;
}

export function DeliveryNoteForm({ isOpen, onClose, onSubmit }: DeliveryNoteFormProps) {
  const { watch, setValue, handleSubmit, formState: { isSubmitting } } = useForm<DeliveryNoteFormData>({
    defaultValues: {
      invoiceId: "",
    }
  });

  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [invoices, setInvoices] = useState<ConnectedInvoice[]>([]);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [invoicePopoverOpen, setInvoicePopoverOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<ConnectedInvoice | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const invoiceId = watch("invoiceId");

  // Fetch customers
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch("/api/customers");
        if (res.ok) setCustomers(await res.json());
      } catch (error) {
        console.error("Failed to fetch customers:", error);
      }
    };
    fetchCustomers();
  }, []);

  // Fetch invoices when customer changes
  useEffect(() => {
    if (!selectedCustomer || !isOpen) return;

    const fetchInvoices = async () => {
      setLoadingInvoices(true);
      try {
        // ✅ UPDATED: Use /api/invoices specifically
        const res = await fetch(
          `/api/invoices?status=approved&customerName=${encodeURIComponent(selectedCustomer)}&populate=true`
        );
        if (res.ok) {
          const fetchedInvoices = await res.json();
          // Filter invoices that don't have a delivery note yet
          const availableInvoices = fetchedInvoices.filter(
            (inv: any) => !inv.connectedDocuments?.deliveryId
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
  }, [selectedCustomer, isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setValue("invoiceId", "");
      setSelectedCustomer("");
      setSearchQuery("");
      setSelectedInvoice(null);
      setInvoices([]);
    }
  }, [isOpen, setValue]);

  // Handle customer selection
  const handleCustomerSelect = (customer: ICustomer) => {
    setSelectedCustomer(customer.name);
    setSearchQuery(customer.name);
    setCustomerPopoverOpen(false);
    setInvoices([]);
    setValue("invoiceId", "");
    setSelectedInvoice(null);
  };

  // Handle invoice selection
  const handleInvoiceSelect = (invoice: ConnectedInvoice) => {
    setValue("invoiceId", invoice._id);
    setSelectedInvoice(invoice);
    setInvoicePopoverOpen(false);
  };

  // ✅ Updated to be async to ensure button stays disabled
  const handleFormSubmit = async () => {
    if (!invoiceId) {
      toast.error("Please select an invoice");
      return;
    }

    if (!selectedInvoice) {
      toast.error("Invoice data is missing");
      return;
    }

    const submitData = {
      customerName: selectedInvoice.customerName,
      items: selectedInvoice.items,
      // documentType: "delivery", // Not strictly needed as endpoint defines it
      status: "pending",
      connectedDocuments: {
        invoiceId: invoiceId, // Passed to page.tsx, which will convert to array
      },
    };

    // Await the submission to keep isSubmitting true
    await onSubmit(submitData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Create Delivery Note
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
          {/* Step 1: Select Customer */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Step 1: Select Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer">Customer *</Label>
                <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {selectedCustomer || "Select customer..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput 
                        placeholder="Search customer..." 
                        value={searchQuery}
                        onValueChange={setSearchQuery}
                      />
                      <CommandList
                        className="max-h-[200px] overflow-y-auto"
                        onWheel={(e) => e.stopPropagation()}
                      >
                        <CommandEmpty>No customer found.</CommandEmpty>
                        <CommandGroup>
                          {customers
                            .filter(customer => 
                              !searchQuery || customer.name.toLowerCase().includes(searchQuery.toLowerCase())
                            )
                            .map((customer) => (
                              <CommandItem
                                key={String(customer._id)}
                                value={customer.name}
                                onSelect={() => handleCustomerSelect(customer)}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selectedCustomer === customer.name ? "opacity-100" : "opacity-0")} />
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
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Select Invoice */}
          {selectedCustomer && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Step 2: Select Approved Invoice</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoices.length === 0 && !loadingInvoices && (
                  <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      No approved invoices without delivery notes found for this customer.
                    </p>
                  </div>
                )}

                {invoices.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="invoice">Invoice *</Label>
                    <Popover open={invoicePopoverOpen} onOpenChange={setInvoicePopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" role="combobox" className="w-full justify-between">
                          {invoiceId
                            ? invoices.find(inv => inv._id === invoiceId)?.invoiceNumber
                            : loadingInvoices
                              ? "Loading invoices..."
                              : "Select invoice..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                        <Command>
                          <CommandList
                            className="max-h-[200px] overflow-y-auto"
                            onWheel={(e) => e.stopPropagation()}
                          >
                            <CommandEmpty>No invoices found.</CommandEmpty>
                            <CommandGroup>
                              {invoices.map((invoice) => (
                                <CommandItem
                                  key={invoice._id}
                                  value={invoice._id}
                                  onSelect={() => handleInvoiceSelect(invoice)}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", invoiceId === invoice._id ? "opacity-100" : "opacity-0")} />
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
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Invoice Summary */}
          {selectedInvoice && (
            <Card className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
              <CardHeader>
                <CardTitle className="text-base">Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Invoice No.:</span>
                  <span className="font-mono font-medium">{selectedInvoice.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Customer:</span>
                  <span className="font-medium">{selectedInvoice.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Items:</span>
                  <span className="font-medium">{selectedInvoice.items.length} item(s)</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-blue-200 dark:border-blue-900">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="text-lg font-bold text-blue-900 dark:text-blue-100">
                    {formatCurrency(selectedInvoice.grandTotal)}
                  </span>
                </div>

                {/* Items List */}
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-900">
                  <p className="text-sm font-medium mb-2">Items to Ship:</p>
                  <div className="space-y-2">
                    {selectedInvoice.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.description} (x{item.quantity})
                        </span>
                        <span className="font-medium">{formatCurrency(item.total)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !invoiceId}
            >
              {isSubmitting ? (
                <>
                  <Spinner />
                  Creating...
                </>
              ) : "Create Delivery Note"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}