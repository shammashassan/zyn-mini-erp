// app/procurement/expenses/CreatePaymentModal.tsx - FIXED: Use payeeName for manual vendors

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
import { IExpense } from "@/models/Expense";
import { Spinner } from "@/components/ui/spinner";

interface CreatePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: IExpense;
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
  expense,
  onRefresh,
}: CreatePaymentModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPartialPayment, setIsPartialPayment] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [notes, setNotes] = useState("");

  const displayTotal = expense.amount;
  const alreadyPaid = expense.paidAmount || 0;
  const remainingAmount = Math.max(0, displayTotal - alreadyPaid);

  const handleCreatePayment = async () => {
    setIsLoading(true);

    try {
      const amount = isPartialPayment
        ? parseFloat(paymentAmount)
        : remainingAmount;

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

      // ✅ FIXED: Party Mapping Logic
      let payload: any = {
        paymentMethod: paymentMethod,
        voucherType: "payment",
        items: [],
        discount: 0,
        notes: notes || `Payment for expense ${expense.referenceNumber} - ${formatCurrency(amount)} via ${paymentMethod}`,
        connectedDocuments: {
          expenseIds: [expense._id],
        },
        allocations: [{
          documentId: expense._id,
          documentType: 'expense',
          amount: amount
        }],
        totalAmount: amount,
        grandTotal: amount,
        skipAutoCreation: true,
      };

      const payee = expense.payeeId as any;
      const supplier = expense.supplierId as any;

      if (supplier && typeof supplier === 'object' && supplier.name) {
        // Case 1: Real Registered Supplier
        payload.supplierName = supplier.name;
        payload.supplierId = supplier._id;
      } else if (payee && typeof payee === 'object' && payee.name) {
        // Case 2: Registered Payee (Employee, etc.)
        payload.payeeName = payee.name;
        payload.payeeId = payee._id;
      } else if (expense.vendor) {
        // Case 3: Manual Vendor String
        // ✅ FIX: Use vendorName for manual entries
        payload.vendorName = expense.vendor;
      } else {
        // Case 4: Fallback
        payload.vendorName = "Unknown Vendor";
      }

      const paymentRes = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const newPaymentData = await paymentRes.json();

      if (!paymentRes.ok) {
        console.error("Failed to create payment:", newPaymentData);
        toast.error(newPaymentData.error || "Failed to create payment voucher");
        setIsLoading(false);
        return;
      }

      // Update expense with new payment
      const currentPaymentIds = expense.connectedDocuments?.paymentIds || [];
      const newPaidAmount = alreadyPaid + amount;

      const updateRes = await fetch(`/api/expenses/${expense._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectedDocuments: {
            paymentIds: [...currentPaymentIds, newPaymentData.voucher._id],
          },
          paidAmount: newPaidAmount,
          paymentStatus: (newPaidAmount >= displayTotal) ? 'Paid' : 'Partially Paid'
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

        setIsPartialPayment(false);
        setPaymentAmount("");
        setPaymentMethod("Bank Transfer");
        setNotes("");
      } else {
        toast.error("Payment created but failed to link to expense");
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
            Record a payment for this expense
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Vendor:</span>
              <span className="text-sm font-medium">{expense.vendor || "N/A"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Category:</span>
              <span className="text-sm font-medium">{expense.category}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Amount:</span>
              <span className="text-sm font-medium">{formatCurrency(expense.amount)}</span>
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

          {isPartialPayment && (
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment Amount</Label>
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
                Full payment of {formatCurrency(remainingAmount)} will be recorded via {paymentMethod}
              </p>
            </div>
          )}

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