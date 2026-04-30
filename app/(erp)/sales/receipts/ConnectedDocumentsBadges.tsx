// app/sales/receipts/ConnectedDocumentsBadges.tsx

"use client";

import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink, Receipt, CreditCard } from "lucide-react";

interface ConnectedInvoice {
    _id: string;
    invoiceNumber: string;
    documentType: string;
}

interface ConnectedCreditNote {
    _id: string;
    creditNoteNumber: string;
    grandTotal: number;
    status: string;
    paymentStatus: string;
}

interface ConnectedDebitNote {
    _id: string;
    debitNoteNumber: string;
    grandTotal: number;
    status: string;
    paymentStatus: string;
}

interface ConnectedDocumentsBadgesProps {
    receipt: {
        _id: string;
        voucherType: "receipt";
        connectedDocuments?: {
            invoiceId?: string | ConnectedInvoice;
            invoiceIds?: (string | ConnectedInvoice)[];
            creditNoteIds?: (string | ConnectedCreditNote)[];
            debitNoteIds?: (string | ConnectedDebitNote)[];
        };
    };
    onViewPdf: (doc: any) => void;
    onViewInvoice?: (invoice: any) => void;
    onViewCreditNote?: (creditNote: any) => void;
    onViewDebitNote?: (debitNote: any) => void;
}

export function ConnectedDocumentsBadges({
    receipt,
    onViewPdf,
    onViewInvoice,
    onViewCreditNote,
    onViewDebitNote
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

    const invoices = getDocuments<ConnectedInvoice>(
        receipt.connectedDocuments?.invoiceId,
        receipt.connectedDocuments?.invoiceIds
    );

    const creditNotes = getDocuments<ConnectedCreditNote>(
        undefined,
        receipt.connectedDocuments?.creditNoteIds
    );

    const debitNotes = getDocuments<ConnectedDebitNote>(
        undefined,
        receipt.connectedDocuments?.debitNoteIds
    );

    const handleInvoiceBadgeClick = (invoice: ConnectedInvoice) => {
        if (onViewInvoice) {
            onViewInvoice(invoice);
        } else {
            onViewPdf({
                ...invoice,
                documentType: 'invoice'
            });
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

    const handleDebitNoteBadgeClick = (debitNote: ConnectedDebitNote) => {
        if (onViewDebitNote) {
            onViewDebitNote(debitNote);
        } else {
            onViewPdf({
                ...debitNote,
                documentType: 'debitNote'
            });
        }
    };

    if (
        invoices.length === 0 &&
        creditNotes.length === 0 &&
        debitNotes.length === 0
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
            {invoices.map((invoice) => (
                <Badge
                    key={invoice._id}
                    variant="primary"
                    appearance="outline"
                    className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
                    onClick={() => handleInvoiceBadgeClick(invoice)}
                >
                    <FileText className="h-3 w-3" />
                    {invoice.invoiceNumber}
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

            {debitNotes.map((debitNote) => (
                <Badge
                    key={debitNote._id}
                    variant="cyan"
                    appearance="outline"
                    className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
                    onClick={() => handleDebitNoteBadgeClick(debitNote)}
                >
                    <FileText className="h-3 w-3" />
                    {debitNote.debitNoteNumber}
                    <ExternalLink className="h-3 w-3 ml-1" />
                </Badge>
            ))}
        </div>
    );
}