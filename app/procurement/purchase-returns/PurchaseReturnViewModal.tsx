// app/procurement/purchase-returns/PurchaseReturnViewModal.tsx

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
  ShoppingCart,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  Wallet,
} from "lucide-react";
import { formatDateTime, formatLongDate } from "@/utils/formatters/date";
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges";

interface PurchaseReturn {
  _id: string;
  returnNumber: string;
  returnType: 'purchaseReturn';

  purchaseReference?: string;
  partyId?: any;
  partySnapshot?: any;

  items: Array<{
    description?: string;
    orderedQuantity?: number;
    receivedQuantity?: number;
    returnedQuantity?: number;
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
    purchaseId?: any;
    debitNoteId?: any;
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

interface PurchaseReturnViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseReturn: PurchaseReturn | null;
  onViewPurchase?: (purchase: any) => void;
  onViewDebitNotePdf?: (debitNote: any) => void;
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

const getCreatorUsername = (purchaseReturn: any): string | null => {
  const createAction = purchaseReturn?.actionHistory?.find(
    (action: any) => action.action === "Created"
  );
  return createAction?.username || null;
};

export function PurchaseReturnViewModal({
  isOpen,
  onClose,
  purchaseReturn,
  onViewPurchase,
  onViewDebitNotePdf,
}: PurchaseReturnViewModalProps) {
  if (!isOpen || !purchaseReturn) return null;

  const creatorUsername = getCreatorUsername(purchaseReturn);
  const totalItemsCount = purchaseReturn.items?.length || 0;
  const totalReturnedQty = purchaseReturn.items?.reduce(
    (sum, item) => sum + (item.returnQuantity || 0),
    0
  ) || 0;

  const StatusIcon = getStatusIcon(purchaseReturn.status);

  const purchase = typeof purchaseReturn.connectedDocuments?.purchaseId === 'object'
    ? purchaseReturn.connectedDocuments.purchaseId
    : null;

  const documentRef = purchase?.referenceNumber;

  const connectedDebitNote = typeof purchaseReturn.connectedDocuments?.debitNoteId === 'object'
    ? purchaseReturn.connectedDocuments.debitNoteId as any
    : null;

  const hasConnectedDocuments =
    (purchaseReturn.connectedDocuments?.purchaseId && typeof purchaseReturn.connectedDocuments.purchaseId === 'object') ||
    (connectedDebitNote && connectedDebitNote.status === 'approved');

  const party = purchaseReturn.partyId as any;
  const partySnapshot = purchaseReturn.partySnapshot as any;
  const contactSnapshot = (purchaseReturn as any).contactSnapshot;

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
            Purchase Return Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">
                    Purchase Return - {purchaseReturn.returnNumber}
                  </span>
                </span>
                <Badge
                  variant={getStatusVariant(purchaseReturn.status) as any}
                  appearance="outline"
                  className="capitalize text-xs gap-1"
                >
                  <StatusIcon className="h-3 w-3" />
                  {purchaseReturn.status}
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
                      {formatLongDate(purchaseReturn.returnDate)}
                    </div>
                  </div>
                </div>

                {documentRef && (
                  <div className="flex items-start gap-3">
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        Purchase Reference
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

              {purchaseReturn.reason && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                  <div className="text-xs font-medium text-orange-900 dark:text-orange-100 mb-1">
                    Reason:
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {purchaseReturn.reason}
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
                      <th className="text-left p-3 font-medium text-sm">Item</th>
                      <th className="text-right p-3 font-medium text-sm">Ordered</th>
                      <th className="text-right p-3 font-medium text-sm">Received</th>
                      <th className="text-right p-3 font-medium text-sm">Prev. Returned</th>
                      <th className="text-right p-3 font-medium text-sm text-red-600">
                        Returned
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseReturn.items?.map((item, index) => {
                      const itemName = item.description || 'Unknown';

                      return (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                          <td className="p-3">
                            <div className="font-medium">{itemName}</div>
                          </td>
                          <td className="p-3 text-right font-medium">
                            {item.orderedQuantity?.toFixed(2) || '-'}
                          </td>
                          <td className="p-3 text-right font-medium text-green-600">
                            {item.receivedQuantity?.toFixed(2) || '-'}
                          </td>
                          <td className="p-3 text-right font-medium text-orange-600">
                            {item.returnedQuantity?.toFixed(2) || '0.00'}
                          </td>
                          <td className="p-3 text-right font-semibold text-red-600">
                            {item.returnQuantity?.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-muted/50">
                      <td colSpan={5} className="p-3 text-right">
                        Total Quantity Returned:
                      </td>
                      <td className="p-3 text-right text-red-600 text-lg">
                        {totalReturnedQty.toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {purchaseReturn.items?.map((item, index) => {
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
                            <div className="text-xs text-muted-foreground mb-0.5">Ordered</div>
                            <div className="font-medium">
                              {item.orderedQuantity?.toFixed(2) || '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Received</div>
                            <div className="font-medium text-green-600">
                              {item.receivedQuantity?.toFixed(2) || '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-0.5">Prev. Returned</div>
                            <div className="font-medium text-orange-600">
                              {item.returnedQuantity?.toFixed(2) || '0.00'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground mb-0.5">
                              Returned
                            </div>
                            <div className="font-bold text-red-600">
                              {item.returnQuantity?.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                <Card className="border-2 bg-muted/50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">Total Quantity Returned</span>
                      <span className="font-bold text-base sm:text-lg text-red-600">
                        {totalReturnedQty.toFixed(2)}
                      </span>
                    </div>
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
                  purchaseReturn={purchaseReturn as any}
                  onViewPurchase={onViewPurchase}
                  onViewDebitNotePdf={onViewDebitNotePdf}
                />
              </CardContent>
            </Card>
          )}

          {purchaseReturn.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {purchaseReturn.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {purchaseReturn.actionHistory && purchaseReturn.actionHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {purchaseReturn.actionHistory.map((action, index) => (
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
                                {' →'}
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
                    {formatDateTime(purchaseReturn.createdAt)}
                  </span>
                </div>
                <div className="wrap-break-word">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="ml-2 font-medium">
                    {formatDateTime(purchaseReturn.updatedAt)}
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