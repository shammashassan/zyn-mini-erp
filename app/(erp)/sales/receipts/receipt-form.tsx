// app/sales/receipts/receipt-form.tsx

"use client";

import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
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
    Wallet,
    AlertCircle,
    Users,
    User,
    Building2,
    Store,
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
import { PartyContactSelector } from "@/components/shared/PartyContactSelector";
import { formatCurrency } from "@/utils/formatters/currency";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface ConnectedInvoice {
    _id: string;
    invoiceNumber: string;
    grandTotal: number;
    status: string;
    paymentStatus: 'Paid' | 'Pending' | 'Partially Paid';
    paidAmount: number;
    remainingAmount: number;
}

type PartyType = 'customer' | 'supplier' | 'payee' | 'vendor';

type ReceiptFormData = {
    partyType: PartyType;
    paymentMethod: string;
    receiptAmount: number;
    discount: number;
    notes: string;
    receiptDate: Date;
};

interface ReceiptFormProps {
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

export function ReceiptForm({ isOpen, onClose, onSubmit }: ReceiptFormProps) {
    const { register, handleSubmit, watch, setValue, control, formState: { isSubmitting } } = useForm<ReceiptFormData>({
        defaultValues: {
            partyType: 'customer',
            paymentMethod: 'Cash',
            receiptAmount: 0,
            discount: 0,
            notes: "",
            receiptDate: new Date(),
        }
    });


    const [invoices, setInvoices] = useState<ConnectedInvoice[]>([]);
    const [selectedPartyId, setSelectedPartyId] = useState("");
    const [selectedContactId, setSelectedContactId] = useState<string | undefined>(undefined);
    const [selectedParty, setSelectedParty] = useState("");
    const [loadingInvoices, setLoadingInvoices] = useState(false);
    const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<Set<string>>(new Set());
    const [datePopoverOpen, setDatePopoverOpen] = useState(false);
    const [isDesktop, setIsDesktop] = useState(true);

    const partyType = watch("partyType");
    const paymentMethod = watch("paymentMethod");
    const discount = watch("discount") || 0;

    const hasLinkedDocuments = selectedInvoiceIds.size > 0;

    useEffect(() => {
        const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024);
        checkIsDesktop();
        window.addEventListener("resize", checkIsDesktop);
        return () => window.removeEventListener("resize", checkIsDesktop);
    }, []);

    // Fetch invoices for customers
    useEffect(() => {
        if (partyType !== 'customer' || !selectedParty || !isOpen) return;

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
    }, [partyType, selectedParty, isOpen]);

    // Reset form when modal opens
    useEffect(() => {
        if (isOpen) {
            setValue("partyType", 'customer');
            setValue("paymentMethod", 'Cash');
            setValue("receiptAmount", 0);
            setValue("discount", 0);
            setValue("notes", "");
            setValue("receiptDate", new Date());
            setSelectedParty("");
            setSelectedPartyId("");
            setSelectedContactId(undefined);
            setSelectedInvoiceIds(new Set());
            setInvoices([]);
        }
    }, [isOpen, setValue]);

    const toggleInvoiceSelection = (invoiceId: string) => {
        const newSet = new Set(selectedInvoiceIds);
        if (newSet.has(invoiceId)) {
            newSet.delete(invoiceId);
        } else {
            newSet.add(invoiceId);
        }
        setSelectedInvoiceIds(newSet);
    };

    const selectedInvoicesTotalAmount = invoices
        .filter(inv => selectedInvoiceIds.has(inv._id))
        .reduce((sum, inv) => {
            return sum + (inv.remainingAmount || 0);
        }, 0);

    useEffect(() => {
        if (hasLinkedDocuments) {
            const finalAmount = Math.max(0, selectedInvoicesTotalAmount - discount);
            setValue("receiptAmount", finalAmount);
        }
    }, [hasLinkedDocuments, selectedInvoicesTotalAmount, discount, setValue]);

    const handleFormSubmit = async (data: ReceiptFormData) => {
        if (!paymentMethod) {
            toast.error("Please select a payment method");
            return;
        }

        if (data.receiptAmount <= 0) {
            toast.error("Please enter a valid amount");
            return;
        }

        if (!data.receiptDate) {
            toast.error("Please select a receipt date");
            return;
        }

        // Validate party selection
        if (!selectedParty && !selectedPartyId) {
            toast.error("Please select a party");
            return;
        }

        let selectedDocuments: any = {};

        if (selectedInvoiceIds.size > 0) {
            selectedDocuments = { invoiceIds: Array.from(selectedInvoiceIds) };
        }

        const submitData: any = {
            voucherType: 'receipt',
            paymentMethod: paymentMethod,
            items: [],
            discount: discount,
            notes: data.notes,
            totalAmount: data.receiptAmount,
            grandTotal: data.receiptAmount,
            voucherDate: data.receiptDate,
            connectedDocuments: selectedDocuments,
            partyId: (partyType === 'customer' || partyType === 'supplier') ? selectedPartyId : undefined,
            payeeId: partyType === 'payee' ? selectedPartyId : undefined,
            contactId: selectedContactId,
        };

        // Party name will be set based on partyType from PartyContactSelector
        if (selectedParty) {
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
                    submitData.vendorName = selectedParty;
                    break;
            }
        }

        await onSubmit(submitData);
    };



    const showInvoices = partyType === 'customer';
    const totalSelectedItems = selectedInvoiceIds.size;
    const showSummarySeparator = selectedInvoiceIds.size > 0 && hasLinkedDocuments && discount > 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5" />
                        Create Receipt
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                    {/* Top Row: Party Selection, Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Party Selection */}
                        <div>
                            <PartyContactSelector
                                allowedRoles={['customer', 'supplier', 'payee', 'vendor']}
                                value={{
                                    partyId: selectedPartyId,
                                    contactId: selectedContactId,
                                    partyType: partyType,
                                    partyName: selectedParty
                                }}
                                onChange={(val, party) => {
                                    const isPartyChange = val.partyId !== selectedPartyId;
                                    setSelectedPartyId(val.partyId ?? "");
                                    setSelectedContactId(val.contactId);

                                    // Update partyType from component
                                    if (val.partyType) {
                                        setValue('partyType', val.partyType);
                                    }

                                    // Set party name (from API or manual input)
                                    if (val.partyName !== undefined) {
                                        setSelectedParty(val.partyName);
                                    } else if (party) {
                                        setSelectedParty(party.company || party.name || "");
                                    }

                                    // Reset linked invoices when party changes
                                    if (isPartyChange) {
                                        setSelectedInvoiceIds(new Set());
                                    }
                                }}
                                showCreateButton={true}
                                layout="vertical"
                                className="w-full"
                            />
                        </div>

                        {/* Receipt Date */}
                        <div className="space-y-2">
                            <Label>Receipt Date <span className="text-destructive">*</span></Label>
                            <Controller
                                name="receiptDate"
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
                        <Label htmlFor="receiptAmount">Amount (incl. VAT) <span className="text-destructive">*</span></Label>
                        <Input
                            id="receiptAmount"
                            type="number"
                            step="0.01"
                            disabled={hasLinkedDocuments}
                            className={hasLinkedDocuments ? "bg-muted" : ""}
                            placeholder="0.00"
                            {...register("receiptAmount", { valueAsNumber: true })}
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
                    {(hasLinkedDocuments || watch("receiptAmount") > 0) && (
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
                                                    {formatCurrency(selectedInvoicesTotalAmount)}
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
                                            {formatCurrency(watch("receiptAmount") || 0)}
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
                            ) : "Create Receipt"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}