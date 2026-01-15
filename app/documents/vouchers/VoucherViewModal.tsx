// app/documents/vouchers/VoucherViewModal.tsx - UPDATED: Voucher Details Modal

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
  DollarSign,
  CreditCard,
  FileText as FileTextIcon,
  Wallet,
  Landmark,
} from "lucide-react";
import type { Voucher } from "./columns";
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime, formatLongDate } from "@/utils/formatters/date";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

interface VoucherViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  voucher: Voucher | any | null;
  onViewPdf?: (doc: any) => void;
}

const getVoucherTypeVariant = (type: string) => {
  switch (type) {
    case 'receipt': return 'success';
    case 'payment': return 'primary';
    case 'refund': return 'destructive';
    default: return 'secondary';
  }
};

const getVoucherTypeIcon = (type: string) => {
  switch (type) {
    case 'receipt': return DollarSign;
    case 'payment': return Landmark;
    case 'refund': return CreditCard;
    default: return Wallet;
  }
};

const getPaymentMethodIcon = (method: string) => {
  const normalizedMethod = method?.toLowerCase() || '';
  if (normalizedMethod.includes('cash')) return DollarSign;
  if (normalizedMethod.includes('bank')) return Landmark;
  if (normalizedMethod.includes('cheque') || normalizedMethod.includes('check')) return FileTextIcon;
  if (normalizedMethod.includes('card')) return CreditCard;
  return Wallet;
};

const getCreatorUsername = (voucher: any): string | null => {
  const createAction = voucher?.actionHistory?.find(
    (action: any) => action.action === 'Created'
  );
  return createAction?.username || null;
};

const getPartyInfo = (voucher: any) => {
  if (voucher.customerName) {
    return { name: voucher.customerName, type: 'Customer', icon: User };
  }
  if (voucher.supplierName) {
    return { name: voucher.supplierName, type: 'Supplier', icon: User };
  }
  if (voucher.payeeName) {
    return { name: voucher.payeeName, type: 'Payee', icon: User };
  }
  if (voucher.vendorName) {
    return { name: voucher.vendorName, type: 'Vendor', icon: User };
  }
  return null;
};

export function VoucherViewModal({ 
  isOpen, 
  onClose, 
  voucher: initialVoucher, 
  onViewPdf 
}: VoucherViewModalProps) {
  const [voucher, setVoucher] = useState<any>(initialVoucher);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !initialVoucher) {
      setVoucher(initialVoucher);
      return;
    }

    const isPartialData = initialVoucher._id && (!initialVoucher.items || !Array.isArray(initialVoucher.items));

    if (isPartialData) {
      const fetchFullDetails = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/vouchers/${initialVoucher._id}`);
          if (res.ok) {
            const fullData = await res.json();
            setVoucher(fullData);
          } else {
            toast.error("Failed to load full voucher details");
          }
        } catch (error) {
          console.error("Error fetching voucher details:", error);
          toast.error("Error loading voucher details");
        } finally {
          setIsLoading(false);
        }
      };

      fetchFullDetails();
    } else {
      setVoucher(initialVoucher);
    }
  }, [isOpen, initialVoucher]);

  if (!isOpen) return null;

  const currentData = voucher || initialVoucher || {};

  const creatorUsername = getCreatorUsername(currentData);
  const partyInfo = getPartyInfo(currentData);

  const VoucherTypeIcon = getVoucherTypeIcon(currentData.voucherType);
  const PaymentMethodIcon = getPaymentMethodIcon(currentData.paymentMethod);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-4xl max-h-[95vh] overflow-y-auto sidebar-scroll p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
            Voucher Details
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
                    <span className="text-xs sm:text-sm">Voucher - {currentData.invoiceNumber}</span>
                  </span>
                  <Badge
                    variant={getVoucherTypeVariant(currentData.voucherType) as any}
                    appearance="outline"
                    className="capitalize text-xs gap-1"
                  >
                    <VoucherTypeIcon className="h-3 w-3" />
                    {currentData.voucherType}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground">Voucher Date</div>
                      <div className="font-medium text-xs sm:text-sm break-words">
                        {formatLongDate(currentData.voucherDate)}
                      </div>
                    </div>
                  </div>

                  {partyInfo && (
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm text-muted-foreground">{partyInfo.type}</div>
                        <div className="font-medium text-xs sm:text-sm break-words">
                          {partyInfo.name}
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
                    <PaymentMethodIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground">Payment Method</div>
                      <div className="font-medium text-xs sm:text-sm break-words">
                        {currentData.paymentMethod}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Total</div>
                      <div className="text-lg sm:text-xl font-bold text-green-600">
                        {formatCurrency(currentData.grandTotal)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connected Documents */}
            {(currentData.connectedDocuments?.invoiceIds?.length > 0 ||
              currentData.connectedDocuments?.invoiceId ||
              currentData.connectedDocuments?.purchaseIds?.length > 0 ||
              currentData.connectedDocuments?.purchaseId ||
              currentData.connectedDocuments?.expenseIds?.length > 0) && (
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
                      voucher={currentData}
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
