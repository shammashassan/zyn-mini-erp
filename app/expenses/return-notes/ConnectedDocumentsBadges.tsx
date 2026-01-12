// app/expenses/return-notes/ConnectedDocumentsBadges.tsx

"use client";

import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ExternalLink, FileText } from "lucide-react";

interface ConnectedPurchase {
  _id: string;
  referenceNumber: string;
  supplierName: string;
  inventoryStatus: string;
}

interface ConnectedDebitNote {
  _id: string;
  debitNoteNumber: string;
  status: string;
}

interface ConnectedDocumentsBadgesProps {
  returnNote: {
    _id: string;
    returnNumber: string;
    connectedDocuments?: {
      purchaseId?: string | ConnectedPurchase;
      debitNoteId?: string | ConnectedDebitNote;
    };
  };
  onViewPurchase?: (purchase: ConnectedPurchase) => void;
  onViewDebitNotePdf?: (debitNote: any) => void;
}

export function ConnectedDocumentsBadges({ 
  returnNote, 
  onViewPurchase,
  onViewDebitNotePdf 
}: ConnectedDocumentsBadgesProps) {
  const purchaseId = returnNote.connectedDocuments?.purchaseId;
  const debitNoteId = returnNote.connectedDocuments?.debitNoteId;

  // Check if purchase is populated
  const purchase = (typeof purchaseId === 'object' && purchaseId !== null) 
    ? purchaseId as ConnectedPurchase
    : null;

  // Check if debit note is populated
  const debitNote = (typeof debitNoteId === 'object' && debitNoteId !== null)
    ? debitNoteId as ConnectedDebitNote
    : null;

  const hasPurchase = !!purchase;
  const hasDebitNote = !!debitNote;

  if (!hasPurchase && !hasDebitNote) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        No linked documents
      </div>
    );
  }

  const handleViewPurchase = () => {
    if (purchase && onViewPurchase) {
      onViewPurchase(purchase);
    }
  };

  const handleViewDebitNote = () => {
    if (debitNote && onViewDebitNotePdf) {
      onViewDebitNotePdf(debitNote);
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {/* Purchase */}
      {purchase && (
        <Badge
          variant="warning"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={(e) => {
            e.stopPropagation();
            handleViewPurchase();
          }}
        >
          <ShoppingCart className="h-3 w-3" />
          {purchase.referenceNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      )}

      {/* Debit Note */}
      {debitNote && (
        <Badge
          variant="primary"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={(e) => {
            e.stopPropagation();
            handleViewDebitNote();
          }}
        >
          <FileText className="h-3 w-3" />
          {debitNote.debitNoteNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      )}
    </div>
  );
}