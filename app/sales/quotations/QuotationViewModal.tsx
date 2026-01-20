// app/sales/quotations/QuotationViewModal.tsx

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
  FileClock,
  Calendar,
  Package,
  User,
  CircleUserRound,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Send,
  FileCheck,
  RefreshCw,
  FileText,
  Percent
} from "lucide-react";
import type { Quotation } from "./columns";
import { ConnectedInvoiceBadge } from "./ConnectedInvoiceBadge";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime, formatLongDate } from "@/utils/formatters/date";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { UAE_VAT_PERCENTAGE } from "@/utils/constants";

interface QuotationViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: Quotation | any | null;
  onViewPdf?: (doc: any) => void;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'approved': return 'success';
    case 'cancelled': return 'destructive';
    case 'sent': return 'primary';
    case 'converted': return 'info';
    case 'pending': return 'warning';
    default: return 'secondary';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'approved': return CheckCircle;
    case 'cancelled': return XCircle;
    case 'sent': return Send;
    case 'converted': return RefreshCw;
    case 'pending': return Clock;
    default: return AlertCircle;
  }
};

const getCreatorUsername = (quotation: any): string | null => {
  const createAction = quotation?.actionHistory?.find(
    (action: any) => action.action === 'Created'
  );
  return createAction?.username || null;
};

export function QuotationViewModal({ 
  isOpen, 
  onClose, 
  quotation: initialQuotation, 
  onViewPdf 
}: QuotationViewModalProps) {
  const [quotation, setQuotation] = useState<any>(initialQuotation);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !initialQuotation) {
      setQuotation(initialQuotation);
      return;
    }

    const isPartialData = initialQuotation._id && (!initialQuotation.items || !Array.isArray(initialQuotation.items));

    if (isPartialData) {
      const fetchFullDetails = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/quotations/${initialQuotation._id}`);
          if (res.ok) {
            const fullData = await res.json();
            setQuotation(fullData);
          } else {
            toast.error("Failed to load full quotation details");
          }
        } catch (error) {
          console.error("Error fetching quotation details:", error);
          toast.error("Error loading quotation details");
        } finally {
          setIsLoading(false);
        }
      };

      fetchFullDetails();
    } else {
      setQuotation(initialQuotation);
    }
  }, [isOpen, initialQuotation]);

  if (!isOpen) return null;

  const currentData = quotation || initialQuotation || {};

  const creatorUsername = getCreatorUsername(currentData);
  const totalItems = currentData.items?.length || 0;
  const totalQuantity = currentData.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;

  const grossTotal = currentData.totalAmount || 0;
  const discount = currentData.discount || 0;
  const subtotal = grossTotal - discount;
  const vatAmount = subtotal * (UAE_VAT_PERCENTAGE / 100);
  const grandTotal = currentData.grandTotal || (subtotal + vatAmount);

  const StatusIcon = getStatusIcon(currentData.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-4xl max-h-[95vh] overflow-y-auto sidebar-scroll p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileClock className="h-4 w-4 sm:h-5 sm:w-5" />
            Quotation Details
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
                    <span className="text-xs sm:text-sm">Quotation - {currentData.invoiceNumber}</span>
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
                      <div className="text-xs sm:text-sm text-muted-foreground">Quotation Date</div>
                      <div className="font-medium text-xs sm:text-sm break-words">
                        {formatLongDate(currentData.quotationDate)}
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

            {/* Quotation Items */}
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
                        <td colSpan={4} className="p-3 text-right">Gross Total:</td>
                        <td className="p-3 text-right font-semibold">
                          {formatCurrency(grossTotal)}
                        </td>
                      </tr>
                      {discount > 0 && (
                        <tr className="bg-muted/50">
                          <td colSpan={4} className="p-3 text-right text-orange-600">
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
                        <td colSpan={4} className="p-3 text-right">Subtotal:</td>
                        <td className="p-3 text-right font-semibold">
                          {formatCurrency(subtotal)}
                        </td>
                      </tr>
                      <tr className="bg-muted/50">
                        <td colSpan={4} className="p-3 text-right">VAT ({UAE_VAT_PERCENTAGE}%):</td>
                        <td className="p-3 text-right font-semibold">
                          {formatCurrency(vatAmount)}
                        </td>
                      </tr>
                      <tr className="border-t-2 font-bold bg-muted/50">
                        <td colSpan={4} className="p-3 text-right">Grand Total:</td>
                        <td className="p-3 text-right text-green-600 text-lg">
                          {formatCurrency(grandTotal)}
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
                        <span className="text-muted-foreground">Gross Total</span>
                        <span className="font-semibold">{formatCurrency(grossTotal)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-xs sm:text-sm">
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Percent className="h-3 w-3" />
                            Discount
                          </span>
                          <span className="font-semibold text-orange-600">
                            -{formatCurrency(discount)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs sm:text-sm pt-2 border-t">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-semibold">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">VAT ({UAE_VAT_PERCENTAGE}%)</span>
                        <span className="font-semibold">{formatCurrency(vatAmount)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-bold text-sm">Grand Total</span>
                        <span className="font-bold text-base sm:text-lg text-green-600">
                          {formatCurrency(grandTotal)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            {/* Connected Invoice */}
            {currentData.connectedDocuments?.invoiceIds && currentData.connectedDocuments.invoiceIds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                    Connected Invoice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {onViewPdf ? (
                    <ConnectedInvoiceBadge
                      quotation={currentData}
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