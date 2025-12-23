// app/documents/vouchers/voucher-form.tsx - FIXED: Resolved import errors and added responsive party selection

"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ChevronsUpDown, 
  Check, 
  Wallet, 
  AlertCircle, 
  Users, 
  Building2, 
  User, 
  Store,
  Loader2 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { ICustomer } from "@/models/Customer";
import type { ISupplier } from "@/models/Supplier";
import type { IPayee } from "@/models/Payee";

// Local utility for currency formatting to avoid import errors
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

interface ConnectedInvoice {
  _id: string;
  invoiceNumber: string;
  grandTotal: number;
  status: string;
  paymentStatus: 'Paid' | 'Pending' | 'Partially Paid' | 'Refunded';
  paidAmount: number;
  refundedAmount?: number;
  remainingAmount: number;
  connectedDocuments?: {
    receiptIds?: any[];
  }
}

interface ConnectedPurchase {
  _id: string;
  referenceNumber: string;
  totalAmount: number;
  grandTotal?: number;
  paymentStatus: 'Paid' | 'Pending' | 'Partially Paid';
  paidAmount: number;
  remainingAmount: number;
  connectedDocuments?: {
    paymentIds?: any[];
  }
  vatAmount?: number;
  supplierName?: string;
}

type PartyType = 'customer' | 'supplier' | 'payee' | 'vendor';

type VoucherFormData = {
  voucherType: 'receipt' | 'payment' | 'refund';
  partyType: PartyType;
  paymentMethod: string;
  voucherAmount: number;
  discount: number;
  notes: string;
  selectedInvoiceIds?: string[];
  selectedPurchaseIds?: string[];
};

interface VoucherFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'UPI',
  'Bank Transfer',
  'Cheque',
];

export function VoucherForm({ isOpen, onClose, onSubmit }: VoucherFormProps) {
  const { register, handleSubmit, watch, setValue, control, formState: { isSubmitting } } = useForm<VoucherFormData>({
    defaultValues: {
      voucherType: 'receipt',
      partyType: 'customer',
      paymentMethod: 'Cash',
      voucherAmount: 0,
      discount: 0,
      notes: "",
    }
  });

  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [payees, setPayees] = useState<IPayee[]>([]);
  const [invoices, setInvoices] = useState<ConnectedInvoice[]>([]);
  const [purchases, setPurchases] = useState<ConnectedPurchase[]>([]);
  const [partyPopoverOpen, setPartyPopoverOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<Set<string>>(new Set());

  const voucherType = watch("voucherType");
  const partyType = watch("partyType");
  const paymentMethod = watch("paymentMethod");
  const discount = watch("discount") || 0;

  const hasLinkedDocuments =
    (voucherType === 'receipt' && selectedInvoiceIds.size > 0) ||
    (voucherType === 'payment' && selectedPurchaseIds.size > 0) ||
    (voucherType === 'refund' && selectedInvoiceIds.size > 0);

  // Fetch customers, suppliers, and payees
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersRes, suppliersRes, payeesRes] = await Promise.all([
          fetch("/api/customers"),
          fetch("/api/suppliers"),
          fetch("/api/payees")
        ]);

        if (customersRes.ok) setCustomers(await customersRes.json());
        if (suppliersRes.ok) setSuppliers(await suppliersRes.json());
        if (payeesRes.ok) setPayees(await payeesRes.json());
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  // Update party type defaults when voucher type changes
  useEffect(() => {
    if (voucherType === 'receipt' || voucherType === 'refund') {
      setValue('partyType', 'customer');
    } else if (voucherType === 'payment') {
      setValue('partyType', 'supplier');
    }
  }, [voucherType, setValue]);

  // Fetch invoices for customers
  useEffect(() => {
    if ((voucherType !== 'receipt' && voucherType !== 'refund') ||
      partyType !== 'customer' ||
      !selectedParty ||
      !isOpen) return;

    const fetchInvoices = async () => {
      setLoadingInvoices(true);
      try {
        const res = await fetch(
          `/api/invoices?customerName=${encodeURIComponent(selectedParty)}&populate=true`
        );
        if (res.ok) {
          const fetchedInvoices = await res.json();

          let availableInvoices;

          // ✅ RECEIPT: Show approved invoices with pending/partially paid status
          if (voucherType === 'receipt') {
            availableInvoices = fetchedInvoices
              .filter((inv: any) =>
                inv.status === 'approved' &&
                (inv.paymentStatus === 'Pending' || inv.paymentStatus === 'Partially Paid')
              )
              .map((inv: any) => {
                const totalAmount = inv.grandTotal;
                const paid = inv.paidAmount || 0;
                const remaining = totalAmount - paid;

                return {
                  ...inv,
                  paidAmount: paid,
                  remainingAmount: remaining
                };
              })
              .filter((inv: any) => inv.remainingAmount > 0);
          }

          // ✅ REFUND: Show approved invoices with paidAmount > 0
          else if (voucherType === 'refund') {
            availableInvoices = fetchedInvoices
              .filter((inv: any) =>
                inv.status === 'approved' &&
                inv.paidAmount > 0 &&
                (inv.paymentStatus === 'Paid' || inv.paymentStatus === 'Partially Paid')
              )
              .map((inv: any) => {
                const refunded = inv.refundedAmount || 0;
                const maxRefundable = inv.paidAmount - refunded;

                return {
                  ...inv,
                  refundedAmount: refunded,
                  remainingRefundable: maxRefundable
                };
              })
              .filter((inv: any) => inv.remainingRefundable > 0);
          }

          setInvoices(availableInvoices || []);
        }
      } catch (error) {
        console.error("Failed to fetch invoices:", error);
      } finally {
        setLoadingInvoices(false);
      }
    };

    fetchInvoices();
  }, [voucherType, partyType, selectedParty, isOpen]);

  // Fetch purchases for suppliers
  useEffect(() => {
    if (voucherType !== 'payment' || partyType !== 'supplier' || !selectedParty || !isOpen) return;

    const fetchPurchases = async () => {
      setLoadingPurchases(true);
      try {
        const res = await fetch(`/api/purchases?populate=true`);
        if (res.ok) {
          const allPurchases = await res.json();
          const availablePurchases = allPurchases.filter(
            (purchase: any) =>
              purchase.supplierName === selectedParty &&
              (purchase.paymentStatus === 'Pending' || purchase.paymentStatus === 'Partially Paid') &&
              (purchase.remainingAmount > 0 || (purchase.totalAmount - (purchase.paidAmount || 0)) > 0)
          );
          setPurchases(availablePurchases);
        }
      } catch (error) {
        console.error("Failed to fetch purchases:", error);
      } finally {
        setLoadingPurchases(false);
      }
    };

    fetchPurchases();
  }, [voucherType, partyType, selectedParty, isOpen]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setValue("voucherType", 'receipt');
      setValue("partyType", 'customer');
      setValue("paymentMethod", 'Cash');
      setValue("voucherAmount", 0);
      setValue("discount", 0);
      setValue("notes", "");
      setSelectedParty("");
      setVendorName("");
      setSelectedInvoiceIds(new Set());
      setSelectedPurchaseIds(new Set());
      setInvoices([]);
      setPurchases([]);
    }
  }, [isOpen, setValue]);

  // Get party list based on selected type
  const getPartyList = () => {
    switch (partyType) {
      case 'customer': return customers;
      case 'supplier': return suppliers;
      case 'payee': return payees;
      case 'vendor': return [];
      default: return [];
    }
  };

  const handlePartySelect = (party: ICustomer | ISupplier | IPayee) => {
    setSelectedParty(party.name);
    setPartyPopoverOpen(false);
    setSelectedInvoiceIds(new Set());
    setSelectedPurchaseIds(new Set());
  };

  const toggleInvoiceSelection = (invoiceId: string) => {
    const newSet = new Set(selectedInvoiceIds);
    if (newSet.has(invoiceId)) {
      newSet.delete(invoiceId);
    } else {
      newSet.add(invoiceId);
    }
    setSelectedInvoiceIds(newSet);
  };

  const togglePurchaseSelection = (purchaseId: string) => {
    const newSet = new Set(selectedPurchaseIds);
    if (newSet.has(purchaseId)) {
      newSet.delete(purchaseId);
    } else {
      newSet.add(purchaseId);
    }
    setSelectedPurchaseIds(newSet);
  };

  const selectedInvoicesTotalAmount = invoices
    .filter(inv => selectedInvoiceIds.has(inv._id))
    .reduce((sum, inv) => {
      if (voucherType === 'refund') {
        return sum + ((inv as any).remainingRefundable || 0);
      }
      return sum + (inv.remainingAmount || 0);
    }, 0);

  const selectedPurchasesTotalAmount = purchases
    .filter(purch => selectedPurchaseIds.has(purch._id))
    .reduce((sum, purch) => sum + (purch.remainingAmount || 0), 0);

  useEffect(() => {
    if (hasLinkedDocuments) {
      const baseAmount = voucherType === 'receipt' || voucherType === 'refund'
        ? selectedInvoicesTotalAmount
        : selectedPurchasesTotalAmount;
      const finalAmount = Math.max(0, baseAmount - discount);
      setValue("voucherAmount", finalAmount);
    }
  }, [hasLinkedDocuments, selectedInvoicesTotalAmount, selectedPurchasesTotalAmount, discount, voucherType, setValue]);

  const handleFormSubmit = async (data: VoucherFormData) => {
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (data.voucherAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Validate party selection
    if (partyType === 'vendor') {
      if (!vendorName || vendorName.trim() === '') {
        toast.error("Please enter a vendor name");
        return;
      }
    } else {
      if (!selectedParty) {
        toast.error(`Please select a ${partyType}`);
        return;
      }
    }

    let selectedDocuments: any = {};

    if (voucherType === 'receipt') {
      if (selectedInvoiceIds.size > 0) {
        selectedDocuments = { invoiceIds: Array.from(selectedInvoiceIds) };
      }
    } else if (voucherType === 'payment') {
      if (selectedPurchaseIds.size > 0) {
        selectedDocuments = { purchaseIds: Array.from(selectedPurchaseIds) };
      }
    } else if (voucherType === 'refund') {
      if (selectedInvoiceIds.size > 0) {
        selectedDocuments = { invoiceIds: Array.from(selectedInvoiceIds) };
      }
    }

    const submitData: any = {
      voucherType: voucherType,
      paymentMethod: paymentMethod,
      items: [],
      discount: discount,
      notes: data.notes,
      totalAmount: data.voucherAmount,
      grandTotal: data.voucherAmount,
      connectedDocuments: selectedDocuments,
    };

    // Set party data based on party type
    switch (partyType) {
      case 'customer':
        submitData.customerName = selectedParty;
        break;
      case 'supplier':
        submitData.supplierName = selectedParty;
        break;
      case 'payee':
        submitData.payeeName = selectedParty;
        break;
      case 'vendor':
        submitData.vendorName = vendorName.trim();
        break;
    }

    await onSubmit(submitData);
  };

  const getPartyTypeIcon = (type: PartyType) => {
    switch (type) {
      case 'customer': return Users;
      case 'supplier': return Building2;
      case 'payee': return User;
      case 'vendor': return Store;
    }
  };

  const handleVoucherTypeChange = (value: 'receipt' | 'payment' | 'refund') => {
    if (value) {
      setValue("voucherType", value);
      setSelectedParty("");
      setVendorName("");
      setSelectedInvoiceIds(new Set());
      setSelectedPurchaseIds(new Set());
      setValue("voucherAmount", 0);
    }
  };

  const handlePartyTypeChange = (value: PartyType) => {
    if (value) {
      setValue('partyType', value);
      setSelectedParty("");
      setVendorName("");
      setSelectedInvoiceIds(new Set());
      setSelectedPurchaseIds(new Set());
    }
  };

  const partyList = getPartyList();
  const showInvoices = (voucherType === 'receipt' || voucherType === 'refund') && partyType === 'customer';
  const showPurchases = voucherType === 'payment' && partyType === 'supplier';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Create Voucher
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Voucher Type</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {/* Desktop Toggle Group */}
                <ToggleGroup
                  type="single"
                  value={voucherType}
                  onValueChange={handleVoucherTypeChange}
                  variant="outline"
                  className="w-full hidden md:grid grid-cols-3"
                >
                  <ToggleGroupItem value="receipt" className="flex-1">Receipt</ToggleGroupItem>
                  <ToggleGroupItem value="payment" className="flex-1">Payment</ToggleGroupItem>
                  <ToggleGroupItem value="refund" className="flex-1">Refund</ToggleGroupItem>
                </ToggleGroup>

                {/* Mobile Select */}
                <div className="md:hidden">
                  <Select
                    value={voucherType}
                    onValueChange={handleVoucherTypeChange}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select voucher type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="receipt">Receipt</SelectItem>
                      <SelectItem value="payment">Payment</SelectItem>
                      <SelectItem value="refund">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Party Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Party Type Selection */}
              <div className="space-y-2">
                <Label>Party Type</Label>
                
                {/* Desktop Toggle Group */}
                <ToggleGroup
                  type="single"
                  value={partyType}
                  onValueChange={handlePartyTypeChange}
                  variant="outline"
                  className="w-full hidden md:grid grid-cols-4"
                >
                  {(['customer', 'supplier', 'payee', 'vendor'] as PartyType[]).map((type) => {
                    const Icon = getPartyTypeIcon(type);
                    return (
                      <ToggleGroupItem key={type} value={type} className="flex items-center gap-2 capitalize flex-1">
                         <Icon className="h-4 w-4" />
                         {type}
                      </ToggleGroupItem>
                    );
                  })}
                </ToggleGroup>

                {/* Mobile Select */}
                <div className="md:hidden">
                  <Select
                    value={partyType}
                    onValueChange={handlePartyTypeChange}
                  >
                     <SelectTrigger className="w-full capitalize">
                      <SelectValue placeholder="Select party type" />
                    </SelectTrigger>
                    <SelectContent>
                      {(['customer', 'supplier', 'payee', 'vendor'] as PartyType[]).map((type) => {
                        const Icon = getPartyTypeIcon(type);
                         return (
                          <SelectItem key={type} value={type} className="capitalize">
                            <div className="flex items-center gap-2">
                               <Icon className="h-4 w-4" />
                               {type}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

              </div>

              {/* Party Selection */}
              {partyType === 'vendor' ? (
                <div className="space-y-2">
                  <Label htmlFor="vendorName">Vendor Name *</Label>
                  <Input
                    id="vendorName"
                    placeholder="Enter vendor name..."
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="party">
                    {partyType.charAt(0).toUpperCase() + partyType.slice(1)} *
                  </Label>
                  <Popover open={partyPopoverOpen} onOpenChange={setPartyPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between">
                        {selectedParty || `Select ${partyType}...`}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput placeholder={`Search ${partyType}...`} />
                        <CommandList
                          className="max-h-[200px] overflow-y-auto"
                          onWheel={(e) => e.stopPropagation()}
                        >
                          <CommandEmpty>No {partyType} found.</CommandEmpty>
                          <CommandGroup>
                            {partyList.map((party) => (
                              <CommandItem
                                key={String(party._id)}
                                value={party.name}
                                onSelect={() => handlePartySelect(party)}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selectedParty === party.name ? "opacity-100" : "opacity-0")} />
                                <div>
                                  <div>{party.name}</div>
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

              {/* Show Invoices for Customers */}
              {showInvoices && selectedParty && (
                <div className="space-y-2">
                  <Label>
                    {voucherType === 'receipt' ? 'Invoices (Optional)' : 'Paid Invoices (Required for Refund)'}
                  </Label>
                  {invoices.length === 0 && !loadingInvoices && (
                    <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <p className="text-sm text-yellow-900 dark:text-yellow-100">
                        {voucherType === 'receipt'
                          ? 'No approved pending invoices found.'
                          : 'No approved paid invoices available for refund.'}
                      </p>
                    </div>
                  )}
                  {invoices.length > 0 && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {invoices.map((invoice) => {
                        const isSelected = selectedInvoiceIds.has(invoice._id);
                        const displayAmount = voucherType === 'refund'
                          ? (invoice as any).remainingRefundable
                          : invoice.remainingAmount;

                        return (
                          <Label
                            key={invoice._id}
                            htmlFor={`invoice-${invoice._id}`}
                            className={cn(
                              "hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                              isSelected && (voucherType === 'refund'
                                ? "border-red-600 bg-red-50 dark:border-red-900 dark:bg-red-950"
                                : "border-blue-600 bg-blue-50 dark:border-blue-900 dark:bg-blue-950")
                            )}
                          >
                            <div className="grid gap-1.5 font-normal flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{invoice.invoiceNumber}</span>
                                <Badge variant="primary" appearance="outline">{invoice.paymentStatus}</Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                                <div>Total: {formatCurrency(invoice.grandTotal)}</div>
                                <div className="text-green-600">Paid: {formatCurrency(invoice.paidAmount)}</div>
                                {voucherType === 'refund' ? (
                                  <div className="text-red-600">Refundable: {formatCurrency(displayAmount)}</div>
                                ) : (
                                  <div className="text-orange-600">Rem: {formatCurrency(displayAmount)}</div>
                                )}
                              </div>
                            </div>
                            <Checkbox
                              id={`invoice-${invoice._id}`}
                              checked={isSelected}
                              onCheckedChange={() => toggleInvoiceSelection(invoice._id)}
                            />
                          </Label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Show Purchases for Suppliers */}
              {showPurchases && selectedParty && (
                <div className="space-y-2">
                  <Label>Purchases (Optional)</Label>
                  {purchases.length === 0 && !loadingPurchases && (
                    <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                      <p className="text-sm text-yellow-900 dark:text-yellow-100">No pending purchases found.</p>
                    </div>
                  )}
                  {purchases.length > 0 && (
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {purchases.map((purchase) => {
                        const displayTotal = purchase.grandTotal ?? purchase.totalAmount ?? 0;
                        const isSelected = selectedPurchaseIds.has(purchase._id);
                        return (
                          <Label
                            key={purchase._id}
                            htmlFor={`purchase-${purchase._id}`}
                            className={cn(
                              "hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                              isSelected && "border-yellow-600 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950"
                            )}
                          >
                            <div className="grid gap-1.5 font-normal flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-medium">{purchase.referenceNumber}</span>
                                <Badge variant="warning" appearance="outline">{purchase.paymentStatus}</Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                                <div>Total: {formatCurrency(displayTotal)}</div>
                                <div className="text-green-600">Paid: {formatCurrency(purchase.paidAmount)}</div>
                                <div className="text-orange-600">Rem: {formatCurrency(purchase.remainingAmount)}</div>
                              </div>
                            </div>
                            <Checkbox
                              id={`purchase-${purchase._id}`}
                              checked={isSelected}
                              onCheckedChange={() => togglePurchaseSelection(purchase._id)}
                            />
                          </Label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={(value) => setValue("paymentMethod", value)}>
                  <SelectTrigger id="paymentMethod"><SelectValue placeholder="Select payment method" /></SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>{method}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {hasLinkedDocuments && (
                <div className="space-y-2">
                  <Label htmlFor="discount">Discount (Optional)</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...register("discount", { valueAsNumber: true })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="voucherAmount">Amount (incl. VAT) *</Label>
                <Input
                  id="voucherAmount"
                  type="number"
                  step="0.01"
                  disabled={hasLinkedDocuments}
                  className={hasLinkedDocuments ? "bg-muted" : ""}
                  placeholder="0.00"
                  {...register("voucherAmount", { valueAsNumber: true })}
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
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : "Create Voucher"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}