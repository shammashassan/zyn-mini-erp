// app/procurement/credit-notes/CreditNoteViewModal.tsx - UPDATED: Show Return Note Reference

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
import { Button } from "@/components/ui/button";
import {
  FileText,
  Calendar,
  Package,
  User,
  CreditCard,
  Wallet,
  TrendingUp,
  CircleUserRound,
  Percent,
  CheckCircle,
  Clock,
  AlertCircle,
  XCircle,
  Receipt,
  RotateCcw,
} from "lucide-react";
import type { CreditNote } from "./columns";
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime, formatLongDate } from "@/utils/formatters/date";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

interface CreditNoteViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  creditNote: CreditNote | any | null;
  onCreatePayment?: (creditNote: CreditNote) => void;
  canCreatePayment?: boolean;
  onViewPaymentPdf?: (payment: any) => void;
  onViewReturnNotePdf?: (returnNote: any) => void;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'approved': return 'success';
    case 'pending': return 'warning';
    case 'cancelled': return 'destructive';
    default: return 'gray';
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
    case 'paid': return 'success';
    case 'partially paid': return 'primary';
    case 'pending': return 'warning';
    default: return 'gray';
  }
};

const getPaymentStatusIcon = (status: string) => {
  switch (status) {
    case 'paid': return CheckCircle;
    case 'partially paid': return Wallet;
    case 'pending': return Clock;
    default: return Clock;
  }
};

const getCreatorUsername = (creditNote: any): string | null => {
  const createAction = creditNote?.actionHistory?.find(
    (action: any) => action.action === 'Created'
  );
  return createAction?.username || null;
};

export function CreditNoteViewModal({ 
  isOpen, 
  onClose, 
  creditNote: initialCreditNote,
  onCreatePayment,
  canCreatePayment,
  onViewPaymentPdf,
  onViewReturnNotePdf,
}: CreditNoteViewModalProps) {
  const [creditNote, setCreditNote] = useState<any>(initialCreditNote);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !initialCreditNote) {
      setCreditNote(initialCreditNote);
      return;
    }

    const isPartialData = initialCreditNote._id && (!initialCreditNote.items || !Array.isArray(initialCreditNote.items));

    if (isPartialData) {
      const fetchFullDetails = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/credit-notes/${initialCreditNote._id}`);
          if (res.ok) {
            const fullData = await res.json();
            setCreditNote(fullData);
          } else {
            toast.error("Failed to load full credit note details");
          }
        } catch (error) {
          console.error("Error fetching credit note details:", error);
          toast.error("Error loading credit note details");
        } finally {
          setIsLoading(false);
        }
      };

      fetchFullDetails();
    } else {
      setCreditNote(initialCreditNote);
    }
  }, [isOpen, initialCreditNote]);

  if (!isOpen) return null;

  const currentData = creditNote || initialCreditNote || {};

  const creatorUsername = getCreatorUsername(currentData);
  const totalItems = currentData.items?.length || 0;
  const totalQuantity = currentData.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;

  const grossTotal = currentData.totalAmount || 0;
  const discount = currentData.discount || 0;
  const subtotal = grossTotal - discount;
  const vatAmount = currentData.vatAmount || 0;
  const displayTotal = currentData.grandTotal || (subtotal + vatAmount);

  const StatusIcon = getStatusIcon(currentData.status);
  const PaymentIcon = getPaymentStatusIcon(currentData.paymentStatus);

  const canShowPaymentButton = 
    canCreatePayment && 
    currentData.status === 'approved' && 
    currentData.paymentStatus !== 'paid' &&
    onCreatePayment;

  const isManualEntry = currentData.items?.length === 1 && !currentData.items[0].productId;

  // Check if return note is populated
  const returnNote = (typeof currentData.connectedDocuments?.returnNoteId === 'object' && currentData.connectedDocuments?.returnNoteId !== null)
    ? currentData.connectedDocuments.returnNoteId
    : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-4xl max-h-[95vh] overflow-y-auto sidebar-scroll p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5"/>
            Credit Note Details
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
                    <span className="text-xs sm:text-sm">Credit Note - {currentData.creditNoteNumber}</span>
                  </span>
                  <div className="flex gap-2 flex-wrap">
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
                      className="capitalize text-xs"
                    >
                      <PaymentIcon className="h-3 w-3" />
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
                      <div className="text-xs sm:text-sm text-muted-foreground">Credit Date</div>
                      <div className="font-medium text-xs sm:text-sm break-words">{formatLongDate(currentData.creditDate)}</div>
                    </div>
                  </div>

                  {(currentData.customerName || currentData.supplierName || currentData.payeeName || currentData.vendorName) && (
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {currentData.customerName ? 'Customer' : currentData.supplierName ? 'Supplier' : currentData.payeeName ? 'Payee' : 'Vendor'}
                        </div>
                        <div className="font-medium text-xs sm:text-sm break-words">
                          {currentData.customerName || currentData.supplierName || currentData.payeeName || currentData.vendorName}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Return Note Reference */}
                  {returnNote && (
                    <div className="flex items-start gap-3">
                      <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm text-muted-foreground">Return Note</div>
                        <div className="font-medium text-xs sm:text-sm font-mono break-words">{returnNote.returnNumber}</div>
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
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Total Quantity</div>
                      <div className="font-medium text-xs sm:text-sm">{totalQuantity.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                {currentData.reason && (
                  <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                    <div className="text-xs font-medium text-orange-900 dark:text-orange-100 mb-1">
                      Reason:
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {currentData.reason}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Credit Note Items */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">
                  {isManualEntry ? "Amount Details" : "Products"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isManualEntry ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg border">
                      <div className="text-sm text-muted-foreground mb-1 font-medium tracking-wider">Description</div>
                      <div className="font-medium text-base text-foreground">
                        {currentData.items[0].description}
                      </div>
                    </div>

                    <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Amount</span>
                          <span className="font-medium">{formatCurrency(grossTotal)}</span>
                        </div>
                        {discount > 0 && (
                          <div className="flex justify-between text-sm text-orange-600">
                            <span className="flex items-center gap-1">
                              <Percent className="h-3 w-3" /> Discount
                            </span>
                            <span className="font-medium">-{formatCurrency(discount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm pt-3 border-t">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">{formatCurrency(subtotal)}</span>
                        </div>
                        {currentData.isTaxPayable && vatAmount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">VAT (5%)</span>
                            <span className="font-medium">{formatCurrency(vatAmount)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-3 border-t">
                          <span className="font-bold text-base">Grand Total</span>
                          <span className="font-bold text-lg text-green-600">
                            {formatCurrency(displayTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left p-3 font-medium text-sm">#</th>
                            <th className="text-left p-3 font-medium text-sm">Product</th>
                            <th className="text-right p-3 font-medium text-sm">Quantity</th>
                            <th className="text-right p-3 font-medium text-sm">Unit Price</th>
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
                                {formatCurrency(item.price)}
                              </td>
                              <td className="p-3 text-right font-semibold">
                                {formatCurrency(item.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 font-bold bg-muted/50">
                            <td colSpan={4} className="p-3 text-right">
                              Gross Total:
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {formatCurrency(grossTotal)}
                            </td>
                          </tr>
                          {discount > 0 && (
                            <tr className="bg-muted/50">
                              <td
                                colSpan={4}
                                className="p-3 text-right text-orange-600"
                              >
                                <div className="flex items-center justify-end gap-2">
                                  <Percent className="h-3 w-3" />
                                  Discount:
                                </div>
                              </td>
                              <td className="p-3 text-right font-semibold text-orange-600">
                                - {formatCurrency(discount)}
                              </td>
                            </tr>
                          )}
                          <tr className="bg-muted/50">
                            <td colSpan={4} className="p-3 text-right">
                              Subtotal:
                            </td>
                            <td className="p-3 text-right font-semibold">
                              {formatCurrency(subtotal)}
                            </td>
                          </tr>
                          {currentData.isTaxPayable && vatAmount > 0 && (
                            <tr className="bg-muted/50">
                              <td colSpan={4} className="p-3 text-right">
                                VAT (5%):
                              </td>
                              <td className="p-3 text-right font-semibold">
                                {formatCurrency(vatAmount)}
                              </td>
                            </tr>
                          )}
                          <tr className="border-t-2 font-bold bg-muted/50">
                            <td colSpan={4} className="p-3 text-right">
                              Grand Total:
                            </td>
                            <td className="p-3 text-right text-green-600 text-lg">
                              {formatCurrency(displayTotal)}
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
                                <div className="text-xs text-muted-foreground mb-0.5">Unit Price</div>
                                <div className="font-medium">{formatCurrency(item.price)}</div>
                              </div>
                            </div>

                            <div className="pt-2 border-t">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">Total</span>
                                <span className="font-bold text-sm sm:text-base">{formatCurrency(item.total)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {/* Mobile Totals */}
                      <Card className="border-2 bg-muted/50">
                        <CardContent className="p-3 sm:p-4 space-y-2">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground">Gross Total</span>
                            <span className="font-semibold">{formatCurrency(grossTotal)}</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Percent className="h-3 w-3" />
                                Discount
                              </span>
                              <span className="font-semibold text-orange-600">-{formatCurrency(discount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-xs sm:text-sm pt-2 border-t">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span className="font-semibold">{formatCurrency(subtotal)}</span>
                          </div>
                          {currentData.isTaxPayable && vatAmount > 0 && (
                            <div className="flex justify-between text-xs sm:text-sm">
                              <span className="text-muted-foreground">VAT (5%)</span>
                              <span className="font-semibold">{formatCurrency(vatAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t">
                            <span className="font-bold text-sm">Grand Total</span>
                            <span className="font-bold text-base sm:text-lg text-green-600">
                              {formatCurrency(displayTotal)}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                  Payment Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 rounded-lg bg-muted/50">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Total Amount</div>
                    <div className="text-xl sm:text-2xl font-bold">
                      {formatCurrency(displayTotal)}
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Paid Amount</div>
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      {formatCurrency(currentData.paidAmount || 0)}
                    </div>
                    {currentData.paymentAllocations && currentData.paymentAllocations.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {currentData.paymentAllocations.length} payment(s)
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

                {(currentData.paidAmount > 0) && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Payment Progress</span>
                      <span className="font-medium">
                        {((currentData.paidAmount / displayTotal) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 transition-all"
                        style={{ width: `${Math.min((currentData.paidAmount / displayTotal) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connected Documents */}
            {(currentData.connectedDocuments?.paymentIds?.length > 0 || currentData.returnNoteId) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
                    Connected Documents
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {onViewPaymentPdf && onViewReturnNotePdf ? (
                    <ConnectedDocumentsBadges
                      creditNote={currentData}
                      onViewPaymentPdf={onViewPaymentPdf}
                      onViewReturnNotePdf={onViewReturnNotePdf}
                    />
                  ) : (
                    <span className="text-xs sm:text-sm text-muted-foreground">—</span>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Additional Notes */}
            {currentData.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">Additional Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
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
                      <div key={index} className="flex items-start gap-3 text-xs sm:text-sm p-2 sm:p-3 rounded-lg bg-muted/50">
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
                                  {' →'}
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