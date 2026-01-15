// app/expenses/return-notes/ReturnNoteViewModal.tsx - UPDATED: No Commercial Fields

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
} from "lucide-react";

const formatDateTime = (date: string | Date) => {
  return new Date(date).toLocaleString();
};

const formatLongDate = (date: string | Date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

interface ReturnNote {
  _id: string;
  returnNumber: string;
  purchaseId: any;
  purchaseReference: string;
  supplierName: string;
  items: Array<{
    materialName: string;
    orderedQuantity: number;
    receivedQuantity: number;
    returnedQuantity: number;
    returnQuantity: number;
  }>;
  returnDate: string;
  reason: string;
  notes?: string;
  status: "pending" | "approved" | "cancelled";
  connectedDocuments?: {
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

interface ReturnNoteViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  returnNote: ReturnNote | null;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "cancelled":
      return "destructive";
    default:
      return "gray";
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "approved":
      return CheckCircle;
    case "pending":
      return Clock;
    case "cancelled":
      return XCircle;
    default:
      return AlertCircle;
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
}: ReturnNoteViewModalProps) {
  if (!isOpen || !returnNote) return null;

  const creatorUsername = getCreatorUsername(returnNote);
  const totalItemsCount = returnNote.items?.length || 0;
  const totalReturnedQty = returnNote.items?.reduce(
    (sum, item) => sum + (item.returnQuantity || 0),
    0
  ) || 0;

  const StatusIcon = getStatusIcon(returnNote.status);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
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
                <Badge
                  variant={getStatusVariant(returnNote.status) as any}
                  appearance="outline"
                  className="capitalize text-xs gap-1"
                >
                  <StatusIcon className="h-3 w-3" />
                  {returnNote.status}
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
                    <div className="font-medium text-xs sm:text-sm break-words">
                      {formatLongDate(returnNote.returnDate)}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      Purchase Reference
                    </div>
                    <div className="font-medium text-xs sm:text-sm font-mono break-words">
                      {returnNote.purchaseReference}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm text-muted-foreground">Supplier</div>
                    <div className="font-medium text-xs sm:text-sm break-words">
                      {returnNote.supplierName}
                    </div>
                  </div>
                </div>

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
            </CardContent>
          </Card>

          {/* Return Reason */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Return Reason</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    {returnNote.reason}
                  </p>
                </div>
                {returnNote.notes && (
                  <>
                    <div className="text-xs sm:text-sm font-medium text-muted-foreground">
                      Additional Notes:
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">{returnNote.notes}</p>
                    </div>
                  </>
                )}
              </div>
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
                      <th className="text-left p-3 font-medium text-sm">Material</th>
                      <th className="text-right p-3 font-medium text-sm">Ordered</th>
                      <th className="text-right p-3 font-medium text-sm">Received</th>
                      <th className="text-right p-3 font-medium text-sm">Prev. Returned</th>
                      <th className="text-right p-3 font-medium text-sm text-red-600">
                        Returned Now
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {returnNote.items?.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                        <td className="p-3">
                          <div className="font-medium">{item.materialName}</div>
                        </td>
                        <td className="p-3 text-right font-medium">
                          {item.orderedQuantity?.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-medium text-green-600">
                          {item.receivedQuantity?.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-medium text-orange-600">
                          {item.returnedQuantity?.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-semibold text-red-600">
                          {item.returnQuantity?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
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

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {returnNote.items?.map((item, index) => (
                  <Card key={index} className="border">
                    <CardContent className="p-3 sm:p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1">
                            Item #{index + 1}
                          </div>
                          <div className="font-medium text-sm break-words">
                            {item.materialName}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 border-t text-sm">
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">Ordered</div>
                          <div className="font-medium">
                            {item.orderedQuantity?.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">
                            Received
                          </div>
                          <div className="font-medium text-green-600">
                            {item.receivedQuantity?.toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-0.5">
                            Prev. Returned
                          </div>
                          <div className="font-medium text-orange-600">
                            {item.returnedQuantity?.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground mb-0.5">
                            Returned Now
                          </div>
                          <div className="font-bold text-red-600">
                            {item.returnQuantity?.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Mobile Totals Summary */}
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
                                <span className="font-medium">{change.field}:</span>{" "}
                                <span className="line-through">
                                  {String(change.oldValue)}
                                </span>
                                {" → "}
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