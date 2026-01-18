// app/expenses/return-notes/ReturnNoteViewModal.tsx - UPDATED: Added Connected Documents Card

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
  ShoppingCart,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  FileText,
  Package,
  Receipt,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime, formatLongDate } from "@/utils/formatters/date";
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges";

interface ReturnNote {
  _id: string;
  returnNumber: string;
  returnType: 'salesReturn' | 'purchaseReturn';

  purchaseReference?: string;
  supplierName?: string;

  invoiceReference?: string;
  customerName?: string;

  items: Array<{
    materialName?: string;
    productName?: string;
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
    invoiceId?: any;
    debitNoteId?: any;
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

interface ReturnNoteViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnNote: ReturnNote | null;
  onViewPurchase?: (purchase: any) => void;
  onViewInvoicePdf?: (invoice: any) => void;
  onViewDebitNotePdf?: (debitNote: any) => void;
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

const getReturnTypeVariant = (type: string) => {
  switch (type) {
    case 'purchaseReturn': return 'warning';
    case 'salesReturn': return 'primary';
    default: return 'secondary';
  }
};

const getReturnTypeIcon = (type: string) => {
  switch (type) {
    case 'purchaseReturn': return Package;
    case 'salesReturn': return ShoppingCart;
    default: return FileText;
  }
};

const getReturnTypeLabel = (type: string) => {
  switch (type) {
    case 'purchaseReturn': return 'Purchase Return';
    case 'salesReturn': return 'Sales Return';
    default: return type;
  }
};

const getCreatorUsername = (returnNote: any): string | null => {
  const createAction = returnNote?.actionHistory?.find(
    (action: any) => action.action === "Created"
  );
  return createAction?.username || null;
};

export function ReturnNoteViewModal({
  isOpen,
  onClose,
  returnNote,
  onViewPurchase,
  onViewInvoicePdf,
  onViewDebitNotePdf,
  onViewCreditNotePdf,
}: ReturnNoteViewModalProps) {
  if (!isOpen || !returnNote) return null;

  const creatorUsername = getCreatorUsername(returnNote);
  const totalItemsCount = returnNote.items?.length || 0;
  const totalReturnedQty = returnNote.items?.reduce(
    (sum, item) => sum + (item.returnQuantity || 0),
    0
  ) || 0;

  const StatusIcon = getStatusIcon(returnNote.status);
  const TypeIcon = getReturnTypeIcon(returnNote.returnType);

  // ✅ CLEANED: Only supplier or customer, no payee
  const entityName = returnNote.supplierName || returnNote.customerName;

  // Get document reference from populated connectedDocuments
  const purchase = typeof returnNote.connectedDocuments?.purchaseId === 'object'
    ? returnNote.connectedDocuments.purchaseId
    : null;
  const invoice = typeof returnNote.connectedDocuments?.invoiceId === 'object'
    ? returnNote.connectedDocuments.invoiceId
    : null;

  const documentRef = purchase?.referenceNumber || invoice?.invoiceNumber;
  const entityLabel = returnNote.returnType === 'purchaseReturn' ? 'Supplier' : 'Customer';
  const documentLabel = returnNote.returnType === 'purchaseReturn' ? 'Purchase Reference' : 'Invoice Reference';

  // Check if there are any connected documents to show
  const hasConnectedDocuments = 
    (returnNote.connectedDocuments?.purchaseId && typeof returnNote.connectedDocuments.purchaseId === 'object') ||
    (returnNote.connectedDocuments?.invoiceId && typeof returnNote.connectedDocuments.invoiceId === 'object') ||
    (returnNote.connectedDocuments?.debitNoteId && typeof returnNote.connectedDocuments.debitNoteId === 'object') ||
    (returnNote.connectedDocuments?.creditNoteId && typeof returnNote.connectedDocuments.creditNoteId === 'object');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-4xl max-h-[95vh] overflow-y-auto sidebar-scroll p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <PackageX className="h-4 w-4 sm:h-5 sm:w-5" />
            Return Note Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Header Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <FileText className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">
                    Return Note - {returnNote.returnNumber}
                  </span>
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant={getReturnTypeVariant(returnNote.returnType) as any}
                    appearance="outline"
                    className="capitalize text-xs gap-1"
                  >
                    <TypeIcon className="h-3 w-3" />
                    {getReturnTypeLabel(returnNote.returnType)}
                  </Badge>
                  <Badge
                    variant={getStatusVariant(returnNote.status) as any}
                    appearance="outline"
                    className="capitalize text-xs gap-1"
                  >
                    <StatusIcon className="h-3 w-3" />
                    {returnNote.status}
                  </Badge>
                </div>
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
                    <div className="font-medium text-xs sm:text-sm break-words">
                      {formatLongDate(returnNote.returnDate)}
                    </div>
                  </div>
                </div>

                {documentRef && (
                  <div className="flex items-start gap-3">
                    {returnNote.returnType === 'purchaseReturn' ? (
                      <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    ) : (
                      <Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {documentLabel}
                      </div>
                      <div className="font-medium text-xs sm:text-sm font-mono break-words">
                        {documentRef}
                      </div>
                    </div>
                  </div>
                )}

                {entityName && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground">
                        {entityLabel}
                      </div>
                      <div className="font-medium text-xs sm:text-sm break-words">
                        {entityName}
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
                      <div className="font-medium text-xs sm:text-sm break-words">
                        @{creatorUsername}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <PackageX className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Total Items
                    </div>
                    <div className="font-medium text-xs sm:text-sm">
                      {totalItemsCount} item(s)
                    </div>
                  </div>
                </div>

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

              {/* Reason moved here to match Debit Note style */}
              {returnNote.reason && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-900">
                  <div className="text-xs font-medium text-orange-900 dark:text-orange-100 mb-1">
                    Reason:
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {returnNote.reason}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Return Items */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Return Items</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-sm">#</th>
                      <th className="text-left p-3 font-medium text-sm">
                        {returnNote.returnType === 'purchaseReturn' ? 'Material' : 'Product'}
                      </th>
                      {returnNote.returnType === 'purchaseReturn' && (
                        <>
                          <th className="text-right p-3 font-medium text-sm">Ordered</th>
                          <th className="text-right p-3 font-medium text-sm">Received</th>
                          <th className="text-right p-3 font-medium text-sm">Prev. Returned</th>
                        </>
                      )}
                      {returnNote.returnType === 'salesReturn' && (
                        <>
                          <th className="text-right p-3 font-medium text-sm">Rate</th>
                          <th className="text-right p-3 font-medium text-sm">Total</th>
                        </>
                      )}
                      <th className="text-right p-3 font-medium text-sm text-red-600">
                        Returned
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnNote.items?.map((item, index) => {
                      const itemName = item.materialName || item.productName || item.description || 'Unknown';

                      return (
                        <tr key={index} className="border-b hover:bg-muted/50">
                          <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                          <td className="p-3">
                            <div className="font-medium">{itemName}</div>
                          </td>
                          {returnNote.returnType === 'purchaseReturn' && (
                            <>
                              <td className="p-3 text-right font-medium">
                                {item.orderedQuantity?.toFixed(2) || '-'}
                              </td>
                              <td className="p-3 text-right font-medium text-green-600">
                                {item.receivedQuantity?.toFixed(2) || '-'}
                              </td>
                              <td className="p-3 text-right font-medium text-orange-600">
                                {item.returnedQuantity?.toFixed(2) || '0.00'}
                              </td>
                            </>
                          )}
                          {returnNote.returnType === 'salesReturn' && (
                            <>
                              <td className="p-3 text-right font-medium">
                                {item.rate ? formatCurrency(item.rate) : '-'}
                              </td>
                              <td className="p-3 text-right font-medium">
                                {item.total ? formatCurrency(item.total) : '-'}
                              </td>
                            </>
                          )}
                          <td className="p-3 text-right font-semibold text-red-600">
                            {item.returnQuantity?.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-muted/50">
                      <td colSpan={returnNote.returnType === 'purchaseReturn' ? 5 :
                        returnNote.returnType === 'salesReturn' ? 4 : 2}
                        className="p-3 text-right">
                        Total Quantity Returned:
                      </td>
                      <td className="p-3 text-right text-red-600 text-lg">
                        {totalReturnedQty.toFixed(2)}
                      </td>
                    </tr>
                    {returnNote.returnType === 'salesReturn' && returnNote.grandTotal && (
                      <tr className="border-t font-bold bg-muted/50">
                        <td colSpan={4} className="p-3 text-right">
                          Total Amount:
                        </td>
                        <td className="p-3 text-right text-red-600 text-lg">
                          {formatCurrency(returnNote.grandTotal)}
                        </td>
                      </tr>
                    )}
                  </tfoot>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {returnNote.items?.map((item, index) => {
                  const itemName = item.materialName || item.productName || item.description || 'Unknown';

                  return (
                    <Card key={index} className="border">
                      <CardContent className="p-3 sm:p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs text-muted-foreground mb-1">
                              Item #{index + 1}
                            </div>
                            <div className="font-medium text-sm break-words">
                              {itemName}
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t text-sm">
                          {returnNote.returnType === 'purchaseReturn' && (
                            <>
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
                            </>
                          )}
                          {returnNote.returnType === 'salesReturn' && (
                            <>
                              <div>
                                <div className="text-xs text-muted-foreground mb-0.5">Rate</div>
                                <div className="font-medium">
                                  {item.rate ? formatCurrency(item.rate) : '-'}
                                </div>
                              </div>
                              <div>
                                <div className="text-xs text-muted-foreground mb-0.5">Total</div>
                                <div className="font-medium">
                                  {item.total ? formatCurrency(item.total) : '-'}
                                </div>
                              </div>
                            </>
                          )}
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

                {/* Mobile Totals Summary */}
                <Card className="border-2 bg-muted/50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-sm">Total Quantity Returned</span>
                      <span className="font-bold text-base sm:text-lg text-red-600">
                        {totalReturnedQty.toFixed(2)}
                      </span>
                    </div>
                    {returnNote.returnType === 'salesReturn' && returnNote.grandTotal && (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t">
                        <span className="font-bold text-sm">Total Amount</span>
                        <span className="font-bold text-base sm:text-lg text-red-600">
                          {formatCurrency(returnNote.grandTotal)}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
          
          {/* Connected Documents - NEW SECTION */}
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
                  returnNote={returnNote as any}
                  onViewPurchase={onViewPurchase}
                  onViewInvoicePdf={onViewInvoicePdf}
                  onViewDebitNotePdf={onViewDebitNotePdf}
                  onViewCreditNotePdf={onViewCreditNotePdf}
                />
              </CardContent>
            </Card>
          )}

          {/* Additional Notes (Moved from Reason card) */}
          {returnNote.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Additional Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {returnNote.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Audit Trail */}
          {returnNote.actionHistory && returnNote.actionHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {returnNote.actionHistory.map((action, index) => (
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
                            {action.changes.map((change, idx) => (
                              <div
                                key={idx}
                                className="text-xs text-muted-foreground break-words"
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

          {/* System Information */}
          <Card className="bg-muted/50">
            <CardContent className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div className="break-words">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="ml-2 font-medium">
                    {formatDateTime(returnNote.createdAt)}
                  </span>
                </div>
                <div className="break-words">
                  <span className="text-muted-foreground">Last Updated:</span>
                  <span className="ml-2 font-medium">
                    {formatDateTime(returnNote.updatedAt)}
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