// app/sales/vouchers/voucher-form.tsx

"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Calendar } from "@/components/ui/calendar";
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
  Plus,
  Calendar as CalendarIcon,
  DollarSign,
  CreditCard,
  Landmark,
  FileText
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import type { ICustomer } from "@/models/Customer";
import type { ISupplier } from "@/models/Supplier";
import type { IPayee } from "@/models/Payee";
import { formatCurrency } from "@/utils/formatters/currency";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
  voucherType: 'receipt' | 'payment';
  partyType: PartyType;
  paymentMethod: string;
  voucherAmount: number;
  discount: number;
  notes: string;
  voucherDate: Date;
  selectedInvoiceIds?: string[];
  selectedPurchaseIds?: string[];
};

interface VoucherFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
}

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Cash', icon: DollarSign },
  { value: 'Credit Card', label: 'Credit Card', icon: CreditCard },
  { value: 'Debit Card', label: 'Debit Card', icon: CreditCard },
  { value: 'UPI', label: 'UPI', icon: Wallet },
  { value: 'Bank Transfer', label: 'Bank Transfer', icon: Landmark },
  { value: 'Cheque', label: 'Cheque', icon: FileText },
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
      voucherDate: new Date(),
    }
  });

  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [payees, setPayees] = useState<IPayee[]>([]);
  const [invoices, setInvoices] = useState<ConnectedInvoice[]>([]);
  const [purchases, setPurchases] = useState<ConnectedPurchase[]>([]);
  const [partyPopoverOpen, setPartyPopoverOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState("");
  const [partySearchQuery, setPartySearchQuery] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingPurchases, setLoadingPurchases] = useState(false);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
  const [selectedPurchaseIds, setSelectedPurchaseIds] = useState<Set<string>>(new Set());
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  const voucherType = watch("voucherType");
  const partyType = watch("partyType");
  const paymentMethod = watch("paymentMethod");
  const discount = watch("discount") || 0;

  const hasLinkedDocuments =
    (voucherType === 'receipt' && selectedInvoiceIds.size > 0) ||
    (voucherType === 'payment' && selectedPurchaseIds.size > 0);

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkIsDesktop();
    window.addEventListener("resize", checkIsDesktop);
    return () => window.removeEventListener("resize", checkIsDesktop);
  }, []);

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
    if (voucherType === 'receipt') {
      setValue('partyType', 'customer');
    } else if (voucherType === 'payment') {
      setValue('partyType', 'supplier');
    }
  }, [voucherType, setValue]);

  // Fetch invoices for customers
  useEffect(() => {
    if ((voucherType !== 'receipt') ||
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

          const availableInvoices = fetchedInvoices
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
      setValue("voucherDate", new Date());
      setSelectedParty("");
      setPartySearchQuery("");
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
    setPartySearchQuery(party.name);
    setPartyPopoverOpen(false);
    setSelectedInvoiceIds(new Set());
    setSelectedPurchaseIds(new Set());
  };

  const handleCreateNew = () => {
    if (partySearchQuery.trim()) {
      setSelectedParty(partySearchQuery.trim());
      setPartyPopoverOpen(false);
      setSelectedInvoiceIds(new Set());
      setSelectedPurchaseIds(new Set());
    }
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
      return sum + (inv.remainingAmount || 0);
    }, 0);

  const selectedPurchasesTotalAmount = purchases
    .filter(purch => selectedPurchaseIds.has(purch._id))
    .reduce((sum, purch) => sum + (purch.remainingAmount || 0), 0);

  useEffect(() => {
    if (hasLinkedDocuments) {
      const baseAmount = voucherType === 'receipt'
        ? selectedInvoicesTotalAmount
        : selectedPurchasesTotalAmount;
      const finalAmount = Math.max(0, baseAmount - discount);
      setValue("voucherAmount", finalAmount);
    }
  }, [hasLinkedDocuments, selectedInvoicesTotalAmount, selectedPurchasesTotalAmount, discount, voucherType, setValue]);

  const doesPartyExist = () => {
    const partyList = getPartyList();
    return partyList.some(
      (p) => p.name.toLowerCase() === partySearchQuery.trim().toLowerCase()
    );
  };

  const handleFormSubmit = async (data: VoucherFormData) => {
    if (!paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }

    if (data.voucherAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!data.voucherDate) {
      toast.error("Please select a voucher date");
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

      // Check if party exists, if not create it
      const partyList = getPartyList();
      const partyExists = partyList.some(
        (p) => p.name.toLowerCase() === selectedParty.trim().toLowerCase()
      );

      if (!partyExists) {
        try {
          let endpoint = '';
          let partyPayload: any = { name: selectedParty.trim() };
          let entityName = '';

          switch (partyType) {
            case 'customer':
              endpoint = '/api/customers';
              entityName = 'Customer';
              break;
            case 'supplier':
              endpoint = '/api/suppliers';
              entityName = 'Supplier';
              break;
            case 'payee':
              endpoint = '/api/payees';
              partyPayload.type = 'individual';
              entityName = 'Payee';
              break;
          }

          const createRes = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(partyPayload),
          });

          if (createRes.ok) {
            toast.success(`${entityName} "${selectedParty}" created successfully`);

            const refreshRes = await fetch(endpoint);
            if (refreshRes.ok) {
              const updatedList = await refreshRes.json();
              switch (partyType) {
                case 'customer':
                  setCustomers(updatedList);
                  break;
                case 'supplier':
                  setSuppliers(updatedList);
                  break;
                case 'payee':
                  setPayees(updatedList);
                  break;
              }
            }
          } else {
            const error = await createRes.json();
            toast.error(`Failed to create ${entityName.toLowerCase()}`, {
              description: error.error || "Please try again"
            });
            return;
          }
        } catch (error) {
          console.error(`Error creating ${partyType}:`, error);
          toast.error(`Failed to create ${partyType}`);
          return;
        }
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
    }

    const submitData: any = {
      voucherType: voucherType,
      paymentMethod: paymentMethod,
      items: [],
      discount: discount,
      notes: data.notes,
      totalAmount: data.voucherAmount,
      grandTotal: data.voucherAmount,
      voucherDate: data.voucherDate,
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

  const handleVoucherTypeChange = (value: string) => {
    if (value && (value === 'receipt' || value === 'payment')) {
      setValue("voucherType", value as 'receipt' | 'payment');
      setSelectedParty("");
      setPartySearchQuery("");
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
      setPartySearchQuery("");
      setVendorName("");
      setSelectedInvoiceIds(new Set());
      setSelectedPurchaseIds(new Set());
    }
  };

  const partyList = getPartyList();
  const showInvoices = voucherType === 'receipt' && partyType === 'customer';
  const showPurchases = voucherType === 'payment' && partyType === 'supplier';

  const totalSelectedItems = selectedInvoiceIds.size + selectedPurchaseIds.size;

  const showSummarySeparator =
    (voucherType === 'receipt') &&
    selectedInvoiceIds.size > 0 &&
    hasLinkedDocuments &&
    discount > 0;


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
          {/* Voucher Type Tabs */}
          <div className="space-y-2">
            {/* Desktop Toggle Group */}
            <ToggleGroup
              type="single"
              value={voucherType}
              onValueChange={handleVoucherTypeChange}
              variant="outline"
              className="w-full hidden md:grid grid-cols-2"
            >
              <ToggleGroupItem value="receipt" className="flex-1">Receipt</ToggleGroupItem>
              <ToggleGroupItem value="payment" className="flex-1">Payment</ToggleGroupItem>
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
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Top Row: Party Type, Party Selection, Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Party Type Selection */}
            <div className="space-y-2">
              <Label>Party Type <span className="text-destructive">*</span></Label>
              <Select value={partyType} onValueChange={handlePartyTypeChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select party type" />
                </SelectTrigger>
                <SelectContent>
                  {(['customer', 'supplier', 'payee', 'vendor'] as PartyType[]).map((type) => {
                    const Icon = getPartyTypeIcon(type);
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2 capitalize">
                          <Icon className="h-4 w-4" />
                          {type}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Party Selection */}
            {partyType === 'vendor' ? (
              <div className="space-y-2">
                <Label htmlFor="vendorName">Vendor Name <span className="text-destructive">*</span></Label>
                <Input
                  id="vendorName"
                  placeholder="Enter vendor name..."
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label>
                  {partyType.charAt(0).toUpperCase() + partyType.slice(1)} <span className="text-destructive">*</span>
                </Label>
                <Popover
                  open={partyPopoverOpen}
                  onOpenChange={(isOpen) => {
                    setPartyPopoverOpen(isOpen);
                    if (isOpen) setPartySearchQuery(selectedParty);
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      <span className="truncate">{selectedParty || `Select ${partyType}...`}</span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] sm:w-[400px] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder={`Search ${partyType}...`}
                        value={partySearchQuery}
                        onValueChange={setPartySearchQuery}
                      />
                      <CommandList
                        className="max-h-[200px] overflow-y-auto"
                        onWheel={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                      >
                        <CommandEmpty>
                          {partySearchQuery.trim() ? `No ${partyType} found.` : "Start typing to search..."}
                        </CommandEmpty>

                        {partyList.length > 0 && (
                          <CommandGroup heading={`Existing ${partyType.charAt(0).toUpperCase() + partyType.slice(1)}s`}>
                            {partyList
                              .filter(party =>
                                !partySearchQuery || party.name.toLowerCase().includes(partySearchQuery.toLowerCase())
                              )
                              .map((party) => (
                                <CommandItem
                                  key={String(party._id)}
                                  value={party.name}
                                  onSelect={() => handlePartySelect(party)}
                                >
                                  <Check className={cn("mr-2 h-4 w-4", selectedParty === party.name ? "opacity-100" : "opacity-0")} />
                                  <div className="flex-1">
                                    <span>{party.name}</span>
                                    {partyType === 'customer' && (party as any).email && (
                                      <div className="text-xs text-muted-foreground">
                                        {(party as any).email}
                                      </div>
                                    )}
                                    {partyType === 'supplier' && (party as any).city && (party as any).district && (
                                      <div className="text-xs text-muted-foreground">
                                        {(party as any).city}, {(party as any).district}
                                      </div>
                                    )}
                                    {partyType === 'payee' && (party as any).type && (
                                      <div className="text-xs text-muted-foreground capitalize">
                                        {(party as any).type}
                                      </div>
                                    )}
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        )}

                        {partySearchQuery.trim() && !doesPartyExist() && (
                          <CommandGroup heading="Create New">
                            <CommandItem
                              onSelect={handleCreateNew}
                              className="text-primary"
                              value={partySearchQuery}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Create "{partySearchQuery}"
                            </CommandItem>
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Voucher Date */}
            <div className="space-y-2">
              <Label>Voucher Date <span className="text-destructive">*</span></Label>
              <Controller
                name="voucherDate"
                control={control}
                render={({ field }) => (
                  <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        ref={field.ref}
                        type="button"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
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
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method <span className="text-destructive">*</span></Label>
            <Select value={paymentMethod} onValueChange={(value) => setValue("paymentMethod", value)}>
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => {
                  const Icon = method.icon;
                  return (
                    <SelectItem key={method.value} value={method.value}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {method.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Show Invoices for Customers */}
          {showInvoices && selectedParty && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Invoices (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {invoices.length === 0 && !loadingInvoices ? (
                  <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">
                      No approved pending invoices found.
                    </p>
                  </div>
                ) : isDesktop && invoices.length > 0 ? (
                  /* Desktop Table View */
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-center p-3 font-medium text-sm w-[60px]">Select</th>
                          <th className="text-left p-3 font-medium text-sm min-w-[150px]">Invoice #</th>
                          <th className="text-center p-3 font-medium text-sm w-[100px]">Status</th>
                          <th className="text-right p-3 font-medium text-sm w-[100px]">Total</th>
                          <th className="text-right p-3 font-medium text-sm w-[100px]">Paid</th>
                          <th className="text-right p-3 font-medium text-sm w-[100px]">Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => {
                          const isSelected = selectedInvoiceIds.has(invoice._id);

                          return (
                            <tr
                              key={invoice._id}
                              className={cn(
                                "border-b hover:bg-muted/50",
                                isSelected && "bg-blue-50 dark:bg-blue-950/20"
                              )}
                            >
                              <td className="p-3 text-center">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleInvoiceSelection(invoice._id)}
                                  className="mx-auto"
                                />
                              </td>
                              <td className="p-3 font-medium">{invoice.invoiceNumber}</td>
                              <td className="p-3 text-center">
                                <Badge variant="primary" appearance="outline">
                                  {invoice.paymentStatus}
                                </Badge>
                              </td>
                              <td className="p-3 text-right tabular-nums">
                                {formatCurrency(invoice.grandTotal)}
                              </td>
                              <td className="p-3 text-right tabular-nums text-green-600">
                                {formatCurrency(invoice.paidAmount)}
                              </td>
                              <td className="p-3 text-right tabular-nums font-semibold text-orange-600">
                                {formatCurrency(invoice.remainingAmount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : invoices.length > 0 ? (
                  /* Mobile Card View */
                  <div className="space-y-3">
                    {invoices.map((invoice) => {
                      const isSelected = selectedInvoiceIds.has(invoice._id);

                      return (
                        <Card
                          key={invoice._id}
                          className={cn(
                            "border-2 transition-colors",
                            isSelected && "border-blue-600 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20"
                          )}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`invoice-${invoice._id}`}
                                checked={isSelected}
                                onCheckedChange={() => toggleInvoiceSelection(invoice._id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <Label
                                  htmlFor={`invoice-${invoice._id}`}
                                  className="font-medium cursor-pointer"
                                >
                                  {invoice.invoiceNumber}
                                </Label>
                                <Badge variant="primary" appearance="outline" className="mt-1">
                                  {invoice.paymentStatus}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 pt-0">
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="space-y-1">
                                <div className="text-muted-foreground">Total</div>
                                <div className="font-medium">{formatCurrency(invoice.grandTotal)}</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground">Paid</div>
                                <div className="font-medium text-green-600">
                                  {formatCurrency(invoice.paidAmount)}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground">Remaining</div>
                                <div className="font-semibold text-orange-600">
                                  {formatCurrency(invoice.remainingAmount)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Show Purchases for Suppliers */}
          {showPurchases && selectedParty && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Purchases (Optional)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {purchases.length === 0 && !loadingPurchases ? (
                  <div className="flex items-center gap-2 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <p className="text-sm text-yellow-900 dark:text-yellow-100">No pending purchases found.</p>
                  </div>
                ) : isDesktop && purchases.length > 0 ? (
                  /* Desktop Table View */
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b">
                          <th className="text-center p-3 font-medium text-sm w-[60px]">Select</th>
                          <th className="text-left p-3 font-medium text-sm min-w-[150px]">Reference #</th>
                          <th className="text-center p-3 font-medium text-sm w-[100px]">Status</th>
                          <th className="text-right p-3 font-medium text-sm w-[100px]">Total</th>
                          <th className="text-right p-3 font-medium text-sm w-[100px]">Paid</th>
                          <th className="text-right p-3 font-medium text-sm w-[100px]">Remaining</th>
                        </tr>
                      </thead>
                      <tbody>
                        {purchases.map((purchase) => {
                          const displayTotal = purchase.grandTotal ?? purchase.totalAmount ?? 0;
                          const isSelected = selectedPurchaseIds.has(purchase._id);

                          return (
                            <tr
                              key={purchase._id}
                              className={cn(
                                "border-b hover:bg-muted/50",
                                isSelected && "bg-yellow-50 dark:bg-yellow-950/20"
                              )}
                            >
                              <td className="p-3 text-center">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => togglePurchaseSelection(purchase._id)}
                                  className="mx-auto"
                                />
                              </td>
                              <td className="p-3 font-mono font-medium">{purchase.referenceNumber}</td>
                              <td className="p-3 text-center">
                                <Badge variant="warning" appearance="outline">
                                  {purchase.paymentStatus}
                                </Badge>
                              </td>
                              <td className="p-3 text-right tabular-nums">
                                {formatCurrency(displayTotal)}
                              </td>
                              <td className="p-3 text-right tabular-nums text-green-600">
                                {formatCurrency(purchase.paidAmount)}
                              </td>
                              <td className="p-3 text-right tabular-nums font-semibold text-orange-600">
                                {formatCurrency(purchase.remainingAmount)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : purchases.length > 0 ? (
                  /* Mobile Card View */
                  <div className="space-y-3">
                    {purchases.map((purchase) => {
                      const displayTotal = purchase.grandTotal ?? purchase.totalAmount ?? 0;
                      const isSelected = selectedPurchaseIds.has(purchase._id);

                      return (
                        <Card
                          key={purchase._id}
                          className={cn(
                            "border-2 transition-colors",
                            isSelected && "border-yellow-600 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/20"
                          )}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id={`purchase-${purchase._id}`}
                                checked={isSelected}
                                onCheckedChange={() => togglePurchaseSelection(purchase._id)}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <Label
                                  htmlFor={`purchase-${purchase._id}`}
                                  className="font-mono font-medium cursor-pointer"
                                >
                                  {purchase.referenceNumber}
                                </Label>
                                <Badge variant="warning" appearance="outline" className="mt-1">
                                  {purchase.paymentStatus}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-2 pt-0">
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="space-y-1">
                                <div className="text-muted-foreground">Total</div>
                                <div className="font-medium">{formatCurrency(displayTotal)}</div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground">Paid</div>
                                <div className="font-medium text-green-600">
                                  {formatCurrency(purchase.paidAmount)}
                                </div>
                              </div>
                              <div className="space-y-1">
                                <div className="text-muted-foreground">Remaining</div>
                                <div className="font-semibold text-orange-600">
                                  {formatCurrency(purchase.remainingAmount)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )}

          {/* Discount */}
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

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="voucherAmount">Amount (incl. VAT) <span className="text-destructive">*</span></Label>
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

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add any relevant notes..."
              {...register("notes")}
              rows={3}
            />
          </div>

          {/* Summary Card */}
          {(hasLinkedDocuments || watch("voucherAmount") > 0) && (
            <Card className="bg-muted/50">
              <CardContent className="p-6">
                <div className="space-y-3">
                  {hasLinkedDocuments && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Selected Documents:</span>
                        <span className="font-medium">{totalSelectedItems}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Base Amount:</span>
                        <span className="font-medium">
                          {formatCurrency(
                            voucherType === 'receipt'
                              ? selectedInvoicesTotalAmount
                              : selectedPurchasesTotalAmount
                          )}
                        </span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Discount:</span>
                          <span className="font-medium text-destructive">
                            -{formatCurrency(discount)}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  <div
                    className={cn(
                      "flex justify-between pt-3",
                      showSummarySeparator && "border-t"
                    )}
                  >
                    <span className="font-semibold">Total Amount:</span>
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(watch("voucherAmount") || 0)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Spinner />
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