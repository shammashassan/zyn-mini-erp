// app/sales/sales-returns/ConnectedDocumentsBadges.tsx

"use client";

import { Badge } from "@/components/ui/badge";
import { Receipt, ExternalLink, CreditCard, FileText } from "lucide-react";

interface ConnectedInvoice {
  _id: string;
  invoiceNumber: string;
  status: string;
}

interface ConnectedCreditNote {
  _id: string;
  creditNoteNumber: string;
  status: string;
}

interface ConnectedDocumentsBadgesProps {
  salesReturn: {
    _id: string;
    returnNumber: string;
    connectedDocuments?: {
      invoiceId?: string | ConnectedInvoice;
      creditNoteId?: string | ConnectedCreditNote;
    };
  };
  onViewInvoicePdf?: (invoice: any) => void;
  onViewCreditNotePdf?: (creditNote: any) => void;
}

export function ConnectedDocumentsBadges({
  salesReturn,
  onViewInvoicePdf,
  onViewCreditNotePdf
}: ConnectedDocumentsBadgesProps) {
  const invoiceId = salesReturn.connectedDocuments?.invoiceId;
  const creditNoteId = salesReturn.connectedDocuments?.creditNoteId;

  const invoice = (typeof invoiceId === 'object' && invoiceId !== null)
    ? invoiceId as ConnectedInvoice
    : null;

  const creditNote = (typeof creditNoteId === 'object' && creditNoteId !== null)
    ? creditNoteId as ConnectedCreditNote
    : null;

  const hasInvoice = !!invoice;
  const hasCreditNote = !!creditNote;

  if (!hasInvoice && !hasCreditNote) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        No linked documents
      </div>
    );
  }

  const handleViewInvoice = () => {
    if (invoice && onViewInvoicePdf) {
      onViewInvoicePdf(invoice);
    }
  };

  const handleViewCreditNote = () => {
    if (creditNote && onViewCreditNotePdf) {
      onViewCreditNotePdf(creditNote);
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {invoice && (
        <Badge
          variant="primary"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={(e) => {
            e.stopPropagation();
            handleViewInvoice();
          }}
        >
          <FileText className="h-3 w-3" />
          {invoice.invoiceNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      )}

      {creditNote && creditNote.status === 'approved' && (
        <Badge
          variant="orange"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={(e) => {
            e.stopPropagation();
            handleViewCreditNote();
          }}
        >
          <FileText className="h-3 w-3" />
          {creditNote.creditNoteNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      )}
    </div>
  );
}