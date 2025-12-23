// app/expenses/ExpenseViewModal.tsx - FULLY RESPONSIVE VERSION

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
import type { IExpense } from "@/models/Expense";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime, formatLongDate } from "@/utils/formatters/date";
import {
  Calendar,
  CircleDot,
  CircleUserRound,
  HandCoins,
  User,
  CheckCircle,
  XCircle,
  Clock,
  Wallet,
  CreditCard,
  FileText
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { ConnectedPaymentsBadges } from "./ConnectedPaymentsBadges";

interface ExpenseViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: IExpense | any | null;
  onViewPdf?: (doc: any) => void;
}

const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    'Office Supplies': 'blue',
    'Travel': 'purple',
    'Marketing': 'pink',
    'Utilities': 'orange',
    'Software': 'indigo',
    'Equipment': 'green',
    'Meals': 'yellow',
    'Professional Services': 'cyan',
    'Rent': 'red',
    'Salary': 'warning',
    'Insurance': 'teal',
    'Entertainment': 'violet',
    'Miscellaneous': 'gray'
  };
  return colorMap[category] || 'gray';
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'success';
    case 'cancelled': return 'destructive';
    case 'pending': return 'warning';
    default: return 'secondary';
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'Paid': return 'success';
    case 'Partially Paid': return 'primary';
    case 'Pending': return 'warning';
    default: return 'secondary';
  }
};

const getCreatorUsername = (expense: IExpense): string | null => {
  if (expense.actionHistory && expense.actionHistory.length > 0) {
    const createAction = expense.actionHistory.find((action: any) =>
      action.action === 'Created'
    );
    if (createAction) {
      return createAction.username;
    }
  }
  return null;
};

export function ExpenseViewModal({ isOpen, onClose, expense: initialExpense, onViewPdf }: ExpenseViewModalProps) {
  const [expense, setExpense] = useState<any>(initialExpense);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !initialExpense) {
      setExpense(initialExpense);
      return;
    }

    if (initialExpense._id && !initialExpense.description) {
      const fetchFullDetails = async () => {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/expenses/${initialExpense._id}`);
          if (res.ok) {
            const fullData = await res.json();
            setExpense(fullData);
          } else {
            toast.error("Failed to load full expense details");
          }
        } catch (error) {
          console.error("Error fetching expense details:", error);
          toast.error("Error loading expense details");
        } finally {
          setIsLoading(false);
        }
      };

      fetchFullDetails();
    } else {
      setExpense(initialExpense);
    }
  }, [isOpen, initialExpense]);

  if (!isOpen) return null;

  const currentData = expense || initialExpense || {};
  const creatorUsername = getCreatorUsername(currentData);
  const categoryColor = getCategoryColor(currentData.category);
  const statusColor = getStatusColor(currentData.status);
  const paymentStatusColor = getPaymentStatusColor(currentData.paymentStatus);

  const amount = currentData.amount || 0;
  const paidAmount = currentData.paidAmount || 0;
  const remainingAmount = currentData.remainingAmount || (amount - paidAmount);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-4xl max-h-[95vh] overflow-y-auto sidebar-scroll p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <HandCoins className="h-4 w-4 sm:h-5 sm:w-5" />
            Expense Details
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner className="size-10" />
          </div>
        ) : !currentData.referenceNumber ? (
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
                    <span className="text-xs sm:text-sm break-all">Expense Record - {currentData.referenceNumber}</span>
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={currentData.type === 'single' ? 'primary' : 'warning'}
                      appearance="outline"
                      className="capitalize text-xs"
                    >
                      {currentData.type === 'single' ? 'Single' : 'Period'}
                    </Badge>
                    <Badge
                      variant={categoryColor as any}
                      appearance="outline"
                      className="text-xs"
                    >
                      {currentData.category}
                    </Badge>
                    <Badge
                      variant={statusColor as any}
                      appearance="outline"
                      className="capitalize text-xs"
                    >
                      {currentData.status}
                    </Badge>
                    <Badge
                      variant={paymentStatusColor as any}
                      appearance="outline"
                      className="capitalize text-xs"
                    >
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
                      <div className="text-xs sm:text-sm text-muted-foreground">Expense Date</div>
                      <div className="font-medium text-xs sm:text-sm break-words">{formatLongDate(currentData.date)}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <HandCoins className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Amount</div>
                      <div className="text-lg sm:text-xl font-bold text-red-600">
                        {formatCurrency(amount)}
                      </div>
                    </div>
                  </div>

                  {(currentData.payeeId || currentData.supplierId || currentData.vendor) && (
                    <div className="flex items-start gap-3">
                      <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {currentData.payeeId && typeof currentData.payeeId === 'object'
                            ? 'Payee'
                            : currentData.supplierId && typeof currentData.supplierId === 'object'
                              ? 'Supplier'
                              : 'Vendor'}
                        </div>
                        <div className="font-medium text-xs sm:text-sm break-words">
                          {currentData.payeeId && typeof currentData.payeeId === 'object'
                            ? currentData.payeeId.name
                            : currentData.supplierId && typeof currentData.supplierId === 'object'
                              ? currentData.supplierId.name
                              : currentData.vendor ?? 'N/A'}
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
                    {currentData.type === "single" ? (
                      <CircleDot className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    ) : (
                      <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Expense Type</div>
                      <div className="font-medium text-xs sm:text-sm capitalize">
                        {currentData.type === 'single' ? 'One-time' : 'Recurring'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    {currentData.status === 'approved' ? (
                      <CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 mt-0.5 shrink-0" />
                    ) : currentData.status === 'cancelled' ? (
                      <XCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mt-0.5 shrink-0" />
                    ) : (
                      <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Status</div>
                      <div className="font-medium text-xs sm:text-sm capitalize">{currentData.status}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Description Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {currentData.description || "No description provided."}
                </p>
                {currentData.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="text-xs sm:text-sm font-semibold mb-1">Additional Notes</div>
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap text-muted-foreground break-words">
                      {currentData.notes}
                    </p>
                  </div>
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
                      {formatCurrency(amount)}
                    </div>
                  </div>

                  <div className="p-3 sm:p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Paid Amount</div>
                    <div className="text-xl sm:text-2xl font-bold text-green-600">
                      {formatCurrency(paidAmount)}
                    </div>
                    {currentData.connectedDocuments?.paymentIds && currentData.connectedDocuments.paymentIds.length > 0 && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {currentData.connectedDocuments.paymentIds.length} payment(s)
                      </div>
                    )}
                  </div>

                  <div className="p-3 sm:p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900">
                    <div className="text-xs sm:text-sm text-muted-foreground mb-1">Remaining Amount</div>
                    <div className="text-xl sm:text-2xl font-bold text-orange-600">
                      {formatCurrency(remainingAmount)}
                    </div>
                  </div>
                </div>

                {/* Payment Progress Bar */}
                {(paidAmount > 0) && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-muted-foreground">Payment Progress</span>
                      <span className="font-medium">
                        {((paidAmount / amount) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-600 transition-all"
                        style={{ width: `${Math.min((paidAmount / amount) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connected Payment Vouchers */}
            {currentData.connectedDocuments?.paymentIds && currentData.connectedDocuments.paymentIds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                    <Wallet className="h-3 w-3 sm:h-4 sm:w-4" />
                    Connected Payment Vouchers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {onViewPdf ? (
                    <ConnectedPaymentsBadges
                      expense={currentData as any}
                      onViewPdf={onViewPdf}
                    />
                  ) : (
                    <span className="text-xs sm:text-sm text-muted-foreground">—</span>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Activity History */}
            {currentData.actionHistory && currentData.actionHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm sm:text-base">Activity History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {currentData.actionHistory.map((activity: any, index: number) => (
                      <div key={index} className="flex items-start gap-3 text-xs sm:text-sm p-2 sm:p-3 rounded-lg bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium break-words">{activity.action}</div>
                          {activity.username && (
                            <div className="text-xs text-muted-foreground">
                              by @{activity.username}
                            </div>
                          )}
                          {activity.changes && activity.changes.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {activity.changes.map((change: any, idx: number) => (
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
                          {formatDateTime(activity.timestamp)}
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