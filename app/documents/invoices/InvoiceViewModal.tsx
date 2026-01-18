// app/documents/invoices/InvoiceViewModal.tsx

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
  DollarSign,
  CreditCard,
  Percent,
  Wallet
} from "lucide-react";
import type { Invoice } from "./columns";
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime, formatLongDate } from "@/utils/formatters/date";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

interface InvoiceViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | any | null;
  onViewPdf?: (doc: any) => void;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'approved': return 'success';
    case 'cancelled': return 'destructive';
    case 'pending': return 'warning';
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

const getPaymentStatusVariant = (status: string) => {
  switch (status) {
    case 'Paid': return 'success';
    case 'Partially Paid': return 'primary';
    case 'Pending': return 'warning';
    default: return 'neutral';
  }
};

const getPaymentStatusIcon = (status: string) => {
  switch (status) {
    case 'Paid': return CheckCircle;
    case 'Partially Paid': return CreditCard;
    case 'Pending': return Clock;
    default: return DollarSign;
  }
};

const getCreatorUsername = (invoice: any): string | null => {
  const createAction = invoice?.actionHistory?.find(
    (action: any) => action.action === 'Created'
  );
  return createAction?.username || null;
};

export function InvoiceViewModal({ 
  isOpen, 
  onClose, 
  invoice: initialInvoice, 
  onViewPdf 
}: InvoiceViewModalProps) {
  const [invoice, setInvoice] = useState<any>(initialInvoice);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !initialInvoice) {
      setInvoice(initialInvoice);
      return;
    }

    const isPartialData = initialInvoice._id && (!initialInvoice.items || !Array.isArray(initialInvoice.items));

    if (isPartialData) {
      const fetchFullDetails = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/invoices/${initialInvoice._id}`);
          if (res.ok) {
            const fullData = await res.json();
            setInvoice(fullData);
          } else {
            toast.error("Failed to load full invoice details");
          }
        } catch (error) {
          console.error("Error fetching invoice details:", error);
          toast.error("Error loading invoice details");
        } finally {
          setIsLoading(false);
        }
      };

      fetchFullDetails();
    } else {
      setInvoice(initialInvoice);
    }
  }, [isOpen, initialInvoice]);

  if (!isOpen) return null;

  const currentData = invoice || initialInvoice || {};

  const creatorUsername = getCreatorUsername(currentData);
  const totalItems = currentData.items?.length || 0;
  const totalQuantity = currentData.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;

  const StatusIcon = getStatusIcon(currentData.status);
  const PaymentStatusIcon = getPaymentStatusIcon(currentData.paymentStatus);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-4xl max-h-[95vh] overflow-y-auto sidebar-scroll p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            Invoice Details
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
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="text-xs sm:text-sm">Invoice - {currentData.invoiceNumber}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={getStatusVariant(currentData.status) as any}
                      appearance="outline"
                      className="capitalize text-xs gap-1"
                    >
                      <StatusIcon className="h-3 w-3" />
                      {currentData.status}
                    </Badge>
                    <Badge
                      variant={getPaymentStatusVariant(currentData.paymentStatus) as any}
                      appearance="outline"
                      className="capitalize text-xs gap-1"
                    >
                      <PaymentStatusIcon className="h-3 w-3" />
                      {currentData.paymentStatus}
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground">Invoice Date</div>
                      <div className="font-medium text-xs sm:text-sm break-words">
                        {formatLongDate(currentData.invoiceDate)}
                      </div>
                    </div>
                  </div>

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

            {/* Invoice Items */}
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
                        <td colSpan={4} className="p-3 text-right">Total Amount:</td>
                        <td className="p-3 text-right font-semibold">
                          {formatCurrency(currentData.totalAmount)}
                        </td>
                      </tr>
                      {currentData.discount > 0 && (
                        <tr className="bg-muted/50">
                          <td colSpan={4} className="p-3 text-right text-orange-600">
                            <div className="flex items-center justify-end gap-2">
                              <Percent className="h-3 w-3" />
                              Discount:
                            </div>
                          </td>
                          <td className="p-3 text-right font-semibold text-orange-600">
                            - {formatCurrency(currentData.discount)}
                          </td>
                        </tr>
                      )}
                      {currentData.vatAmount > 0 && (
                        <tr className="bg-muted/50">
                          <td colSpan={4} className="p-3 text-right">VAT (5%):</td>
                          <td className="p-3 text-right font-semibold">
                            {formatCurrency(currentData.vatAmount)}
                          </td>
                        </tr>
                      )}
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
                    <CardContent className="p-3 sm:p-4 space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Total Amount</span>
                        <span className="font-semibold">{formatCurrency(currentData.totalAmount)}</span>
                      </div>
                      {currentData.discount > 0 && (
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            Discount
                          </span>
                          <span className="font-semibold text-orange-600">
                            -{formatCurrency(currentData.discount)}
                          </span>
                        </div>
                      )}
                      {currentData.vatAmount > 0 && (
                        <div className="flex justify-between text-xs sm:text-sm pt-2 border-t">
                          <span className="text-muted-foreground">VAT (5%)</span>
                          <span className="font-semibold">{formatCurrency(currentData.vatAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t">
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

            {/* Payment Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Total Amount</div>
                    <div className="text-xl sm:text-2xl font-bold">
                      {formatCurrency(currentData.grandTotal)}
                    </div>
                    {currentData.discount > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Discount: {formatCurrency(currentData.discount)}
                      </div>
                    )}
                    {currentData.vatAmount > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Includes VAT: {formatCurrency(currentData.vatAmount)}
                      </div>
                    )}
                  </div>

                  <div className="p-3 sm:p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Paid Amount</div>
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      {formatCurrency(currentData.paidAmount || 0)}
                    </div>
                    {currentData.connectedDocuments?.receiptIds && currentData.connectedDocuments.receiptIds.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {currentData.connectedDocuments.receiptIds.length} receipt(s)
                      </div>
                    )}
                  </div>

                  <div className="p-3 sm:p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Remaining Amount</div>
                    <div className="text-xl sm:text-2xl font-bold text-orange-600">
                      {formatCurrency(currentData.remainingAmount || 0)}
                    </div>
                  </div>
                </div>

                {/* Payment Progress Bar */}
                {(currentData.paidAmount > 0) && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Payment Progress</span>
                      <span className="font-medium">
                        {((currentData.paidAmount / currentData.grandTotal) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 transition-all"
                        style={{ width: `${Math.min((currentData.paidAmount / currentData.grandTotal) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connected Documents */}
            {(currentData.connectedDocuments?.receiptIds?.length > 0 ||
              currentData.connectedDocuments?.deliveryId ||
              currentData.connectedDocuments?.returnNoteIds?.length > 0 ||
              currentData.connectedDocuments?.quotationId) && (
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
                      invoice={currentData}
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
                          {!action.username && !action.userId && (
                            <div className="text-xs text-muted-foreground italic">
                              by Unknown User
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