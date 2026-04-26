"use client";

import React, { useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/utils/formatters/currency";
import { Undo2 } from "lucide-react";
import type { POSSale } from "./columns";

interface POSReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: POSSale | null;
  onSuccess: () => void;
}

export function POSReturnModal({ isOpen, onClose, sale, onSuccess }: POSReturnModalProps) {
  const [returnItems, setReturnItems] = useState<Record<number, number>>({});
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize returnItems state when sale changes
  React.useEffect(() => {
    if (sale) {
      const initial: Record<number, number> = {};
      sale.items.forEach((item, index) => {
        initial[index] = 0;
      });
      setReturnItems(initial);
      setReason("");
    }
  }, [sale]);

  if (!sale) return null;

  const handleQtyChange = (index: number, val: string) => {
    const num = parseInt(val) || 0;
    const item = sale.items[index];
    const maxQty = item.quantity - (item.returnedQuantity || 0);
    setReturnItems(prev => ({
      ...prev,
      [index]: Math.min(Math.max(0, num), maxQty)
    }));
  };

  const totalReturnAmount = sale.items.reduce((sum, item, index) => {
    return sum + (item.rate * (returnItems[index] || 0));
  }, 0);

  const hasItemsToReturn = Object.values(returnItems).some(q => q > 0);

  const handleSubmit = async () => {
    if (!hasItemsToReturn) {
      toast.error("Please select at least one item to return.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Return reason is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const returnPayloadItems = sale.items.map((item, index) => ({
        itemId: item.itemId,
        description: item.description,
        returnQuantity: returnItems[index] || 0,
        rate: item.rate,
        total: item.rate * (returnItems[index] || 0)
      })).filter(i => i.returnQuantity > 0);

      // Simplified VAT logic: proportion of VAT
      const discountRatio = sale.discount / sale.totalAmount || 0;
      const subtotalBeforeDiscount = returnPayloadItems.reduce((sum, item) => sum + item.total, 0);
      const discount = subtotalBeforeDiscount * discountRatio;
      const subtotal = subtotalBeforeDiscount - discount;
      
      const vatRatio = sale.vatAmount / (sale.totalAmount - sale.discount) || 0;
      const vatAmount = subtotal * vatRatio;
      const grandTotal = subtotal + vatAmount;

      const payload = {
        returnType: "posReturn",
        posSaleId: sale._id,
        partyId: sale.partyId,
        paymentMethod: sale.paymentMethod, // Inherit payment method to refund via same medium
        items: returnPayloadItems,
        reason,
        totalAmount: subtotalBeforeDiscount,
        discount,
        vatAmount,
        grandTotal,
        // cogsAmount could be calculated if we know cost prices, but backend will need to handle it or we ignore for now
      };

      const res = await fetch("/api/return-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to process POS return");
      }

      toast.success("POS Return processed successfully");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="size-5" />
            Return Items: {sale.saleNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr>
                  <th className="p-2 text-left font-medium">Item</th>
                  <th className="p-2 text-center font-medium">Available</th>
                  <th className="p-2 text-center font-medium w-24">Return Qty</th>
                  <th className="p-2 text-right font-medium">Refund Total</th>
                </tr>
              </thead>
              <tbody>
                {sale.items.map((item, i) => {
                  const available = item.quantity - (item.returnedQuantity || 0);
                  const returnQty = returnItems[i] || 0;
                  const refundAmount = returnQty * item.rate;
                  return (
                    <tr key={i} className="border-t">
                      <td className="p-2">{item.description}</td>
                      <td className="p-2 text-center">{available}</td>
                      <td className="p-2">
                        <Input 
                          type="number" 
                          min={0} 
                          max={available}
                          value={returnItems[i]?.toString() || "0"}
                          onChange={(e) => handleQtyChange(i, e.target.value)}
                          disabled={available === 0}
                          className="h-8 text-center"
                        />
                      </td>
                      <td className="p-2 text-right font-medium">
                        {formatCurrency(refundAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center px-2 font-medium">
            <span>Estimated Refund Value (Gross):</span>
            <span className="text-destructive">{formatCurrency(totalReturnAmount)}</span>
          </div>

          <div className="space-y-2">
            <Label>Return Reason <span className="text-destructive">*</span></Label>
            <Textarea 
              placeholder="E.g. Defective item, customer changed mind..." 
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isSubmitting || !hasItemsToReturn || !reason.trim()}>
            {isSubmitting ? "Processing..." : "Process Return"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
