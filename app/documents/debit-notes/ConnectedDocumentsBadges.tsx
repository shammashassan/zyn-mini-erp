// app/documents/debit-notes/ConnectedDocumentsBadges.tsx

"use client";

import { Badge } from "@/components/ui/badge";
import { Receipt, ExternalLink, RotateCcw } from "lucide-react";

interface ConnectedReceipt {
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
  debitNote: {
    _id: string;
    debitNoteNumber: string;
    connectedDocuments?: {
      returnNoteId?: string | ConnectedReturnNote;
      receiptIds?: (string | ConnectedReceipt)[];
    };
  };
  onViewReceiptPdf?: (receipt: any) => void;
  onViewReturnNotePdf?: (returnNote: any) => void;
}

export function ConnectedDocumentsBadges({ 
  debitNote, 
  onViewReceiptPdf,
  onViewReturnNotePdf 
}: ConnectedDocumentsBadgesProps) {
  const receiptIds = debitNote.connectedDocuments?.receiptIds || [];
  const returnNoteId = debitNote.connectedDocuments?.returnNoteId;

  // Filter out string IDs (not populated) and get only populated objects
  const receipts = receiptIds.filter(
    (receipt): receipt is ConnectedReceipt =>
      typeof receipt === 'object' && receipt !== null
  );

  // Check if return note is populated
  const returnNote = (typeof returnNoteId === 'object' && returnNoteId !== null)
    ? returnNoteId as ConnectedReturnNote
    : null;

  const hasReceipts = receipts.length > 0;
  const hasReturnNote = !!returnNote;

  if (!hasReceipts && !hasReturnNote) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        No linked documents
      </div>
    );
  }

  const handleViewReceipt = (receipt: ConnectedReceipt) => {
    if (onViewReceiptPdf) {
      onViewReceiptPdf({
        ...receipt,
        voucherType: 'receipt',
        documentType: 'receipt'
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
      {/* Receipt Vouchers */}
      {receipts.map((receipt) => (
        <Badge
          key={receipt._id}
          variant="success"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={(e) => {
            e.stopPropagation();
            handleViewReceipt(receipt);
          }}
        >
          <Receipt className="h-3 w-3" />
          {receipt.invoiceNumber}
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