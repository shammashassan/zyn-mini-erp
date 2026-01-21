// app/procurement/payments/PaymentViewModal.tsx

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
    User,
    CircleUserRound,
    DollarSign,
    CreditCard,
    FileText as FileTextIcon,
    Wallet,
    Landmark,
} from "lucide-react";
import type { Payment } from "./columns";
import { ConnectedDocumentsBadges } from "./ConnectedDocumentsBadges";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime, formatLongDate } from "@/utils/formatters/date";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

interface PaymentViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: Payment | any | null;
    onViewPdf?: (doc: any) => void;
    onViewPurchase?: (purchase: any) => void;
    onViewExpense?: (expense: any) => void;
    onViewCreditNote?: (creditNote: any) => void;
}

const getPaymentMethodIcon = (method: string) => {
    const normalizedMethod = method?.toLowerCase() || '';
    if (normalizedMethod.includes('cash')) return DollarSign;
    if (normalizedMethod.includes('bank')) return Landmark;
    if (normalizedMethod.includes('cheque') || normalizedMethod.includes('check')) return FileTextIcon;
    if (normalizedMethod.includes('card')) return CreditCard;
    return Wallet;
};

const getCreatorUsername = (payment: any): string | null => {
    const createAction = payment?.actionHistory?.find(
        (action: any) => action.action === 'Created'
    );
    return createAction?.username || null;
};

const getPartyInfo = (payment: any) => {
    if (payment.customerName) {
        return { name: payment.customerName, type: 'Customer', icon: User };
    }
    if (payment.supplierName) {
        return { name: payment.supplierName, type: 'Supplier', icon: User };
    }
    if (payment.payeeName) {
        return { name: payment.payeeName, type: 'Payee', icon: User };
    }
    if (payment.vendorName) {
        return { name: payment.vendorName, type: 'Vendor', icon: User };
    }
    return null;
};

export function PaymentViewModal({
    isOpen,
    onClose,
    payment: initialPayment,
    onViewPdf,
    onViewPurchase,
    onViewExpense,
    onViewCreditNote
}: PaymentViewModalProps) {
    const [payment, setPayment] = useState<any>(initialPayment);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !initialPayment) {
            setPayment(initialPayment);
            return;
        }

        const isPartialData = initialPayment._id && (!initialPayment.items || !Array.isArray(initialPayment.items));

        if (isPartialData) {
            const fetchFullDetails = async () => {
                setIsLoading(true);
                try {
                    const res = await fetch(`/api/vouchers/${initialPayment._id}`);
                    if (res.ok) {
                        const fullData = await res.json();
                        setPayment(fullData);
                    } else {
                        toast.error("Failed to load full payment details");
                    }
                } catch (error) {
                    console.error("Error fetching payment details:", error);
                    toast.error("Error loading payment details");
                } finally {
                    setIsLoading(false);
                }
            };

            fetchFullDetails();
        } else {
            setPayment(initialPayment);
        }
    }, [isOpen, initialPayment]);

    if (!isOpen) return null;

    const currentData = payment || initialPayment || {};

    const creatorUsername = getCreatorUsername(currentData);
    const partyInfo = getPartyInfo(currentData);

    const PaymentMethodIcon = getPaymentMethodIcon(currentData.paymentMethod);

    // Check for existence of connected documents
    const hasConnectedDocuments =
        currentData.connectedDocuments?.purchaseIds?.length > 0 ||
        currentData.connectedDocuments?.purchaseId ||
        currentData.connectedDocuments?.expenseIds?.length > 0 ||
        currentData.connectedDocuments?.creditNoteIds?.length > 0;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-4xl max-h-[95vh] overflow-y-auto sidebar-scroll p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
                        <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                        Payment Details
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
                                        <span className="text-xs sm:text-sm">Payment - {currentData.invoiceNumber}</span>
                                    </span>
                                    <Badge
                                        variant="primary"
                                        appearance="outline"
                                        className="capitalize text-xs gap-1"
                                    >
                                        <Wallet className="h-3 w-3" />
                                        Payment
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 sm:space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                                    <div className="flex items-start gap-3">
                                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                                        <div className="min-w-0">
                                            <div className="text-xs sm:text-sm text-muted-foreground">Payment Date</div>
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

                        {/* Connected Documents - Separate Card */}
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
                                        payment={currentData}
                                        onViewPdf={onViewPdf || (() => { })}
                                        onViewPurchase={onViewPurchase}
                                        onViewExpense={onViewExpense}
                                        onViewCreditNote={onViewCreditNote}
                                    />
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
