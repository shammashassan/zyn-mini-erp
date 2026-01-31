// app/sales/sales-returns/SalesReturnStatusUpdateModal.tsx

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
import { CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/utils/formatters/currency";

interface SalesReturn {
  _id: string;
  returnNumber: string;
  status: 'pending' | 'approved' | 'cancelled';
  grandTotal?: number;
  items?: Array<{
    productName?: string;
    returnQuantity: number;
  }>;
  partyId?: any;
  partySnapshot?: any;
}

interface SalesReturnStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesReturn: SalesReturn;
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
    case 'approved': return CheckCircle;
    case 'pending': return Clock;
    case 'cancelled': return XCircle;
    default: return AlertCircle;
  }
};

export function SalesReturnStatusUpdateModal({
  isOpen,
  onClose,
  salesReturn,
  onRefresh
}: SalesReturnStatusUpdateModalProps) {
  const [initialStatus, setInitialStatus] = useState(salesReturn.status);
  const [newStatus, setNewStatus] = useState(salesReturn.status);
  const [isLoading, setIsLoading] = useState(false);

  const availableStatuses: SalesReturn['status'][] = ['pending', 'approved', 'cancelled'];

  useEffect(() => {
    if (isOpen) {
      setInitialStatus(salesReturn.status);
      setNewStatus(salesReturn.status);
    }
  }, [isOpen, salesReturn.status]);

  const handleUpdateStatus = async () => {
    setIsLoading(true);

    try {
      const updateData = {
        status: newStatus
      };

      const res = await fetch(`/api/return-notes/${salesReturn._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        let message = 'Sales return status updated successfully';

        if (newStatus === 'approved' && initialStatus !== 'approved') {
          message = 'Sales return approved - Invoice updated';
        } else if (initialStatus === 'approved' && newStatus !== 'approved') {
          message = 'Sales return reversed - Invoice restored';
        }

        toast.success(message);
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

  const totalReturnedQty = salesReturn.items?.reduce((sum, item) => sum + item.returnQuantity, 0) || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Sales Return Status</DialogTitle>
          <DialogDescription>
            Change the status for this sales return
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-3 bg-muted/50 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Return No:</span>
              <span className="font-medium font-mono">{salesReturn.returnNumber}</span>
            </div>
            {salesReturn.partySnapshot?.displayName || salesReturn.partyId?.name || salesReturn.partyId?.company ? (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Party:</span>
                <span className="font-medium">
                  {salesReturn.partySnapshot?.displayName || salesReturn.partyId?.name || salesReturn.partyId?.company || 'Unknown Party'}
                </span>
              </div>
            ) : null}
            {salesReturn.items && salesReturn.items.length > 0 && (
              <>
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Products:</span>
                  <span className="font-medium">{salesReturn.items.length} product(s)</span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Total Qty:</span>
                  <span className="font-medium text-red-600">{totalReturnedQty.toFixed(2)}</span>
                </div>
              </>
            )}
            {salesReturn.grandTotal && (
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium text-red-600">{formatCurrency(salesReturn.grandTotal)}</span>
              </div>
            )}
          </div>

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

          {newStatus === 'approved' && initialStatus !== 'approved' && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-100">
                  Invoice will be updated
                </p>
                <p className="text-orange-700 dark:text-orange-300 text-xs">
                  Returned quantities will be recorded on the invoice
                </p>
              </div>
            </div>
          )}

          {initialStatus === 'approved' && newStatus !== 'approved' && (
            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">
                  Invoice will be restored
                </p>
                <p className="text-green-700 dark:text-green-300 text-xs">
                  Previously returned quantities will be reversed
                </p>
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