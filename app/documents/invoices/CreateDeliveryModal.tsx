// app/invoices/CreateDeliveryModal.tsx - UPDATED: Uses new DeliveryNote and Invoice routes

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
import { toast } from "sonner";
import { Truck } from "lucide-react";
import type { Invoice } from "./columns";
import { Spinner } from "@/components/ui/spinner";

interface CreateDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onRefresh: () => void;
}

export function CreateDeliveryModal({
  isOpen,
  onClose,
  invoice,
  onRefresh,
}: CreateDeliveryModalProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateDelivery = async () => {
    setIsLoading(true);

    try {
      let existingDeliveryId = invoice.connectedDocuments?.deliveryId;
      let deliveryInTrash = false;
      let deliveryData = null;

      // Step 1: Check if delivery note exists (even in trash)
      if (existingDeliveryId) {
        console.log(`Checking for existing delivery: ${existingDeliveryId}`);
        try {
          // ✅ NEW: Check using /api/delivery-notes
          const deliveryCheck = await fetch(`/api/delivery-notes/${existingDeliveryId}`, {
            headers: { "X-Include-Deleted": "true" },
          });

          if (deliveryCheck.ok) {
            deliveryData = await deliveryCheck.json();

            if (deliveryData.isDeleted) {
              console.log(`Delivery ${existingDeliveryId} found in trash, will restore`);
              deliveryInTrash = true;
            } else {
              console.log(`Delivery ${existingDeliveryId} already exists and is active`);
              toast.error("This invoice already has an active delivery note");
              setIsLoading(false);
              return;
            }
          } else {
            console.log(`Delivery ${existingDeliveryId} not found, will create new`);
            existingDeliveryId = undefined;
          }
        } catch (error) {
          console.error("Error checking delivery:", error);
          existingDeliveryId = undefined;
        }
      }

      // Step 2: Restore delivery from trash if it exists
      if (deliveryInTrash && existingDeliveryId) {
        console.log(`Restoring delivery ${existingDeliveryId} from trash`);

        // ✅ NEW: Restore using /api/delivery-notes/trash/restore
        const restoreRes = await fetch("/api/delivery-notes/trash/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: existingDeliveryId }),
        });

        if (restoreRes.ok) {
          const restoredData = await restoreRes.json();

          // ✅ NEW: Update invoice to relink delivery using /api/invoices
          await fetch(`/api/invoices/${invoice._id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              "connectedDocuments.deliveryId": existingDeliveryId,
            }),
          });

          toast.success(
            `Delivery Note ${restoredData.deliveryNote.invoiceNumber} restored from trash!`,
            {
              action: {
                label: "View PDF",
                onClick: () =>
                  window.open(
                    `/api/delivery-notes/${existingDeliveryId}/pdf`,
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
          console.error("Failed to restore delivery:", errorData);
          toast.error(
            errorData.error || "Failed to restore delivery note from trash"
          );
          setIsLoading(false);
          return;
        }
      }

      // Step 3: Create new delivery note if none exists
      console.log("Creating new delivery note from invoice");

      // ✅ NEW: Create delivery note using /api/delivery-notes
      const deliveryRes = await fetch("/api/delivery-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: invoice.customerName,
          customerPhone: invoice.customerPhone,
          customerEmail: invoice.customerEmail,
          status: "pending",
          items: invoice.items,
          discount: 0,
          notes: `Delivery note for invoice ${invoice.invoiceNumber}`,
          connectedDocuments: {
            invoiceIds: [invoice._id], // Use array for invoiceIds
          },
        }),
      });

      const newDeliveryData = await deliveryRes.json();

      if (!deliveryRes.ok) {
        console.error("Failed to create delivery:", newDeliveryData);
        toast.error(newDeliveryData.error || "Failed to create delivery note");
        setIsLoading(false);
        return;
      }

      console.log(`Delivery note created successfully: ${newDeliveryData.deliveryNote.invoiceNumber}`);

      // Step 4: Update invoice to link delivery note
      // ✅ NEW: Update invoice using /api/invoices
      const updateInvoiceRes = await fetch(`/api/invoices/${invoice._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          "connectedDocuments.deliveryId": newDeliveryData.deliveryNote._id,
        }),
      });

      if (updateInvoiceRes.ok) {
        toast.success(
          `Delivery Note ${newDeliveryData.deliveryNote.invoiceNumber} created!`,
          {
            action: {
              label: "View PDF",
              onClick: () =>
                window.open(
                  `/api/delivery-notes/${newDeliveryData.deliveryNote._id}/pdf`,
                  "_blank"
                ),
            },
          }
        );
        onClose();
        onRefresh();
      } else {
        const updateError = await updateInvoiceRes.json();
        console.error("Failed to update invoice:", updateError);
        toast.error("Delivery note created but failed to link to invoice");
        onRefresh();
      }
    } catch (error) {
      console.error("Error creating delivery:", error);
      toast.error("An error occurred while creating delivery note");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Delivery Note</DialogTitle>
          <DialogDescription>
            Create a delivery note for invoice {invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Customer:</span>
              <span className="text-sm font-medium">{invoice.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Invoice:</span>
              <span className="text-sm font-medium">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Items:</span>
              <span className="text-sm font-medium">{invoice.items.length} item(s)</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            This will create a delivery note with the same items for shipment tracking.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleCreateDelivery} disabled={isLoading}>
            <Truck className="h-4 w-4 mr-2" />
            {isLoading ? (
              <>
                <Spinner />
                Processing...
              </>
            ) : "Create Delivery Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}