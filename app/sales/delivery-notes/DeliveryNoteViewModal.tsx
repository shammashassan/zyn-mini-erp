// app/sales/delivery-notes/DeliveryNoteViewModal.tsx - FIXED: Show Invoice Number

"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Calendar,
  Package,
  User,
  CircleUserRound,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Truck
} from "lucide-react";
import type { DeliveryNote } from "./columns";
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime, formatLongDate } from "@/utils/formatters/date";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

interface DeliveryNoteViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliveryNote: DeliveryNote | any | null;
  onViewPdf?: (doc: any) => void;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'delivered': return 'success';
    case 'dispatched': return 'primary';
    case 'cancelled': return 'destructive';
    case 'pending': return 'warning';
    default: return 'neutral';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'delivered': return CheckCircle;
    case 'dispatched': return Truck;
    case 'cancelled': return XCircle;
    case 'pending': return Clock;
    default: return AlertCircle;
  }
};

const getCreatorUsername = (deliveryNote: any): string | null => {
  const createAction = deliveryNote?.actionHistory?.find(
    (action: any) => action.action === 'Created'
  );
  return createAction?.username || null;
};

export function DeliveryNoteViewModal({ 
  isOpen, 
  onClose, 
  deliveryNote: initialDeliveryNote, 
  onViewPdf 
}: DeliveryNoteViewModalProps) {
  const [deliveryNote, setDeliveryNote] = useState<any>(initialDeliveryNote);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !initialDeliveryNote) {
      setDeliveryNote(initialDeliveryNote);
      return;
    }

    const isPartialData = initialDeliveryNote._id && (!initialDeliveryNote.items || !Array.isArray(initialDeliveryNote.items));

    if (isPartialData) {
      const fetchFullDetails = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/delivery-notes/${initialDeliveryNote._id}?populate=true`);
          if (res.ok) {
            const fullData = await res.json();
            setDeliveryNote(fullData);
          } else {
            toast.error("Failed to load full delivery note details");
          }
        } catch (error) {
          console.error("Error fetching delivery note details:", error);
          toast.error("Error loading delivery note details");
        } finally {
          setIsLoading(false);
        }
      };

      fetchFullDetails();
    } else {
      setDeliveryNote(initialDeliveryNote);
    }
  }, [isOpen, initialDeliveryNote]);

  if (!isOpen) return null;

  const currentData = deliveryNote || initialDeliveryNote || {};

  const creatorUsername = getCreatorUsername(currentData);
  const totalItems = currentData.items?.length || 0;
  const totalQuantity = currentData.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;

  const StatusIcon = getStatusIcon(currentData.status);

  // ✅ FIXED: Extract invoice number from populated connectedDocuments
  const invoiceIds = currentData.connectedDocuments?.invoiceIds;
  const firstInvoice = (Array.isArray(invoiceIds) && invoiceIds.length > 0) ? invoiceIds[0] : null;
  const invoiceNumber = (typeof firstInvoice === 'object' && firstInvoice !== null) 
    ? firstInvoice.invoiceNumber 
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-4xl max-h-[95vh] overflow-y-auto sidebar-scroll p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Truck className="h-4 w-4 sm:h-5 sm:w-5" />
            Delivery Note Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner className="size-10" />
          </div>
        ) : !currentData.items ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <p className="text-sm">Details unavailable.</p>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {/* Header Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center gap-2">
                    <Truck className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">Delivery Note - {currentData.invoiceNumber}</span>
                  </span>
                  <Badge
                    variant={getStatusVariant(currentData.status) as any}
                    appearance="outline"
                    className="capitalize text-xs gap-1"
                  >
                    <StatusIcon className="h-3 w-3" />
                    {currentData.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground">Delivery Date</div>
                      <div className="font-medium text-xs sm:text-sm break-words">
                        {formatLongDate(currentData.deliveryDate)}
                      </div>
                    </div>
                  </div>

                  {/* ✅ NEW: Show Against Invoice */}
                  {invoiceNumber && (
                    <div className="flex items-start gap-3">
                      <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm text-muted-foreground">Against Invoice</div>
                        <div className="font-medium text-xs sm:text-sm break-words font-mono">
                          {invoiceNumber}
                        </div>
                      </div>
                    </div>
                  )}

                  {currentData.customerName && (
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm text-muted-foreground">Customer</div>
                        <div className="font-medium text-xs sm:text-sm break-words">
                          {currentData.customerName}
                        </div>
                      </div>
                    </div>
                  )}

                  {creatorUsername && (
                    <div className="flex items-start gap-3">
                      <CircleUserRound className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm text-muted-foreground">Created By</div>
                        <div className="font-medium text-xs sm:text-sm break-words">@{creatorUsername}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Total Items</div>
                      <div className="font-medium text-xs sm:text-sm">{totalItems} item(s)</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Total Quantity</div>
                      <div className="font-medium text-xs sm:text-sm">{totalQuantity.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Items</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-medium text-sm">#</th>
                        <th className="text-left p-3 font-medium text-sm">Description</th>
                        <th className="text-right p-3 font-medium text-sm">Quantity</th>
                        <th className="text-right p-3 font-medium text-sm">Rate</th>
                        <th className="text-right p-3 font-medium text-sm">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentData.items?.map((item: any, index: number) => (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                          <td className="p-3">
                            <div className="font-medium">{item.description}</div>
                          </td>
                          <td className="p-3 text-right font-medium">
                            {item.quantity?.toFixed(2)}
                          </td>
                          <td className="p-3 text-right text-muted-foreground">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="p-3 text-right font-semibold">
                            {formatCurrency(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold bg-muted/50">
                        <td colSpan={4} className="p-3 text-right">Grand Total:</td>
                        <td className="p-3 text-right text-green-600 text-lg">
                          {formatCurrency(currentData.grandTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {currentData.items?.map((item: any, index: number) => (
                    <Card key={index} className="border">
                      <CardContent className="p-3 sm:p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">Item #{index + 1}</div>
                            <div className="font-medium text-sm break-words">{item.description}</div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Quantity</div>
                            <div className="font-medium">{item.quantity?.toFixed(2)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-0.5">Rate</div>
                            <div className="font-medium">{formatCurrency(item.rate)}</div>
                          </div>
                        </div>

                        <div className="pt-2 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Total</span>
                            <span className="font-bold text-sm sm:text-base">
                              {formatCurrency(item.total)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Mobile Totals Summary */}
                  <Card className="border-2 bg-muted/50">
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex justify-between">
                        <span className="font-bold text-sm">Grand Total</span>
                        <span className="font-bold text-base sm:text-lg text-green-600">
                          {formatCurrency(currentData.grandTotal)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Connected Documents */}
            {invoiceNumber && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                    Connected Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {onViewPdf ? (
                    <ConnectedDocumentsBadges
                      deliveryNote={currentData}
                      onViewPdf={onViewPdf}
                    />
                  ) : (
                    <span className="text-xs sm:text-sm text-muted-foreground">—</span>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {currentData.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap">
                    {currentData.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Audit Trail */}
            {currentData.actionHistory && currentData.actionHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">Activity History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {currentData.actionHistory.map((action: any, index: number) => (
                      <div 
                        key={index} 
                        className="flex items-start gap-3 text-xs sm:text-sm p-2 sm:p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium break-words">{action.action}</div>
                          {(action.username || action.userId) && (
                            <div className="text-xs text-muted-foreground">
                              by @{action.username || action.userId}
                            </div>
                          )}
                          {action.changes && action.changes.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {action.changes.map((change: any, idx: number) => (
                                <div key={idx} className="text-xs text-muted-foreground break-words">
                                  <span className="font-medium">{change.field}:</span>{' '}
                                  <span className="line-through">{String(change.oldValue)}</span>
                                  {' → '}
                                  <span className="text-green-600">{String(change.newValue)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(action.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* System Information */}
            <Card className="bg-muted/50">
              <CardContent className="p-3 sm:p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                  <div className="break-words">
                    <span className="text-muted-foreground">Created:</span>
                    <span className="ml-2 font-medium">
                      {formatDateTime(currentData.createdAt)}
                    </span>
                  </div>
                  <div className="break-words">
                    <span className="text-muted-foreground">Last Updated:</span>
                    <span className="ml-2 font-medium">
                      {formatDateTime(currentData.updatedAt)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}