// app/procurement/purchases/CreatePaymentModal.tsx - FINAL: Using party snapshots for display

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
import { Wallet, AlertCircle, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters/currency";
import { Spinner } from "@/components/ui/spinner";

interface Purchase {
  _id: string;
  referenceNumber: string;
  partySnapshot: {
    displayName: string;
  };
  contactSnapshot?: {
    name: string;
    phone?: string;
    email?: string;
    designation?: string;
  };
  totalAmount: number;
  isTaxPayable?: boolean;
  vatAmount?: number;
  grandTotal?: number;
  paidAmount: number;
  remainingAmount: number;
  items: Array<{
    materialId: string;
    materialName: string;
    quantity: number;
    unitCost: number;
    total: number;
  }>;
  connectedDocuments?: {
    paymentIds?: string[];
    returnNoteIds?: string[];
  };
}

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase;
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

export function CreatePaymentModal({
  isOpen,
  onClose,
  purchase,
  onRefresh,
}: CreatePaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [notes, setNotes] = useState("");

  // Calculate grand total (backwards compatible)
  const displayTotal = purchase.grandTotal || (purchase.totalAmount + (purchase.vatAmount || 0));
  const remainingAmount = purchase.remainingAmount || (displayTotal - purchase.paidAmount);
  const alreadyPaid = purchase.paidAmount || 0;

  // ✅ Use snapshot for display
  const displayName = purchase.partySnapshot?.displayName || 'Unknown Supplier';

  const handleCreatePayment = async () => {
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

      console.log(`Creating NEW payment voucher for ${formatCurrency(amount)} via ${paymentMethod}`);

      // Get partyId from purchase (may need to fetch if not available)
      const partyId = (purchase as any).partyId;
      const contactId = (purchase as any).contactId;

      // Generate notes - use custom notes if provided, otherwise auto-generate
      const paymentNotes = notes.trim()
        ? notes
        : `Payment for purchase ${purchase.referenceNumber || ''} - ${formatCurrency(amount)} via ${paymentMethod}`;

      // Create new payment voucher using /api/vouchers
      const paymentRes = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyId: partyId,
          contactId: contactId,
          paymentMethod: paymentMethod,
          voucherType: "payment",
          items: [],
          discount: 0,
          notes: paymentNotes,
          connectedDocuments: {
            purchaseIds: [purchase._id],
          },
          totalAmount: amount,
          grandTotal: amount,
        }),
      });

      const newPaymentData = await paymentRes.json();

      if (!paymentRes.ok) {
        console.error("Failed to create payment:", newPaymentData);
        toast.error(newPaymentData.error || "Failed to create payment voucher");
        setIsLoading(false);
        return;
      }

      console.log(`✅ Payment voucher created: ${newPaymentData.voucher.invoiceNumber}`);

      // ✅ Preserve existing returnNoteIds when updating
      const currentPaymentIds = purchase.connectedDocuments?.paymentIds || [];
      const currentReturnNoteIds = purchase.connectedDocuments?.returnNoteIds || [];
      const newPaidAmount = alreadyPaid + amount;

      // Update purchase with new payment, preserving return notes
      const updateRes = await fetch(`/api/purchases/${purchase._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectedDocuments: {
            paymentIds: [...currentPaymentIds, newPaymentData.voucher._id],
            returnNoteIds: currentReturnNoteIds,
          },
          paidAmount: newPaidAmount,
          remainingAmount: displayTotal - newPaidAmount,
          paymentStatus: (newPaidAmount >= displayTotal) ? 'paid' : 'partially paid'
        }),
      });

      if (updateRes.ok) {
        toast.success(
          `Payment Voucher ${newPaymentData.voucher.invoiceNumber} created!`,
          {
            action: {
              label: "View PDF",
              onClick: () =>
                window.open(
                  `/api/vouchers/${newPaymentData.voucher._id}/pdf?type=payment`,
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
      } else {
        const updateError = await updateRes.json();
        console.error("Failed to update purchase:", updateError);
        toast.error("Payment created but failed to link to purchase");
        onRefresh();
      }
    } catch (error) {
      console.error("Error creating payment:", error);
      toast.error("An error occurred while creating payment voucher");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Create Payment Voucher
          </DialogTitle>
          <DialogDescription>
            Record a payment for this purchase
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Purchase Summary */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Supplier:</span>
              <span className="text-sm font-medium">{displayName}</span>
            </div>
            {purchase.contactSnapshot?.name && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Contact:</span>
                <span className="text-sm font-medium">
                  {purchase.contactSnapshot.name}
                  {purchase.contactSnapshot.designation && (
                    <span className="text-muted-foreground font-normal"> ({purchase.contactSnapshot.designation})</span>
                  )}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Amount:</span>
              <span className="text-sm font-medium">{formatCurrency(displayTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Already Paid:</span>
              <span className="text-sm font-medium text-green-600">
                {formatCurrency(alreadyPaid)}
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
                Pay a portion of the remaining amount
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
          <Button onClick={handleCreatePayment} disabled={isLoading}>
            <Wallet className="h-4 w-4 mr-2" />
            {isLoading ? (
              <>
                <Spinner />
                Processing...
              </>
            ) : "Create Payment Voucher"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}