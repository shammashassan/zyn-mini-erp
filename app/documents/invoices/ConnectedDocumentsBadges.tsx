// app/invoices/ConnectedDocumentsBadges.tsx - COMPLETE: Added Refund Badges

"use client";

import { Badge } from "@/components/ui/badge";
import { Receipt, ExternalLink, FileText, Truck, Undo2, RotateCcw, Ticket, FileClock } from "lucide-react";

interface ConnectedDocument {
  _id: string;
  invoiceNumber: string;
  documentType?: string;
}

interface ConnectedDocumentsBadgesProps {
  invoice: {
    _id: string;
    connectedDocuments?: {
      quotationId?: string | ConnectedDocument;
      deliveryId?: string | ConnectedDocument;
      receiptIds?: (string | ConnectedDocument)[];
      refundIds?: (string | ConnectedDocument)[]; // ✅ ADDED
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
  const refunds = getDocuments(invoice.connectedDocuments?.refundIds); // ✅ NEW

  if (!quotation && !delivery && receipts.length === 0 && refunds.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        No linked documents
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 items-start">
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
      {receipts.length > 0 && (
        <div className="flex flex-wrap gap-1">
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
        </div>
      )}

      {/* ✅ NEW: Refund Badges */}
      {refunds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {refunds.map((refund) => (
            <Badge
              key={refund._id}
              variant="pink"
              appearance="outline"
              className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
              onClick={() => onViewPdf({ ...refund, voucherType: 'refund' })}
            >
              <RotateCcw className="h-3 w-3" />
              {refund.invoiceNumber}
              <ExternalLink className="h-3 w-3 ml-1" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}