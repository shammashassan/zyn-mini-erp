// app/procurement/payments/ConnectedDocumentsBadges.tsx

"use client";

import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ExternalLink, Banknote, Receipt, FileText } from "lucide-react";

interface ConnectedPurchase {
    _id: string;
    referenceNumber: string;
    totalAmount: number;
    date: Date;
    status: string;
    paymentStatus: string;
    items: any[];
    connectedDocuments?: any;
    paidAmount?: number;
    remainingAmount?: number;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: string | null;
    updatedBy?: string | null;
    actionHistory?: any[];
}

interface ConnectedExpense {
    _id: string;
    referenceNumber: string;
    description: string;
    amount: number;
    category: string;
    type: 'single' | 'period';
    date: Date;
    status: 'pending' | 'approved' | 'cancelled';
    paymentStatus: 'Pending' | 'Paid' | 'Partially Paid';
    vendor?: string;
    connectedDocuments?: any;
}

interface ConnectedCreditNote {
    _id: string;
    creditNoteNumber: string;
    grandTotal: number;
    status: string;
    paymentStatus: string;
}

interface ConnectedDocumentsBadgesProps {
    payment: {
        _id: string;
        voucherType: "payment";
        connectedDocuments?: {
            purchaseId?: string | ConnectedPurchase;
            purchaseIds?: (string | ConnectedPurchase)[];
            expenseIds?: (string | ConnectedExpense)[];
            creditNoteIds?: (string | ConnectedCreditNote)[];
        };
    };
    onViewPdf: (doc: any) => void;
    onViewPurchase?: (purchase: any) => void;
    onViewExpense?: (expense: any) => void;
    onViewCreditNote?: (creditNote: any) => void;
}

export function ConnectedDocumentsBadges({
    payment,
    onViewPdf,
    onViewPurchase,
    onViewExpense,
    onViewCreditNote
}: ConnectedDocumentsBadgesProps) {

    const getDocuments = <T extends { _id: string }>(
        singular?: string | T,
        plural?: (string | T)[]
    ): T[] => {
        const docs: T[] = [];
        if (typeof singular === 'object' && singular !== null) {
            docs.push(singular);
        }
        if (Array.isArray(plural)) {
            plural.forEach(doc => {
                if (typeof doc === 'object' && doc !== null) {
                    docs.push(doc);
                }
            });
        }
        return docs;
    };

    const purchases = getDocuments<ConnectedPurchase>(
        payment.connectedDocuments?.purchaseId,
        payment.connectedDocuments?.purchaseIds
    );

    const expenses = getDocuments<ConnectedExpense>(
        undefined,
        payment.connectedDocuments?.expenseIds
    );

    const creditNotes = getDocuments<ConnectedCreditNote>(
        undefined,
        payment.connectedDocuments?.creditNoteIds
    );

    const handlePurchaseBadgeClick = (purchase: ConnectedPurchase) => {
        if (onViewPurchase) {
            onViewPurchase(purchase);
        }
    };

    const handleExpenseBadgeClick = (expense: ConnectedExpense) => {
        if (onViewExpense) {
            onViewExpense(expense);
        }
    };

    const handleCreditNoteBadgeClick = (creditNote: ConnectedCreditNote) => {
        if (onViewCreditNote) {
            onViewCreditNote(creditNote);
        } else {
            onViewPdf({
                ...creditNote,
                documentType: 'creditNote'
            });
        }
    };

    if (
        purchases.length === 0 &&
        expenses.length === 0 &&
        creditNotes.length === 0
    ) {
        return (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                No linked documents
            </div>
        );
    }

    return (
        <div className="flex flex-wrap gap-1">
            {purchases.map((purchase) => (
                <Badge
                    key={purchase._id}
                    variant="warning"
                    appearance="outline"
                    className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
                    onClick={() => handlePurchaseBadgeClick(purchase)}
                >
                    <ShoppingCart className="h-3 w-3" />
                    {purchase.referenceNumber}
                    <ExternalLink className="h-3 w-3 ml-1" />
                </Badge>
            ))}

            {expenses.map((expense) => (
                <Badge
                    key={expense._id}
                    variant="info"
                    appearance="outline"
                    className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
                    onClick={() => handleExpenseBadgeClick(expense)}
                >
                    <Banknote className="h-3 w-3" />
                    {expense.referenceNumber}
                    <ExternalLink className="h-3 w-3 ml-1" />
                </Badge>
            ))}

            {creditNotes.map((creditNote) => (
                <Badge
                    key={creditNote._id}
                    variant="orange"
                    appearance="outline"
                    className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
                    onClick={() => handleCreditNoteBadgeClick(creditNote)}
                >
                    <FileText className="h-3 w-3" />
                    {creditNote.creditNoteNumber}
                    <ExternalLink className="h-3 w-3 ml-1" />
                </Badge>
            ))}
        </div>
    );
}