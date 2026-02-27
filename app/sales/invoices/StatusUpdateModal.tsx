// app/sales/invoices/StatusUpdateModal.tsx - NO AUTO-RECEIPT CREATION

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
import { formatCurrency } from "@/utils/formatters/currency";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return Clock;
    case 'approved': return CheckCircle;
    case 'cancelled': return XCircle;
    default: return Clock;
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
          <div className="rounded-lg border p-3 bg-muted/50 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Invoice No:</span>
              <span className="font-medium font-mono">{invoice.invoiceNumber}</span>
            </div>
            {invoice.partySnapshot?.displayName || invoice.partyId?.name || invoice.partyId?.company ? (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Party:</span>
                <span className="font-medium">
                  {invoice.partySnapshot?.displayName || invoice.partyId?.name || invoice.partyId?.company}
                </span>
              </div>
            ) : null}
            {invoice.contactSnapshot?.name ? (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Contact:</span>
                <span className="font-medium">
                  {invoice.contactSnapshot.name}
                  {invoice.contactSnapshot.designation ? (
                    <span className="text-muted-foreground font-normal"> ({invoice.contactSnapshot.designation})</span>
                  ) : null}
                </span>
              </div>
            ) : null}
            {invoice.grandTotal ? (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium text-green-600">{formatCurrency(invoice.grandTotal)}</span>
              </div>
            ) : null}
          </div>

          <div className="grid gap-2 grid-cols-3">
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
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Approving this invoice
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will create a journal entry debiting accounts receivable and crediting revenue.
                  </p>
                </div>
              </div>
            </div>
          )}

          {invoice.status === 'approved' && newStatus !== 'approved' && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-orange-900 dark:text-orange-100">
                    Reversing approved status
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will void the associated journal entry.
                  </p>
                </div>
              </div>
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