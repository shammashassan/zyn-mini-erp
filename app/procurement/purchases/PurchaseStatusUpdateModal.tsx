// app/procurement/purchases/PurchaseStatusUpdateModal.tsx - NEW: Purchase Approval Status Only

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
import { Clock, CheckCircle, XCircle } from "lucide-react";

interface Purchase {
  _id: string;
  purchaseStatus: 'pending' | 'approved' | 'cancelled';
  supplierName?: string;
  totalAmount: number;
  grandTotal?: number;
  vatAmount?: number;
}

interface PurchaseStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase;
  onRefresh: () => void;
}

const getPurchaseStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'success';
    case 'pending': return 'warning';
    case 'cancelled': return 'destructive';
    default: return 'neutral';
  }
};

const getPurchaseStatusIcon = (status: string) => {
  switch (status) {
    case 'pending': return Clock;
    case 'approved': return CheckCircle;
    case 'cancelled': return XCircle;
    default: return Clock;
  }
};

export function PurchaseStatusUpdateModal({ 
  isOpen, 
  onClose, 
  purchase, 
  onRefresh 
}: PurchaseStatusUpdateModalProps) {
  const [initialStatus, setInitialStatus] = useState(purchase.purchaseStatus);
  const [newStatus, setNewStatus] = useState(purchase.purchaseStatus);
  const [isLoading, setIsLoading] = useState(false);

  const availableStatuses: Purchase['purchaseStatus'][] = ['pending', 'approved', 'cancelled'];
  const displayTotal = purchase.grandTotal || (purchase.totalAmount + (purchase.vatAmount || 0));

  useEffect(() => {
    if (isOpen) {
      setInitialStatus(purchase.purchaseStatus);
      setNewStatus(purchase.purchaseStatus);
    }
  }, [isOpen, purchase.purchaseStatus]);

  const handleUpdateStatus = async () => {
    setIsLoading(true);
    
    try {
      const updateData = { 
        purchaseStatus: newStatus
      };

      const res = await fetch(`/api/purchases/${purchase._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        toast.success('Purchase status updated successfully');
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
          <DialogTitle>Update Purchase Status</DialogTitle>
          <DialogDescription>
             Change the approval status for this purchase order
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Purchase Info - Kept minimal for context */}
          <div className="rounded-lg border p-3 bg-muted/50 text-sm">
             <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier:</span>
                <span className="font-medium">{purchase.supplierName || 'N/A'}</span>
             </div>
             <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">{formatCurrency(displayTotal)}</span>
             </div>
          </div>

          {/* Status Selection */}
          <div className="grid grid-cols-3 gap-2">
            {availableStatuses.map((status) => {
              const StatusIcon = getPurchaseStatusIcon(status);
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
                variant={getPurchaseStatusColor(initialStatus) as any}
                className="ml-2 capitalize"
                appearance="outline"
              >
                {initialStatus}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">New:</span>
              <Badge
                variant={getPurchaseStatusColor(newStatus) as any}
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