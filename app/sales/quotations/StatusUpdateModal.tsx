// app/sales/quotations/StatusUpdateModal.tsx

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
import type { Quotation } from "./columns";
import { Spinner } from "@/components/ui/spinner";
import { Clock, Send, CheckCircle, XCircle } from "lucide-react";

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation;
  onRefresh: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'success';
    case 'sent': return 'primary';
    case 'converted': return 'info';
    case 'cancelled': return 'destructive';
    case 'pending': return 'warning';
    default: return 'gray';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return Clock;
    case 'sent': return Send;
    case 'approved': return CheckCircle;
    case 'cancelled': return XCircle;
    default: return Clock;
  }
};

export function StatusUpdateModal({ isOpen, onClose, quotation, onRefresh }: StatusUpdateModalProps) {
  const [initialStatus, setInitialStatus] = useState(quotation.status);
  const [newStatus, setNewStatus] = useState(quotation.status);
  const [isLoading, setIsLoading] = useState(false);

  const availableStatuses: Quotation['status'][] = ['pending', 'sent', 'approved', 'cancelled'];

  useEffect(() => {
    if (isOpen) {
      setInitialStatus(quotation.status);
      setNewStatus(quotation.status);
    }
  }, [isOpen, quotation.status]);

  const isUpdateDisabled = () => {
    if (isLoading) return true;
    if (newStatus === initialStatus) return true;
    return false;
  };

  const handleUpdateStatus = async () => {
    setIsLoading(true);
    try {
      await updateQuotationStatus(newStatus);
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('An error occurred while updating status');
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuotationStatus = async (status: string) => {
    const updateData: any = { status };

    // ✅ UPDATED: Use specific quotation endpoint
    const res = await fetch(`/api/quotations/${quotation._id}`, {
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
          <DialogTitle>Update Quotation Status</DialogTitle>
          <DialogDescription>
            Change the status for {quotation.invoiceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                variant={getStatusColor(quotation.status)}
                className="ml-2 capitalize"
                appearance="outline"
              >
                {quotation.status}
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

          {newStatus === 'approved' && quotation.status !== 'approved' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg text-sm text-blue-900 dark:text-blue-100">
              💡 Use the Convert button to create an invoice from this quotation
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