// app/invoices/StatusUpdateModal.tsx - NO AUTO-RECEIPT CREATION

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
import type { Invoice } from "./columns";
import { Spinner } from "@/components/ui/spinner";

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onRefresh: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'success';
    case 'cancelled': return 'destructive';
    case 'pending': return 'warning';
    default: return 'gray';
  }
};

export function StatusUpdateModal({ isOpen, onClose, invoice, onRefresh }: StatusUpdateModalProps) {
  const [initialStatus, setInitialStatus] = useState(invoice.status);
  const [newStatus, setNewStatus] = useState(invoice.status);
  const [isLoading, setIsLoading] = useState(false);

  const availableStatuses: Invoice['status'][] = ['pending', 'approved', 'cancelled'];

  useEffect(() => {
    if (isOpen) {
      setInitialStatus(invoice.status);
      setNewStatus(invoice.status);
    }
  }, [isOpen, invoice.status]);

  const isUpdateDisabled = () => {
    if (isLoading) return true;
    if (newStatus === initialStatus) return true;
    return false;
  };

  const handleUpdateStatus = async () => {
    setIsLoading(true);
    try {
      await updateInvoiceStatus(newStatus);
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('An error occurred while updating status');
    } finally {
      setIsLoading(false);
    }
  };

  const updateInvoiceStatus = async (status: string) => {
    const updateData: any = { status };

    const res = await fetch(`/api/invoices/${invoice._id}`, {
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
          <DialogTitle>Update Invoice Status</DialogTitle>
          <DialogDescription>
            Change the status for {invoice.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-2 grid-cols-3">
            {availableStatuses.map((status) => (
              <Button
                key={status}
                variant={newStatus === status ? 'default' : 'outline'}
                onClick={() => setNewStatus(status)}
                className="capitalize"
              >
                {status}
              </Button>
            ))}
          </div>

          <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">Current:</span>
              <Badge
                variant={getStatusColor(invoice.status)}
                className="ml-2 capitalize"
                appearance="outline"
              >
                {invoice.status}
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

          {newStatus === 'approved' && invoice.status !== 'approved' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg text-sm text-blue-900 dark:text-blue-100">
              💡 Use the Receipt button to create receipt vouchers for payments
            </div>
          )}
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