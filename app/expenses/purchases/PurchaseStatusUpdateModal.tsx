// app/purchases/PurchaseStatusUpdateModal.tsx - COMPLETE FILE

"use client";

import React from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { AlertCircle, Package, Info } from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { Spinner } from "@/components/ui/spinner";

interface Purchase {
  _id: string;
  status: 'Ordered' | 'Received' | 'Partially Received' | 'Cancelled';
  supplierName?: string;
  totalAmount: number;
  isTaxPayable?: boolean;
  vatAmount?: number;
  grandTotal?: number;
  items: Array<{
    materialId: string;
    materialName: string;
    quantity: number;
    unitCost: number;
    total: number;
    receivedQuantity?: number;
  }>;
}

interface StatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase;
  onRefresh: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Received': return 'success';
    case 'Partially Received': return 'primary';
    case 'Cancelled': return 'destructive';
    case 'Ordered': return 'warning';
    default: return 'gray';
  }
};

export function PurchaseStatusUpdateModal({ isOpen, onClose, purchase, onRefresh }: StatusUpdateModalProps) {
  const [initialStatus, setInitialStatus] = useState(purchase.status);
  const [newStatus, setNewStatus] = useState(purchase.status);
  const [isLoading, setIsLoading] = useState(false);
  const [partialQuantities, setPartialQuantities] = useState<Record<string, number>>({});
  const [isEditMode, setIsEditMode] = useState(false);

  const availableStatuses: Purchase['status'][] = ['Ordered', 'Received', 'Partially Received', 'Cancelled'];

  // Calculate grand total (backwards compatible)
  const displayTotal = purchase.grandTotal || (purchase.totalAmount + (purchase.vatAmount || 0));

  // Initialize state when modal opens
  useEffect(() => {
    if (isOpen) {
      setInitialStatus(purchase.status);
      setNewStatus(purchase.status);
      setPartialQuantities({});
      setIsEditMode(false);
    }
  }, [isOpen, purchase.status]);

  // Pre-fill quantities when switching TO Partially Received from Received
  useEffect(() => {
    if (newStatus === 'Partially Received' && purchase.status === 'Received') {
      const fullQuantities: Record<string, number> = {};
      purchase.items.forEach(item => {
        fullQuantities[item.materialId] = item.quantity;
      });
      setPartialQuantities(fullQuantities);
      setIsEditMode(true);
    }
  }, [newStatus, purchase.status, purchase.items]);

  // Helper to get current received quantity
  const getCurrentReceivedQty = (item: any): number => {
    if (purchase.status === 'Received') {
      return item.quantity;
    } else if (purchase.status === 'Partially Received') {
      return item.receivedQuantity || 0;
    }
    return 0;
  };

  // Check if partial quantities have changed
  const hasPartialQuantitiesChanged = () => {
    if (newStatus !== 'Partially Received') return false;

    if (purchase.status === 'Received') {
      return purchase.items.some(item => {
        const inputQty = partialQuantities[item.materialId];
        return inputQty !== undefined && inputQty < item.quantity;
      });
    }

    return purchase.items.some(item => {
      const currentReceived = getCurrentReceivedQty(item);
      const inputQty = partialQuantities[item.materialId];
      return inputQty !== undefined && inputQty !== currentReceived;
    });
  };

  // Check if update button should be disabled
  const isUpdateDisabled = () => {
    if (isLoading) return true;

    if (newStatus === initialStatus && newStatus !== 'Partially Received') {
      return true;
    }

    if (newStatus === 'Partially Received' && newStatus === initialStatus) {
      return !hasPartialQuantitiesChanged();
    }

    if (newStatus === 'Partially Received' && initialStatus === 'Received') {
      return !hasPartialQuantitiesChanged();
    }

    return false;
  };

  const handleUpdateStatus = async () => {
    // Auto-change to Received if all items are fully received
    if (newStatus === 'Partially Received') {
      const allFullyReceived = purchase.items.every(item => {
        const currentReceived = getCurrentReceivedQty(item);
        const inputQty = isEditMode
          ? (partialQuantities[item.materialId] !== undefined ? partialQuantities[item.materialId] : currentReceived)
          : (partialQuantities[item.materialId] || 0);
        const newTotal = isEditMode ? inputQty : currentReceived + inputQty;
        return newTotal >= item.quantity;
      });

      if (allFullyReceived) {
        setNewStatus('Received');
        toast.info("All items fully received. Changing status to 'Received'.");

        const updateData: any = { status: 'Received' };

        setIsLoading(true);
        const res = await fetch(`/api/purchases/${purchase._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateData),
        });

        if (res.ok) {
          toast.success('Status updated to Received - Stock added');
          onClose();
          onRefresh();
        } else {
          const error = await res.json();
          toast.error(error.error || 'Failed to update status');
        }
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    try {
      const updateData: any = { status: newStatus };

      // Reset receivedQuantity when changing to Ordered/Cancelled
      if ((newStatus === 'Ordered' || newStatus === 'Cancelled') &&
        (purchase.status === 'Received' || purchase.status === 'Partially Received')) {
        const itemsWithResetReceived = purchase.items.map(item => ({
          ...item,
          receivedQuantity: 0
        }));
        updateData.items = itemsWithResetReceived;
      }

      // Handle Partially Received status
      if (newStatus === 'Partially Received') {
        let hasError = false;
        for (const item of purchase.items) {
          const currentReceived = getCurrentReceivedQty(item);

          const inputQty = isEditMode
            ? (partialQuantities[item.materialId] !== undefined ? partialQuantities[item.materialId] : currentReceived)
            : (partialQuantities[item.materialId] || 0);
          const newTotal = isEditMode ? inputQty : currentReceived + inputQty;

          if (newTotal > item.quantity) {
            toast.error(`Total received (${newTotal}) exceeds ordered quantity (${item.quantity}) for ${item.materialName}`);
            hasError = true;
            break;
          }

          if (newTotal < 0) {
            toast.error(`Received quantity cannot be negative for ${item.materialName}`);
            hasError = true;
            break;
          }
        }

        if (hasError) {
          setIsLoading(false);
          return;
        }

        const itemsWithReceived = purchase.items.map(item => {
          const currentReceived = getCurrentReceivedQty(item);

          const inputQty = isEditMode
            ? (partialQuantities[item.materialId] !== undefined ? partialQuantities[item.materialId] : currentReceived)
            : (partialQuantities[item.materialId] || 0);

          return {
            ...item,
            receivedQuantity: isEditMode ? inputQty : currentReceived + inputQty
          };
        });
        updateData.items = itemsWithReceived;
      }

      const res = await fetch(`/api/purchases/${purchase._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const willAddStock = (newStatus === 'Received' || newStatus === 'Partially Received') &&
          purchase.status !== 'Received' && purchase.status !== 'Partially Received';
        const willRemoveStock = (purchase.status === 'Received' || purchase.status === 'Partially Received') &&
          newStatus !== 'Received' && newStatus !== 'Partially Received';

        let message = `Status updated to ${newStatus}`;
        if (willAddStock) {
          message += ' - Stock added';
        } else if (willRemoveStock) {
          message += ' - Stock removed';
        } else if (purchase.status === 'Received' && newStatus === 'Partially Received') {
          message += ' - Stock adjusted';
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

  const handleQuantityChange = (materialId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const item = purchase.items.find(i => i.materialId === materialId);
    if (!item) return;

    const currentReceived = getCurrentReceivedQty(item);

    if (isEditMode) {
      if (numValue > item.quantity) {
        toast.error(`Cannot receive more than ${item.quantity} units for ${item.materialName}`);
        return;
      }
      if (numValue < 0) {
        toast.error(`Cannot have negative received quantity for ${item.materialName}`);
        return;
      }
    } else {
      const maxCanReceive = item.quantity - currentReceived;
      if (numValue > maxCanReceive) {
        toast.error(`Cannot receive more than ${maxCanReceive} units for ${item.materialName}`);
        return;
      }
      if (numValue < 0) {
        toast.error(`Cannot have negative received quantity for ${item.materialName}`);
        return;
      }
    }

    setPartialQuantities(prev => ({
      ...prev,
      [materialId]: numValue
    }));
  };

  const willAffectStock = () => {
    const willAddStock = (newStatus === 'Received' || newStatus === 'Partially Received') &&
      purchase.status !== 'Received' && purchase.status !== 'Partially Received';
    const willRemoveStock = (purchase.status === 'Received' || purchase.status === 'Partially Received') &&
      newStatus !== 'Received' && newStatus !== 'Partially Received';
    const willAdjustStock = (purchase.status === 'Received' || purchase.status === 'Partially Received') &&
      newStatus === 'Partially Received';

    return { willAddStock, willRemoveStock, willAdjustStock };
  };

  const { willAddStock, willRemoveStock, willAdjustStock } = willAffectStock();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle>Update Purchase Status</DialogTitle>
          <DialogDescription>
            Change the status for this purchase
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Purchase Info */}
          <div className="rounded-lg border p-3 bg-muted/50">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Supplier:</span>
              <span className="font-medium">{purchase.supplierName || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Items:</span>
              <span className="font-medium">{purchase.items.length} item(s)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount:</span>
              <span className="font-medium">{formatCurrency(displayTotal)}</span>
            </div>
            {/* {purchase.isTaxPayable && purchase.vatAmount && purchase.vatAmount > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Includes VAT:</span>
                <span>{formatCurrency(purchase.vatAmount)}</span>
              </div>
            )} */}
          </div>

          {/* Status Selection */}
          <div className="grid grid-cols-2 gap-2">
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

          {/* Partial Received Input Fields */}
          {newStatus === 'Partially Received' && (
            <div className="space-y-3 p-5 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    {isEditMode ? 'Edit' : 'Enter'} Received Quantities
                  </h4>
                </div>
                {purchase.status !== 'Received' && (
                  <div className="flex items-center gap-2">
                    <Label htmlFor="edit-mode-toggle" className="text-sm text-muted-foreground cursor-pointer">
                      {isEditMode ? 'Edit Mode' : 'Add Mode'}
                    </Label>
                    <Switch
                      id="edit-mode-toggle"
                      checked={isEditMode}
                      onCheckedChange={(checked) => {
                        setIsEditMode(checked);
                        if (checked) {
                          const newQuantities: Record<string, number> = {};
                          purchase.items.forEach(item => {
                            newQuantities[item.materialId] = getCurrentReceivedQty(item);
                          });
                          setPartialQuantities(newQuantities);
                        } else {
                          setPartialQuantities({});
                        }
                      }}
                    />
                  </div>
                )}
              </div>

              {purchase.status === 'Received' && (
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-md mb-3 flex items-start gap-2">
                  <Info className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-900 dark:text-yellow-100">
                    Currently fully received. Reduce quantities below ordered amounts to mark as partially received. Stock will be adjusted accordingly.
                  </p>
                </div>
              )}

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 sidebar-scroll">
                {purchase.items.map((item) => {
                  const currentReceived = getCurrentReceivedQty(item);
                  const maxCanReceive = item.quantity - currentReceived;
                  const currentInput = partialQuantities[item.materialId] !== undefined
                    ? partialQuantities[item.materialId]
                    : (isEditMode ? currentReceived : 0);

                  return (
                    <div key={item.materialId} className="space-y-2 p-3 bg-white dark:bg-gray-900 rounded-md border">
                      <Label htmlFor={`qty-${item.materialId}`} className="text-sm font-medium">
                        {item.materialName}
                      </Label>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                        <span>Ordered: <span className="font-medium text-foreground">{item.quantity}</span></span>
                        {currentReceived > 0 && (
                          <>
                            <span>•</span>
                            <span>Current: <span className="font-medium text-green-600">{currentReceived}</span></span>
                          </>
                        )}
                        {!isEditMode && maxCanReceive > 0 && (
                          <>
                            <span>•</span>
                            <span>Can Add: <span className="font-medium text-orange-600">{maxCanReceive}</span></span>
                          </>
                        )}
                      </div>
                      <Input
                        id={`qty-${item.materialId}`}
                        type="number"
                        step="0.01"
                        min="0"
                        max={isEditMode ? item.quantity : maxCanReceive}
                        placeholder={isEditMode ? `Max: ${item.quantity}` : `Max: ${maxCanReceive}`}
                        value={currentInput || ''}
                        onChange={(e) => handleQuantityChange(item.materialId, e.target.value)}
                        className="text-left"
                        disabled={purchase.status === 'Received' && !isEditMode}
                      />
                      {isEditMode && currentInput > item.quantity && (
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          Cannot exceed ordered quantity ({item.quantity})
                        </div>
                      )}
                      {!isEditMode && currentInput > maxCanReceive && (
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          Cannot exceed remaining quantity ({maxCanReceive})
                        </div>
                      )}
                      {currentInput < 0 && (
                        <div className="flex items-center gap-1 text-xs text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          Quantity cannot be negative
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current vs New Status */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm">
            <div>
              <span className="text-muted-foreground">Current:</span>
              <Badge
                variant={getStatusColor(purchase.status)}
                className="ml-2 capitalize"
                appearance="outline"
              >
                {purchase.status}
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

          {/* Stock Impact Warning */}
          {willAddStock && (
            <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900 dark:text-green-100">Stock will be added</p>
                <p className="text-green-700 dark:text-green-300 text-xs">
                  {newStatus === 'Partially Received'
                    ? 'Entered quantities will be added to inventory'
                    : 'Material quantities from this purchase will be added to inventory'}
                </p>
              </div>
            </div>
          )}

          {willRemoveStock && (
            <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-100">Stock will be removed</p>
                <p className="text-orange-700 dark:text-orange-300 text-xs">
                  Material quantities from this purchase will be deducted from inventory
                </p>
              </div>
            </div>
          )}

          {willAdjustStock && (
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">Stock will be adjusted</p>
                <p className="text-blue-700 dark:text-blue-300 text-xs">
                  Stock will be adjusted based on the new received quantities you enter
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