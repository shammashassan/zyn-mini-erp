// app/sales/debit-notes/CreateReceiptModal.tsx - FIXED: Proper Party Handling

"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Receipt, AlertCircle, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters/currency";
import type { DebitNote } from "./columns";
import { Spinner } from "@/components/ui/spinner";

interface CreateReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  debitNote: DebitNote;
  onRefresh: () => void;
}

const PAYMENT_METHODS = [
  'Cash',
  'Credit Card',
  'Debit Card',
  'Bank Transfer',
  'Digital Wallet',
  'Cheque'
];

export function CreateReceiptModal({
  isOpen,
  onClose,
  debitNote,
  onRefresh,
}: CreateReceiptModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [notes, setNotes] = useState("");

  const remainingAmount = debitNote.remainingAmount || (debitNote.grandTotal - debitNote.receivedAmount);
  const alreadyReceived = debitNote.receivedAmount || 0;

  const handleCreateReceipt = async () => {
    setIsLoading(true);

    try {
      // Determine payment amount
      const amount = isPartialPayment
        ? parseFloat(paymentAmount)
        : remainingAmount;

      // Validation
      if (!amount || amount <= 0) {
        toast.error("Please enter a valid payment amount");
        setIsLoading(false);
        return;
      }

      if (amount > remainingAmount) {
        toast.error(`Payment amount cannot exceed remaining amount (${formatCurrency(remainingAmount)})`);
        setIsLoading(false);
        return;
      }

      if (!paymentMethod) {
        toast.error("Please select a payment method");
        setIsLoading(false);
        return;
      }

      console.log(`Creating receipt voucher for debit note ${debitNote.debitNoteNumber} - ${formatCurrency(amount)} via ${paymentMethod}`);

      // Build receipt data with proper party information
      const receiptData: any = {
        voucherType: "receipt",
        paymentMethod: paymentMethod,
        items: [],
        notes: notes || `Receipt for debit note ${debitNote.debitNoteNumber} - ${formatCurrency(amount)} via ${paymentMethod}`,
        connectedDocuments: {
          debitNoteIds: [debitNote._id],
        },
        totalAmount: amount,
        grandTotal: amount,
      };

      // Add party information to receipt
      if (debitNote.supplierName) {
        receiptData.supplierName = debitNote.supplierName;
        if (debitNote.supplierId) receiptData.supplierId = debitNote.supplierId;
      } else if (debitNote.customerName) {
        receiptData.customerName = debitNote.customerName;
        if (debitNote.customerId) receiptData.customerId = debitNote.customerId;
      } else if (debitNote.payeeName) {
        receiptData.payeeName = debitNote.payeeName;
        if (debitNote.payeeId) receiptData.payeeId = debitNote.payeeId;
      } else if (debitNote.vendorName) {
        receiptData.vendorName = debitNote.vendorName;
      } else {
        // Fallback - this should not happen but just in case
        toast.error("Debit note is missing party information");
        setIsLoading(false);
        return;
      }

      // Create receipt voucher
      const receiptRes = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(receiptData),
      });

      const newReceiptData = await receiptRes.json();

      if (!receiptRes.ok) {
        console.error("Failed to create receipt:", newReceiptData);
        toast.error(newReceiptData.error || "Failed to create receipt voucher");
        setIsLoading(false);
        return;
      }

      console.log(`✅ Receipt voucher created: ${newReceiptData.voucher.invoiceNumber}`);

      toast.success(
        `Receipt Voucher ${newReceiptData.voucher.invoiceNumber} created!`,
        {
          action: {
            label: "View PDF",
            onClick: () =>
              window.open(
                `/api/vouchers/${newReceiptData.voucher._id}/pdf`,
                "_blank"
              ),
          },
        }
      );

      onClose();
      onRefresh();

      // Reset form
      setIsPartialPayment(false);
      setPaymentAmount("");
      setPaymentMethod("Bank Transfer");
      setNotes("");
    } catch (error) {
      console.error("Error creating receipt:", error);
      toast.error("An error occurred while creating receipt voucher");
    } finally {
      setIsLoading(false);
    }
  };

  // Determine party display name
  const partyName = debitNote.supplierName || debitNote.customerName || debitNote.payeeName || debitNote.vendorName || "N/A";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Create Receipt Voucher
          </DialogTitle>
          <DialogDescription>
            Record a receipt for this debit note
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Debit Note Summary */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Party:</span>
              <span className="text-sm font-medium">{partyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Amount:</span>
              <span className="text-sm font-medium">{formatCurrency(debitNote.grandTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Already Received:</span>
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(alreadyReceived)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="text-sm font-semibold">Remaining:</span>
              <span className="text-lg font-bold text-orange-600">
                {formatCurrency(remainingAmount)}
              </span>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="space-y-2">
            <Label htmlFor="payment-method" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Payment Method *
            </Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger id="payment-method">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Partial Payment Toggle */}
          <Label
            htmlFor="partial-payment"
            className={cn(
              "hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
              isPartialPayment && "border-blue-600 bg-blue-50 dark:border-blue-900 dark:bg-blue-950"
            )}
          >
            <div className="grid gap-1.5 font-normal flex-1">
              <p className="text-sm leading-none font-medium">
                Partial Payment
              </p>
              <p className="text-muted-foreground text-sm">
                Receive a portion of the remaining amount
              </p>
            </div>
            <Switch
              id="partial-payment"
              checked={isPartialPayment}
              onCheckedChange={(checked) => {
                setIsPartialPayment(checked);
                if (!checked) setPaymentAmount("");
              }}
              className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-700"
            />
          </Label>

          {/* Payment Amount Input */}
          {isPartialPayment && (
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment Amount (incl. VAT)</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={remainingAmount}
                placeholder={`Enter amount (max: ${formatCurrency(remainingAmount)})`}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className={cn(
                  "text-lg",
                  parseFloat(paymentAmount) > remainingAmount && "border-destructive"
                )}
              />
              <p className="text-xs text-muted-foreground">
                💡 Enter the total amount including VAT
              </p>
              {parseFloat(paymentAmount) > remainingAmount && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  Amount exceeds remaining balance
                </div>
              )}
            </div>
          )}

          {!isPartialPayment && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                Full payment of {formatCurrency(remainingAmount)} (incl. VAT) will be recorded via {paymentMethod}
              </p>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add payment notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreateReceipt} disabled={isLoading}>
            <Receipt className="h-4 w-4 mr-2" />
            {isLoading ? (
              <>
                <Spinner />
                Processing...
              </>
            ) : "Create Receipt Voucher"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}