// app/expenses/StatusUpdateModal.tsx - UPDATED: UI matching invoice modal

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
import { Spinner } from "@/components/ui/spinner";
import { Clock, CheckCircle, XCircle } from "lucide-react";

interface Expense {
  _id: string;
  referenceNumber: string;
  description: string;
  status: 'pending' | 'approved' | 'cancelled';
}

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense;
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

export function StatusUpdateModal({
  isOpen,
  onClose,
  expense,
  onRefresh,
}: StatusUpdateModalProps) {
  const [initialStatus, setInitialStatus] = useState(expense.status);
  const [newStatus, setNewStatus] = useState(expense.status);
  const [isLoading, setIsLoading] = useState(false);

  const availableStatuses: Expense['status'][] = ['pending', 'approved', 'cancelled'];

  useEffect(() => {
    if (isOpen) {
      setInitialStatus(expense.status);
      setNewStatus(expense.status);
    }
  }, [isOpen, expense.status]);

  const isUpdateDisabled = () => {
    if (isLoading) return true;
    if (newStatus === initialStatus) return true;
    return false;
  };

  const handleUpdateStatus = async () => {
    setIsLoading(true);
    try {
      await updateExpenseStatus(newStatus);
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('An error occurred while updating status');
    } finally {
      setIsLoading(false);
    }
  };

  const updateExpenseStatus = async (status: string) => {
    const updateData: any = { status };

    const res = await fetch(`/api/expenses/${expense._id}`, {
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
          <DialogTitle>Update Expense Status</DialogTitle>
          <DialogDescription>
            Change the status for {expense.referenceNumber}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
                variant={getStatusColor(expense.status)}
                className="ml-2 capitalize"
                appearance="outline"
              >
                {expense.status}
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

          {newStatus === 'approved' && expense.status !== 'approved' && (
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg text-sm text-blue-900 dark:text-blue-100">
              💡 Use the Payment button to create payment vouchers for this expense
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