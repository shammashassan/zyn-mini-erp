// app/sales/invoices/CreateDeliveryModal.tsx - UPDATED: Enhanced Responsive Items UI

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
import { Truck, Package } from "lucide-react";
import type { Invoice } from "./columns";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/utils/formatters/currency";
import { Card, CardContent } from "@/components/ui/card";

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
  const [notes, setNotes] = useState("");

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

        const restoreRes = await fetch("/api/delivery-notes/trash/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: existingDeliveryId }),
        });

        if (restoreRes.ok) {
          const restoredData = await restoreRes.json();

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

      // Generate notes - use custom notes if provided, otherwise auto-generate
      const deliveryNotes = notes.trim() 
        ? notes 
        : `Delivery note for invoice ${invoice.invoiceNumber}`;

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
          notes: deliveryNotes,
          deliveryDate: new Date().toISOString(),
          connectedDocuments: {
            invoiceId: invoice._id,
          },
        }),
      });

      if (!deliveryRes.ok) {
        const errorText = await deliveryRes.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText || "Failed to create delivery note" };
        }
        console.error("Failed to create delivery:", errorData);
        toast.error(errorData.error || "Failed to create delivery note");
        setIsLoading(false);
        return;
      }

      const newDeliveryData = await deliveryRes.json();

      console.log(`Delivery note created successfully: ${newDeliveryData.deliveryNote.invoiceNumber}`);

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
      
      // Reset form
      setNotes("");
    } catch (error) {
      console.error("Error creating delivery:", error);
      toast.error("An error occurred while creating delivery note");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-2xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Create Delivery Note
          </DialogTitle>
          <DialogDescription>
            Create a delivery note for shipment tracking
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invoice Summary */}
          <div className="rounded-lg border p-4 space-y-2 bg-muted/50">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Customer:</span>
              <span className="text-sm font-medium">{invoice.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Invoice:</span>
              <span className="text-sm font-medium font-mono">{invoice.invoiceNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Items:</span>
              <span className="text-sm font-medium">{invoice.items.length} item(s)</span>
            </div>
            {/* Total Amount with muted note */}
            <div className="pt-2 border-t">
              <div className="flex justify-between">
                <span className="text- font-semibold">Total Amount:</span>
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(invoice.grandTotal)}
                </span>
              </div>
              <p className="text-right text-xs text-muted-foreground mt-1">
                (includes discounts + vat)
              </p>
            </div>
          </div>

          {/* Items to Ship */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Items to Ship
            </Label>
            
            {/* Desktop View (Table) */}
            <div className="hidden md:block overflow-x-auto rounded-md border bg-background">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium text-sm">#</th>
                    <th className="text-left p-3 font-medium text-sm">Description</th>
                    <th className="text-right p-3 font-medium text-sm">Quantity</th>
                    <th className="text-right p-3 font-medium text-sm">Rate</th>
                    <th className="text-right p-3 font-medium text-sm">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items.map((item, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50 last:border-0">
                      <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                      <td className="p-3">
                        <div className="font-medium text-sm">{item.description}</div>
                      </td>
                      <td className="p-3 text-right font-medium text-sm">
                        {item.quantity.toFixed(2)}
                      </td>
                      <td className="p-3 text-right text-muted-foreground text-sm">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="p-3 text-right font-semibold text-sm">
                        {formatCurrency(item.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View (Cards) */}
            <div className="md:hidden space-y-2 max-h-[300px] overflow-y-auto sidebar-scroll">
              {invoice.items.map((item, index) => (
                <Card key={index} className="border">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-muted-foreground mb-1">Item #{index + 1}</div>
                        <div className="font-medium text-sm break-words">{item.description}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2 border-t text-sm">
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Quantity</div>
                        <div className="font-medium">{item.quantity.toFixed(2)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground mb-0.5">Rate</div>
                        <div className="font-medium">{formatCurrency(item.rate)}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Total</span>
                        <span className="font-bold text-sm">
                          {formatCurrency(item.total)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder={`Add delivery notes... (Default: "Delivery note for invoice ${invoice.invoiceNumber}")`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              💡 If left empty, a default note will be generated automatically
            </p>
          </div>

          {/* Info Message */}
          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
              This will create a delivery note with {invoice.items.length} item(s) for shipment tracking
            </p>
          </div>
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
                Creating...
              </>
            ) : "Create Delivery Note"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}