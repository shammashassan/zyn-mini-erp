// app/procurement/purchases/ConnectedDocumentsBadges.tsx - UPDATED: Only show approved return notes

"use client";

import { Badge } from "@/components/ui/badge";
import { Wallet, ExternalLink, PackageX, RotateCcw, Ticket } from "lucide-react";

interface ConnectedPayment {
  _id: string;
  invoiceNumber: string;
  grandTotal: number;
  documentType: string;
}

interface ConnectedReturnNote {
  _id: string;
  returnNumber: string;
  status: string;
}

interface ConnectedDocumentsBadgesProps {
  purchase: {
    _id: string;
    referenceNumber: string;
    connectedDocuments?: {
      paymentIds?: (string | ConnectedPayment)[];
      returnNoteIds?: (string | ConnectedReturnNote)[];
    };
  };
  onViewPdf: (payment: any) => void;
  onViewReturnNotePdf: (returnNote: any) => void;
}

export function ConnectedDocumentsBadges({ 
  purchase, 
  onViewPdf,
  onViewReturnNotePdf 
}: ConnectedDocumentsBadgesProps) {
  const paymentIds = purchase.connectedDocuments?.paymentIds || [];
  const returnNoteIds = purchase.connectedDocuments?.returnNoteIds || [];

  // Filter out string IDs (not populated) and get only populated objects
  const payments = paymentIds.filter(
    (payment): payment is ConnectedPayment =>
      typeof payment === 'object' && payment !== null
  );

  const returnNotes = returnNoteIds.filter(
    (returnNote): returnNote is ConnectedReturnNote =>
      typeof returnNote === 'object' && returnNote !== null
  );

  // ✅ NEW: Only show approved return notes
  const approvedReturnNotes = returnNotes.filter(rn => rn.status === 'approved');

  const hasPayments = payments.length > 0;
  const hasReturnNotes = approvedReturnNotes.length > 0;

  if (!hasPayments && !hasReturnNotes) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        No linked documents
      </div>
    );
  }

  const handleViewPayment = (payment: ConnectedPayment) => {
    onViewPdf({
      ...payment,
      voucherType: 'payment',
      documentType: 'payment'
    });
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
          onClick={() => handleViewPayment(payment)}
        >
          <Ticket className="h-3 w-3" />
          {payment.invoiceNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      ))}

      {/* Return Notes - Only Approved */}
      {approvedReturnNotes.map((returnNote) => (
        <Badge
          key={returnNote._id}
          variant="destructive"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={() => onViewReturnNotePdf(returnNote)}
        >
          <RotateCcw className="h-3 w-3" />
          {returnNote.returnNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      ))}
    </div>
  );
}