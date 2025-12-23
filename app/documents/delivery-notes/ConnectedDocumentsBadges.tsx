// app/delivery-notes/ConnectedDocumentsBadges.tsx - FIXED: Use invoiceIds array

"use client";

import { Badge } from "@/components/ui/badge";
import { FileText, ExternalLink } from "lucide-react";

interface ConnectedInvoice {
  _id: string;
  invoiceNumber: string;
  documentType: string;
}

interface ConnectedDocumentsBadgesProps {
  deliveryNote: {
    _id: string;
    connectedDocuments?: {
      // ✅ UPDATED: Schema uses invoiceIds array
      invoiceIds?: (string | ConnectedInvoice)[];
    };
  };
  onViewPdf: (doc: any) => void;
}

export function ConnectedDocumentsBadges({ deliveryNote, onViewPdf }: ConnectedDocumentsBadgesProps) {
  // ✅ FIXED: Get first item from invoiceIds array
  const invoiceIds = deliveryNote.connectedDocuments?.invoiceIds;
  const firstInvoice = (Array.isArray(invoiceIds) && invoiceIds.length > 0) ? invoiceIds[0] : null;

  // Check if it's a populated object (not just a string ID)
  const invoice = typeof firstInvoice === 'object' && firstInvoice !== null
    ? firstInvoice
    : null;

  if (!invoice) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        No linked documents
      </div>
    );
  }

  const handleView = () => {
    onViewPdf({
      ...invoice,
      documentType: 'invoice'
    });
  };

  return (
    <Badge
      variant="primary"
      appearance="outline"
      className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
      onClick={handleView}
    >
      <FileText className="h-3 w-3" />
      {invoice.invoiceNumber}
      <ExternalLink className="h-3 w-3 ml-1" />
    </Badge>
  );
}