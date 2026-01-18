// app/documents/credit-notes/ConnectedDocumentsBadges.tsx - UPDATED: Support Return Note

"use client";

import { Badge } from "@/components/ui/badge";
import { Receipt, ExternalLink, RotateCcw } from "lucide-react";

interface ConnectedPayment {
  _id: string;
  invoiceNumber: string;
  grandTotal: number;
  voucherType: string;
}

interface ConnectedReturnNote {
  _id: string;
  returnNumber: string;
  status: string;
}

interface ConnectedDocumentsBadgesProps {
  creditNote: {
    _id: string;
    creditNoteNumber: string;
    connectedDocuments?: {
      returnNoteId?: string | ConnectedReturnNote;
      paymentIds?: (string | ConnectedPayment)[];
    };
  };
  onViewPaymentPdf?: (payment: any) => void;
  onViewReturnNotePdf?: (returnNote: any) => void;
}

export function ConnectedDocumentsBadges({ 
  creditNote, 
  onViewPaymentPdf,
  onViewReturnNotePdf 
}: ConnectedDocumentsBadgesProps) {
  const paymentIds = creditNote.connectedDocuments?.paymentIds || [];
  const returnNoteId = creditNote.connectedDocuments?.returnNoteId;

  // Filter out string IDs (not populated) and get only populated objects
  const payments = paymentIds.filter(
    (payment): payment is ConnectedPayment =>
      typeof payment === 'object' && payment !== null
  );

  // Check if return note is populated
  const returnNote = (typeof returnNoteId === 'object' && returnNoteId !== null)
    ? returnNoteId as ConnectedReturnNote
    : null;

  const hasPayments = payments.length > 0;
  const hasReturnNote = !!returnNote;

  if (!hasPayments && !hasReturnNote) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        No linked documents
      </div>
    );
  }

  const handleViewPayment = (payment: ConnectedPayment) => {
    if (onViewPaymentPdf) {
      onViewPaymentPdf({
        ...payment,
        voucherType: 'payment',
        documentType: 'payment'
      });
    }
  };

  const handleViewReturnNote = (rn: ConnectedReturnNote) => {
    if (onViewReturnNotePdf) {
      onViewReturnNotePdf(rn);
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {/* Payment Vouchers */}
      {payments.map((payment) => (
        <Badge
          key={payment._id}
          variant="success"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={(e) => {
            e.stopPropagation();
            handleViewPayment(payment);
          }}
        >
          <Receipt className="h-3 w-3" />
          {payment.invoiceNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      ))}

      {/* Return Note */}
      {returnNote && (
        <Badge
          variant="destructive"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={(e) => {
            e.stopPropagation();
            handleViewReturnNote(returnNote);
          }}
        >
          <RotateCcw className="h-3 w-3" />
          {returnNote.returnNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      )}
    </div>
  );
}