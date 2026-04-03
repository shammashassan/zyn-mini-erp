// app/sales/sales-returns/SalesReturnViewModal.tsx

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PackageX,
  Calendar,
  User,
  CircleUserRound,
  Receipt,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime, formatLongDate } from "@/utils/formatters/date";
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges";

interface SalesReturn {
  _id: string;
  returnNumber: string;
  returnType: 'salesReturn';

  invoiceReference?: string;
  partyId?: any;
  partySnapshot?: any;

  items: Array<{
    description?: string;
    returnQuantity: number;
    rate?: number;
    total?: number;
  }>;
  returnDate: string;
  reason: string;
  notes?: string;
  status: "pending" | "approved" | "cancelled";

  totalAmount?: number;
  grandTotal?: number;

  connectedDocuments?: {
    invoiceId?: any;
    creditNoteId?: any;
  };

  createdBy?: string | null;
  actionHistory?: Array<{
    action: string;
    userId?: string | null;
    username?: string | null;
    timestamp: string;
    changes?: Array<{
      field: string;
      oldValue: any;
      newValue: any;
    }>;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface SalesReturnViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesReturn: SalesReturn | null;
  onViewInvoicePdf?: (invoice: any) => void;
  onViewCreditNotePdf?: (creditNote: any) => void;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case "approved": return "success";
    case "pending": return "warning";
    case "cancelled": return "destructive";
    default: return "neutral";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "approved": return CheckCircle;
    case "pending": return Clock;
    case "cancelled": return XCircle;
    default: return AlertCircle;
  }
};

const getCreatorUsername = (salesReturn: any): string | null => {
  const createAction = salesReturn?.actionHistory?.find(
    (action: any) => action.action === "Created"
  );
  return createAction?.username || null;
};

export function SalesReturnViewModal({
  isOpen,
  onClose,
  salesReturn,
  onViewInvoicePdf,
  onViewCreditNotePdf,
}: SalesReturnViewModalProps) {
  if (!isOpen || !salesReturn) return null;

  const creatorUsername = getCreatorUsername(salesReturn);
  const totalItemsCount = salesReturn.items?.length || 0;
  const totalReturnedQty = salesReturn.items?.reduce(
    (sum, item) => sum + (item.returnQuantity || 0),
    0
  ) || 0;

  const StatusIcon = getStatusIcon(salesReturn.status);

  const invoice = typeof salesReturn.connectedDocuments?.invoiceId === 'object'
    ? salesReturn.connectedDocuments.invoiceId
    : null;

  const documentRef = invoice?.invoiceNumber;

  const connectedCreditNote = typeof salesReturn.connectedDocuments?.creditNoteId === 'object'
    ? salesReturn.connectedDocuments.creditNoteId as any
    : null;

  const hasConnectedDocuments =
    (salesReturn.connectedDocuments?.invoiceId && typeof salesReturn.connectedDocuments.invoiceId === 'object') ||
    (connectedCreditNote && connectedCreditNote.status === 'approved');

  const party = salesReturn.partyId as any;
  const partySnapshot = salesReturn.partySnapshot as any;
  const contactSnapshot = (salesReturn as any).contactSnapshot;

  const partyName = partySnapshot?.displayName || (party?.name || party?.company) || 'Unknown Party';

  const contactName = contactSnapshot?.name;
  const contactPhone = contactSnapshot?.phone || party?.phone;
  const contactEmail = contactSnapshot?.email || party?.email;
  const contactDesignation = contactSnapshot?.designation;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-4xl max-h-[95vh] overflow-y-auto sidebar-scroll p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <PackageX className="h-4 w-4 sm:h-5 sm:w-5" />
            Sales Return Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">
                    Sales Return - {salesReturn.returnNumber}
                  </span>
                </span>
                <Badge
                  variant={getStatusVariant(salesReturn.status) as any}
                  appearance="outline"
                  className="capitalize text-xs gap-1"
                >
                  <StatusIcon className="h-3 w-3" />
                  {salesReturn.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Return Date
                    </div>
                    <div className="font-medium text-xs sm:text-sm wrap-break-word">
                      {formatLongDate(salesReturn.returnDate)}
                    </div>
                  </div>
                </div>

                {documentRef && (
                  <div className="flex items-start gap-3">
                    <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Invoice Reference
                      </div>
                      <div className="font-medium text-xs sm:text-sm font-mono wrap-break-word">
                        {documentRef}
                      </div>
                    </div>
                  </div>
                )}

                {partyName && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Party
                      </div>
                      <div className="font-medium text-xs sm:text-sm wrap-break-word">
                        {partyName}
                      </div>
                    </div>
                  </div>
                )}

                {creatorUsername && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Created By
                      </div>
                      <div className="font-medium text-xs sm:text-sm wrap-break-word">
                        @{creatorUsername}
                      </div>
                    </div>
                  </div>
                )}

                {contactName && (
                  <div className="flex items-start gap-3">
                    <CircleUserRound className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground">Contact</div>
                      <div className="font-medium text-xs sm:text-sm wrap-break-word">
                        {contactName}
                        {contactDesignation && (
                          <span className="text-muted-foreground"> ({contactDesignation})</span>
                        )}
                      </div>
                      {contactPhone && (
                        <div className="text-xs text-muted-foreground">{contactPhone}</div>
                      )}
                      {contactEmail && (
                        <div className="text-xs text-muted-foreground">{contactEmail}</div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <PackageX className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Total Returned
                    </div>
                    <div className="font-medium text-xs sm:text-sm text-red-600">
                      {totalReturnedQty.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              {salesReturn.reason && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                  <div className="text-xs font-medium text-orange-900 dark:text-orange-100 mb-1">
                    Reason:
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {salesReturn.reason}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Return Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-sm">#</th>
                      <th className="text-left p-3 font-medium text-sm">Product</th>
                      <th className="text-right p-3 font-medium text-sm">Rate</th>
                      <th className="text-right p-3 font-medium text-sm text-red-600">Quantity</th>
                      <th className="text-right p-3 font-medium text-sm text-red-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesReturn.items?.map((item, index) => {
                      const itemName = item.description || 'Unknown';

                      return (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                          <td className="p-3">
                            <div className="font-medium">{itemName}</div>
                          </td>
                          <td className="p-3 text-right font-medium">
                            {item.rate ? formatCurrency(item.rate) : '-'}
                          </td>
                          <td className="p-3 text-right font-semibold text-red-600">
                            {item.returnQuantity?.toFixed(2)}
                          </td>
                          <td className="p-3 text-right font-semibold text-red-600">
                            {item.total ? formatCurrency(item.total) : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-muted/50">
                      <td colSpan={3} className="p-3 text-right">
                        Total Quantity Returned:
                      </td>
                      <td className="p-3 text-right text-red-600 text-lg">
                        {totalReturnedQty.toFixed(2)}
                      </td>
                      <td className="p-3 text-right text-red-600 text-lg">
                        {salesReturn.grandTotal ? formatCurrency(salesReturn.grandTotal) : '-'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {salesReturn.items?.map((item, index) => {
                  const itemName = item.description || 'Unknown';

                  return (
                    <Card key={index} className="border">
                      <CardContent className="p-3 sm:p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">
                              Item #{index + 1}
                            </div>
                            <div className="font-medium text-sm wrap-break-word">
                              {itemName}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Rate</div>
                            <div className="font-medium">
                              {item.rate ? formatCurrency(item.rate) : '-'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-0.5">Quantity</div>
                            <div className="font-bold text-red-600">
                              {item.returnQuantity?.toFixed(2)}
                            </div>
                          </div>
                          <div className="col-span-2 text-right pt-2 border-t">
                            <div className="text-xs text-muted-foreground mb-0.5">Total</div>
                            <div className="font-bold text-red-600">
                              {item.total ? formatCurrency(item.total) : '-'}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <Card className="border-2 bg-muted/50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-sm">Total Quantity Returned</span>
                      <span className="font-bold text-base sm:text-lg text-red-600">
                        {totalReturnedQty.toFixed(2)}
                      </span>
                    </div>
                    {salesReturn.grandTotal && (
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-bold text-sm">Total Amount</span>
                        <span className="font-bold text-base sm:text-lg text-red-600">
                          {formatCurrency(salesReturn.grandTotal)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {hasConnectedDocuments && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
                  Connected Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ConnectedDocumentsBadges
                  salesReturn={salesReturn as any}
                  onViewInvoicePdf={onViewInvoicePdf}
                  onViewCreditNotePdf={onViewCreditNotePdf}
                />
              </CardContent>
            </Card>
          )}

          {salesReturn.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {salesReturn.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {salesReturn.actionHistory && salesReturn.actionHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {salesReturn.actionHistory.map((action, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 text-xs sm:text-sm p-2 sm:p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium wrap-break-word">{action.action}</div>
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
                            {action.changes.map((change, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-muted-foreground wrap-break-word"
                              >
                                <span className="font-medium">{change.field}:</span>{' '}
                                <span className="line-through">
                                  {String(change.oldValue)}
                                </span>
                                {' → '}
                                <span className="text-green-600">
                                  {String(change.newValue)}
                                </span>
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

          <Card className="bg-muted/50">
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="wrap-break-word">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="ml-2 font-medium">
                    {formatDateTime(salesReturn.createdAt)}
                  </span>
                </div>
                <div className="wrap-break-word">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="ml-2 font-medium">
                    {formatDateTime(salesReturn.updatedAt)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}