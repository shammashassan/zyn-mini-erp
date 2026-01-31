// app/procurement/credit-notes/CreditNoteStatusUpdateModal.tsx

"use client";

import React, { useState, useEffect } from "react";
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
import { formatCurrency } from "@/utils/formatters/currency";
import { Spinner } from "@/components/ui/spinner";
import { AlertCircle, Clock, CheckCircle, XCircle } from "lucide-react";

interface CreditNote {
  _id: string;
  status: 'pending' | 'approved' | 'cancelled';
  payeeName?: string;
  totalAmount: number;
  grandTotal?: number;
  vatAmount?: number;
  partyId?: any; // Unified Party Reference
}

interface CreditNoteStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditNote: CreditNote;
  onRefresh: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'success';
    case 'pending': return 'warning';
    case 'cancelled': return 'destructive';
    default: return 'neutral';
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

export function CreditNoteStatusUpdateModal({
  isOpen,
  onClose,
  creditNote,
  onRefresh
}: CreditNoteStatusUpdateModalProps) {
  const [initialStatus, setInitialStatus] = useState(creditNote.status);
  const [newStatus, setNewStatus] = useState(creditNote.status);
  const [isLoading, setIsLoading] = useState(false);

  const availableStatuses: CreditNote['status'][] = ['pending', 'approved', 'cancelled'];
  const displayTotal = creditNote.grandTotal || (creditNote.totalAmount + (creditNote.vatAmount || 0));

  useEffect(() => {
    if (isOpen) {
      setInitialStatus(creditNote.status);
      setNewStatus(creditNote.status);
    }
  }, [isOpen, creditNote.status]);

  const handleUpdateStatus = async () => {
    setIsLoading(true);

    try {
      const updateData = {
        status: newStatus
      };

      const res = await fetch(`/api/credit-notes/${creditNote._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.status === 403) {
        const errorData = await res.json();
        throw new Error(
          errorData.message || "You don't have permission to perform this action"
        );
      }

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || result.message || "Failed to update status");
      }

      toast.success('Credit note status updated successfully');
      onClose();
      onRefresh();
    } catch (error: any) {
      console.error('Status update error:', error);
      toast.error(error.message || 'An error occurred while updating status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Credit Note Status</DialogTitle>
          <DialogDescription>
            Change the status for this credit note
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Credit Note Info */}
          <div className="rounded-lg border p-3 bg-muted/50 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Party:</span>
              <span className="font-medium">
                {creditNote.partyId?.name || creditNote.partyId?.company || 'Unknown Party'}
              </span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium">{formatCurrency(displayTotal)}</span>
            </div>
          </div>

          {/* Status Warning */}
          {newStatus === 'approved' && initialStatus !== 'approved' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Approving this credit note
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will create a journal entry debiting revenue/sales and crediting accounts receivable.
                  </p>
                </div>
              </div>
            </div>
          )}

          {initialStatus === 'approved' && newStatus !== 'approved' && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-orange-900 dark:text-orange-100">
                    ⚠️ Reversing approved status
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will void the associated journal entry.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Selection */}
          <div className="grid grid-cols-3 gap-2">
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

          {/* Status Comparison */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">Current:</span>
              <Badge
                variant={getStatusColor(initialStatus) as any}
                className="ml-2 capitalize"
                appearance="outline"
              >
                {initialStatus}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">New:</span>
              <Badge
                variant={getStatusColor(newStatus) as any}
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
            disabled={isLoading || newStatus === initialStatus}
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