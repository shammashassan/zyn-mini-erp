// app/sales/invoices/ConnectedDocumentsBadges.tsx

"use client";

import { Badge } from "@/components/ui/badge";
import { Receipt, ExternalLink, FileText, Truck, RotateCcw, Ticket, FileClock } from "lucide-react";

interface ConnectedDocument {
  _id: string;
  invoiceNumber?: string;
  returnNumber?: string;
  documentType?: string;
  voucherType?: string;
  returnType?: 'salesReturn' | 'purchaseReturn';
}

interface ConnectedDocumentsBadgesProps {
  invoice: {
    _id: string;
    connectedDocuments?: {
      quotationId?: string | ConnectedDocument;
      deliveryId?: string | ConnectedDocument;
      receiptIds?: (string | ConnectedDocument)[];
      returnNoteIds?: (string | ConnectedDocument)[];
    };
  };
  onViewPdf: (doc: any) => void;
}

export function ConnectedDocumentsBadges({ invoice, onViewPdf }: ConnectedDocumentsBadgesProps) {
  // Helper to safely extract populated object
  const getDocument = (doc: string | ConnectedDocument | undefined): ConnectedDocument | null => {
    return (typeof doc === 'object' && doc !== null) ? doc : null;
  };

  // Helper to extract populated objects from array
  const getDocuments = (docs?: (string | ConnectedDocument)[]): ConnectedDocument[] => {
    if (!Array.isArray(docs)) return [];
    return docs.filter((doc): doc is ConnectedDocument => 
      typeof doc === 'object' && doc !== null
    );
  };

  const quotation = getDocument(invoice.connectedDocuments?.quotationId);
  const delivery = getDocument(invoice.connectedDocuments?.deliveryId);
  const receipts = getDocuments(invoice.connectedDocuments?.receiptIds);
  const returnNotes = getDocuments(invoice.connectedDocuments?.returnNoteIds);

  if (!quotation && !delivery && receipts.length === 0 && returnNotes.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        No linked documents
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {/* Quotation Badge */}
      {quotation && (
        <Badge
          variant="info"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={() => onViewPdf({ ...quotation, documentType: 'quotation' })}
        >
          <FileClock className="h-3 w-3" />
          {quotation.invoiceNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      )}

      {/* Delivery Badge */}
      {delivery && (
        <Badge
          variant="warning"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={() => onViewPdf({ ...delivery, documentType: 'delivery' })}
        >
          <Truck className="h-3 w-3" />
          {delivery.invoiceNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      )}

      {/* Receipt Badges */}
      {receipts.map((receipt) => (
        <Badge
          key={receipt._id}
          variant="success"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={() => onViewPdf({ ...receipt, voucherType: 'receipt' })}
        >
          <Ticket className="h-3 w-3" />
          {receipt.invoiceNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      ))}

      {/* Return Note Badges */}
      {returnNotes.map((returnNote) => (
        <Badge
          key={returnNote._id}
          variant="destructive"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={() => onViewPdf({ ...returnNote, documentType: 'returnNote' })}
        >
          <RotateCcw className="h-3 w-3" />
          {returnNote.returnNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      ))}
    </div>
  );
}