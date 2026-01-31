// app/sales/quotations/CreateInvoiceModal.tsx - FINAL: No legacy fields

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FileText } from "lucide-react";
import type { Quotation } from "./columns";
import { Spinner } from "@/components/ui/spinner";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
  onRefresh: () => void;
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  quotation,
  onRefresh,
}: CreateInvoiceModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const handleCreateInvoice = async () => {
    setIsLoading(true);

    try {
      // Step 1: Check if invoice already exists
      const existingInvoiceIds = quotation.connectedDocuments?.invoiceIds;
      let existingInvoiceId = (Array.isArray(existingInvoiceIds) && existingInvoiceIds.length > 0)
        ? existingInvoiceIds[0]
        : undefined;

      let invoiceInTrash = false;
      let invoiceData = null;

      if (existingInvoiceId) {
        // Handle if existingInvoiceId is an object (populated)
        const existingId = typeof existingInvoiceId === 'object' ? (existingInvoiceId as any)._id : existingInvoiceId;

        console.log(`Checking for existing invoice: ${existingId}`);
        try {
          const invoiceCheck = await fetch(`/api/invoices/${existingId}`, {
            headers: { "X-Include-Deleted": "true" },
          });

          if (invoiceCheck.ok) {
            invoiceData = await invoiceCheck.json();

            if (invoiceData.isDeleted) {
              console.log(`Invoice ${existingId} found in trash, will restore`);
              invoiceInTrash = true;
              existingInvoiceId = existingId;
            } else {
              console.log(`Invoice ${existingId} already exists and is active`);
              toast.error("This quotation already has an active invoice");
              setIsLoading(false);
              return;
            }
          } else {
            console.log(`Invoice ${existingId} not found, will create new`);
            existingInvoiceId = undefined;
          }
        } catch (error) {
          console.error("Error checking invoice:", error);
          existingInvoiceId = undefined;
        }
      }

      // Step 2: Restore invoice from trash if it exists
      if (invoiceInTrash && existingInvoiceId) {
        console.log(`Restoring invoice ${existingInvoiceId} from trash`);

        const restoreRes = await fetch("/api/invoices/trash/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: existingInvoiceId }),
        });

        if (restoreRes.ok) {
          const restoredData = await restoreRes.json();

          toast.success(
            `Invoice ${restoredData.invoice.invoiceNumber} restored from trash!`,
            {
              action: {
                label: "View PDF",
                onClick: () =>
                  window.open(
                    `/api/invoices/${existingInvoiceId}/pdf`,
                    "_blank"
                  ),
              },
            }
          );

          onClose();
          onRefresh();
          setIsLoading(false);
          return;
        } else {
          const errorData = await restoreRes.json();
          console.error("Failed to restore invoice:", errorData);
          toast.error(
            errorData.error || "Failed to restore invoice from trash"
          );
          setIsLoading(false);
          return;
        }
      }

      // Step 3: Create new invoice from quotation
      console.log("Creating new invoice from quotation");

      // Generate notes - use custom notes if provided, otherwise auto-generate
      const invoiceNotes = notes.trim()
        ? notes
        : `Created from quotation ${quotation.invoiceNumber}`;

      const invoiceRes = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyId: quotation.partyId,
          contactId: quotation.contactId,
          status: "pending",
          items: quotation.items,
          discount: quotation.discount || 0,
          invoiceDate: new Date(),
          notes: invoiceNotes,
          connectedDocuments: {
            quotationId: quotation._id,
          },
        }),
      });

      const newInvoiceData = await invoiceRes.json();

      if (!invoiceRes.ok) {
        console.error("Failed to create invoice:", newInvoiceData);
        toast.error(newInvoiceData.error || "Failed to create invoice");
        setIsLoading(false);
        return;
      }

      console.log(`Invoice created successfully: ${newInvoiceData.invoice.invoiceNumber}`);

      // Step 4: Update quotation to link invoice
      const updateQuotationRes = await fetch(`/api/quotations/${quotation._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "connectedDocuments.invoiceIds": [newInvoiceData.invoice._id],
          status: "converted"
        }),
      });

      if (updateQuotationRes.ok) {
        toast.success(
          `Invoice ${newInvoiceData.invoice.invoiceNumber} created!`,
          {
            action: {
              label: "View PDF",
              onClick: () =>
                window.open(
                  `/api/invoices/${newInvoiceData.invoice._id}/pdf`,
                  "_blank"
                ),
            },
          }
        );
        onClose();
        onRefresh();
        setNotes("");
      } else {
        const updateError = await updateQuotationRes.json();
        console.error("Failed to update quotation:", updateError);
        toast.error("Invoice created but failed to link to quotation");
        onRefresh();
      }
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("An error occurred while creating invoice");
    } finally {
      setIsLoading(false);
    }
  };

  // Get display name from snapshot with fallback
  const customerName = quotation.partySnapshot?.displayName
    || quotation.partyId?.company
    || quotation.partyId?.name
    || 'Unknown Customer';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert Quotation to Invoice</DialogTitle>
          <DialogDescription>
            Convert quotation {quotation.invoiceNumber} into an invoice
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground mb-1 block">Customer</Label>
              <div className="text-sm font-medium">{customerName}</div>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Quotation:</span>
              <span className="text-sm font-medium">{quotation.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Items:</span>
              <span className="text-sm font-medium">{quotation.items.length} item(s)</span>
            </div>
            {quotation.discount > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Discount:</span>
                <span className="text-sm font-medium text-destructive">
                  {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(quotation.discount)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <span className="text-sm font-semibold">Amount:</span>
              <span className="text-lg font-bold text-green-600">
                {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED' }).format(quotation.grandTotal)}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            This will create a new invoice with the same items and discount from this quotation. The invoice will be automatically linked to this quotation and set to "pending" status.
          </p>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            placeholder={`Add invoice notes...`}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            💡 If left empty, a default note will be generated automatically
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreateInvoice} disabled={isLoading}>
            <FileText className="h-4 w-4 mr-2" />
            {isLoading ? (
              <>
                <Spinner />
                Processing...
              </>
            ) : "Convert to Invoice"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}