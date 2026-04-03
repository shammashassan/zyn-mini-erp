// app/procurement/debit-notes/DebitNoteStatusUpdateModal.tsx - COMPLETE MIGRATION: Using snapshots

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

interface DebitNote {
  _id: string;
  status: 'pending' | 'approved' | 'cancelled';
  totalAmount: number;
  grandTotal?: number;
  vatAmount?: number;

  // ✅ Snapshots (primary)
  partySnapshot?: {
    displayName: string;
  };
  contactSnapshot?: {
    name: string;
    designation?: string;
  };

  // ✅ References (fallback)
  partyId?: any;

  debitNoteNumber?: string;
}

interface DebitNoteStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  debitNote: DebitNote;
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

export function DebitNoteStatusUpdateModal({
  isOpen,
  onClose,
  debitNote,
  onRefresh
}: DebitNoteStatusUpdateModalProps) {
  const [initialStatus, setInitialStatus] = useState(debitNote.status);
  const [newStatus, setNewStatus] = useState(debitNote.status);
  const [isLoading, setIsLoading] = useState(false);

  const availableStatuses: DebitNote['status'][] = ['pending', 'approved', 'cancelled'];
  const displayTotal = debitNote.grandTotal || (debitNote.totalAmount + (debitNote.vatAmount || 0));

  // ✅ Get party name from snapshot with fallback
  const partyName = debitNote.partySnapshot?.displayName
    || (typeof debitNote.partyId === 'object' ? (debitNote.partyId?.company || debitNote.partyId?.name) : '')
    || 'Unknown Party';

  useEffect(() => {
    if (isOpen) {
      setInitialStatus(debitNote.status);
      setNewStatus(debitNote.status);
    }
  }, [isOpen, debitNote.status]);

  const handleUpdateStatus = async () => {
    setIsLoading(true);

    try {
      const updateData = {
        status: newStatus
      };

      const res = await fetch(`/api/debit-notes/${debitNote._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        toast.success('Debit note status updated successfully');
        onClose();
        onRefresh();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update status');
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('An error occurred while updating status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Debit Note Status</DialogTitle>
          <DialogDescription>
            Change the status for this debit note
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Debit Note Info */}
          <div className="rounded-lg border p-3 bg-muted/50 text-sm">
            {debitNote.debitNoteNumber ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Debit Note No:</span>
                <span className="font-medium font-mono">{debitNote.debitNoteNumber}</span>
              </div>
            ) : null}
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Party:</span>
              <span className="font-medium">{partyName}</span>
            </div>
            {debitNote.contactSnapshot?.name ? (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Contact:</span>
                <span className="font-medium">
                  {debitNote.contactSnapshot.name}
                  {debitNote.contactSnapshot.designation ? (
                    <span className="text-muted-foreground font-normal"> ({debitNote.contactSnapshot.designation})</span>
                  ) : null}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between mt-1">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-medium text-green-600">{formatCurrency(displayTotal)}</span>
            </div>
          </div>

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

          {/* Status Warning */}
          {newStatus === 'approved' && initialStatus !== 'approved' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">
                    Approving this debit note
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will create a journal entry crediting inventory/COGS and debiting accounts payable.
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