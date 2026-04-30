// app/sales/delivery-notes/StatusUpdateModal.tsx - UPDATED: Uses /api/delivery-notes

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { DeliveryNote } from "./columns";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/utils/formatters/currency";
import { Clock, Truck, CheckCircle, XCircle } from "lucide-react";

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryNote: DeliveryNote;
  onRefresh: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'delivered': return 'success';
    case 'dispatched': return 'primary';
    case 'cancelled': return 'destructive';
    case 'pending': return 'warning';
    default: return 'gray';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return Clock;
    case 'dispatched': return Truck;
    case 'delivered': return CheckCircle;
    case 'cancelled': return XCircle;
    default: return Clock;
  }
};

export function StatusUpdateModal({ isOpen, onClose, deliveryNote, onRefresh }: StatusUpdateModalProps) {
  const [initialStatus, setInitialStatus] = useState(deliveryNote.status);
  const [newStatus, setNewStatus] = useState(deliveryNote.status);
  const [isLoading, setIsLoading] = useState(false);

  const availableStatuses: DeliveryNote['status'][] = ['pending', 'dispatched', 'delivered', 'cancelled'];

  useEffect(() => {
    if (isOpen) {
      setInitialStatus(deliveryNote.status);
      setNewStatus(deliveryNote.status);
    }
  }, [isOpen, deliveryNote.status]);

  const isUpdateDisabled = () => {
    if (isLoading) return true;
    if (newStatus === initialStatus) return true;
    return false;
  };

  const handleUpdateStatus = async () => {
    setIsLoading(true);
    try {
      await updateDeliveryNoteStatus(newStatus);
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('An error occurred while updating status');
    } finally {
      setIsLoading(false);
    }
  };

  const updateDeliveryNoteStatus = async (status: string) => {
    const updateData: any = { status };

    // ✅ UPDATED: Use specific endpoint
    const res = await fetch(`/api/delivery-notes/${deliveryNote._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
    });

    if (res.ok) {
      toast.success(`Status updated to ${status}`);
      onClose();
      onRefresh();
    } else {
      const error = await res.json();
      toast.error(error.error || 'Failed to update status');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Delivery Status</DialogTitle>
          <DialogDescription>
            Change the status for {deliveryNote.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3 bg-muted/50 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Delivery No:</span>
              <span className="font-medium font-mono">{deliveryNote.invoiceNumber}</span>
            </div>
            {deliveryNote.partySnapshot?.displayName || deliveryNote.partyId?.name || deliveryNote.partyId?.company ? (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Party:</span>
                <span className="font-medium">
                  {deliveryNote.partySnapshot?.displayName || deliveryNote.partyId?.name || deliveryNote.partyId?.company}
                </span>
              </div>
            ) : null}
            {deliveryNote.contactSnapshot?.name ? (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Contact:</span>
                <span className="font-medium">
                  {deliveryNote.contactSnapshot.name}
                  {deliveryNote.contactSnapshot.designation ? (
                    <span className="text-muted-foreground font-normal"> ({deliveryNote.contactSnapshot.designation})</span>
                  ) : null}
                </span>
              </div>
            ) : null}
            {deliveryNote.grandTotal ? (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium text-green-600">{formatCurrency(deliveryNote.grandTotal)}</span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 grid-cols-2">
            {availableStatuses.map((status) => {
              const StatusIcon = getStatusIcon(status);
              return (
                <Button
                  key={status}
                  variant={newStatus === status ? 'default' : 'outline'}
                  onClick={() => setNewStatus(status)}
                  className="capitalize flex items-center gap-1"
                >
                  <StatusIcon className="h-3 w-3" />
                  {status}
                </Button>
              );
            })}
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">Current:</span>
              <Badge
                variant={getStatusColor(deliveryNote.status)}
                className="ml-2 capitalize"
                appearance="outline"
              >
                {deliveryNote.status}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">New:</span>
              <Badge
                variant={getStatusColor(newStatus)}
                className="ml-2 capitalize"
                appearance="outline"
              >
                {newStatus}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateStatus}
            disabled={isUpdateDisabled()}
          >
            {isLoading ? (
              <>
                <Spinner />
                Updating...
              </>
            ) : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}