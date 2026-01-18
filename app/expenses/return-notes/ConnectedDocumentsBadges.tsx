// app/expenses/return-notes/ConnectedDocumentsBadges.tsx - UPDATED: Invoice opens PDF directly

"use client";

import { Badge } from "@/components/ui/badge";
import { ShoppingCart, ExternalLink, FileText, Receipt, CreditCard } from "lucide-react";

interface ConnectedPurchase {
  _id: string;
  referenceNumber: string;
  supplierName: string;
  inventoryStatus: string;
}

interface ConnectedInvoice {
  _id: string;
  invoiceNumber: string;
  customerName: string;
  status: string;
}

interface ConnectedDebitNote {
  _id: string;
  debitNoteNumber: string;
  status: string;
}

interface ConnectedCreditNote {
  _id: string;
  creditNoteNumber: string;
  status: string;
}

interface ConnectedDocumentsBadgesProps {
  returnNote: {
    _id: string;
    returnNumber: string;
    returnType: 'salesReturn' | 'purchaseReturn' | 'manualReturn';
    connectedDocuments?: {
      purchaseId?: string | ConnectedPurchase;
      invoiceId?: string | ConnectedInvoice;
      debitNoteId?: string | ConnectedDebitNote;
      creditNoteId?: string | ConnectedCreditNote;
    };
  };
  onViewPurchase?: (purchase: ConnectedPurchase) => void;
  onViewInvoicePdf?: (invoice: ConnectedInvoice) => void; // ✅ RENAMED: Opens PDF instead of modal
  onViewDebitNotePdf?: (debitNote: any) => void;
  onViewCreditNotePdf?: (creditNote: any) => void;
}

export function ConnectedDocumentsBadges({ 
  returnNote, 
  onViewPurchase,
  onViewInvoicePdf, // ✅ RENAMED
  onViewDebitNotePdf,
  onViewCreditNotePdf
}: ConnectedDocumentsBadgesProps) {
  const purchaseId = returnNote.connectedDocuments?.purchaseId;
  const invoiceId = returnNote.connectedDocuments?.invoiceId;
  const debitNoteId = returnNote.connectedDocuments?.debitNoteId;
  const creditNoteId = returnNote.connectedDocuments?.creditNoteId;

  // Check if documents are populated
  const purchase = (typeof purchaseId === 'object' && purchaseId !== null) 
    ? purchaseId as ConnectedPurchase
    : null;

  const invoice = (typeof invoiceId === 'object' && invoiceId !== null)
    ? invoiceId as ConnectedInvoice
    : null;

  const debitNote = (typeof debitNoteId === 'object' && debitNoteId !== null)
    ? debitNoteId as ConnectedDebitNote
    : null;

  const creditNote = (typeof creditNoteId === 'object' && creditNoteId !== null)
    ? creditNoteId as ConnectedCreditNote
    : null;

  const hasPurchase = !!purchase;
  const hasInvoice = !!invoice;
  const hasDebitNote = !!debitNote;
  const hasCreditNote = !!creditNote;

  if (!hasPurchase && !hasInvoice && !hasDebitNote && !hasCreditNote) {
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

  // ✅ UPDATED: Now opens PDF directly
  const handleViewInvoice = () => {
    if (invoice && onViewInvoicePdf) {
      onViewInvoicePdf(invoice);
    }
  };

  const handleViewDebitNote = () => {
    if (debitNote && onViewDebitNotePdf) {
      onViewDebitNotePdf(debitNote);
    }
  };

  const handleViewCreditNote = () => {
    if (creditNote && onViewCreditNotePdf) {
      onViewCreditNotePdf(creditNote);
    }
  };

  return (
    <div className="flex flex-wrap gap-1">
      {/* Purchase (for purchase returns) */}
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

      {/* Invoice (for sales returns) - ✅ NOW OPENS PDF */}
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
          <Receipt className="h-3 w-3" />
          {invoice.invoiceNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      )}

      {/* Debit Note (for purchase returns) */}
      {debitNote && (
        <Badge
          variant="cyan"
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

      {/* Credit Note (for sales returns) */}
      {creditNote && (
        <Badge
          variant="orange"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={(e) => {
            e.stopPropagation();
            handleViewCreditNote();
          }}
        >
          <CreditCard className="h-3 w-3" />
          {creditNote.creditNoteNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      )}
    </div>
  );
}