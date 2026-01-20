// app/sales/vouchers/ConnectedDocumentsBadges.tsx

"use client";

import { Badge } from "@/components/ui/badge";
import { FileText, ShoppingCart, ExternalLink, Banknote, Receipt, CreditCard } from "lucide-react";

interface ConnectedInvoice {
  _id: string;
  invoiceNumber: string;
  documentType: string;
}

interface ConnectedPurchase {
  _id: string;
  referenceNumber: string;
  supplierName?: string;
  totalAmount: number;
  date: Date;
  status: string;
  paymentStatus: string;
  items: any[];
  connectedDocuments?: any;
  paidAmount?: number;
  remainingAmount?: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string | null;
  updatedBy?: string | null;
  actionHistory?: any[];
}

interface ConnectedExpense {
  _id: string;
  referenceNumber: string;
  description: string;
  amount: number;
  category: string;
  type: 'single' | 'period';
  date: Date;
  status: 'pending' | 'approved' | 'cancelled';
  paymentStatus: 'Pending' | 'Paid' | 'Partially Paid';
  vendor?: string;
  connectedDocuments?: any;
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
  voucher: {
    _id: string;
    voucherType: "receipt" | "payment";
    connectedDocuments?: {
      invoiceId?: string | ConnectedInvoice;
      invoiceIds?: (string | ConnectedInvoice)[];
      purchaseId?: string | ConnectedPurchase;
      purchaseIds?: (string | ConnectedPurchase)[];
      expenseIds?: (string | ConnectedExpense)[];
      creditNoteIds?: (string | ConnectedCreditNote)[];
      debitNoteIds?: (string | ConnectedDebitNote)[];
    };
  };
  onViewPdf: (doc: any) => void;
  onViewInvoice?: (invoice: any) => void;
  onViewPurchase?: (purchase: any) => void;
  onViewExpense?: (expense: any) => void;
  onViewCreditNote?: (creditNote: any) => void;
  onViewDebitNote?: (debitNote: any) => void;
}

export function ConnectedDocumentsBadges({ 
  voucher, 
  onViewPdf,
  onViewInvoice,
  onViewPurchase,
  onViewExpense,
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
    voucher.connectedDocuments?.invoiceId,
    voucher.connectedDocuments?.invoiceIds
  );

  const purchases = getDocuments<ConnectedPurchase>(
    voucher.connectedDocuments?.purchaseId,
    voucher.connectedDocuments?.purchaseIds
  );

  const expenses = getDocuments<ConnectedExpense>(
    undefined,
    voucher.connectedDocuments?.expenseIds
  );

  const creditNotes = getDocuments<ConnectedCreditNote>(
    undefined,
    voucher.connectedDocuments?.creditNoteIds
  );

  const debitNotes = getDocuments<ConnectedDebitNote>(
    undefined,
    voucher.connectedDocuments?.debitNoteIds
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

  const handlePurchaseBadgeClick = (purchase: ConnectedPurchase) => {
    if (onViewPurchase) {
      onViewPurchase(purchase);
    }
  };

  const handleExpenseBadgeClick = (expense: ConnectedExpense) => {
    if (onViewExpense) {
      onViewExpense(expense);
    }
  };

  const handleCreditNoteBadgeClick = (creditNote: ConnectedCreditNote) => {
    if (onViewCreditNote) {
      onViewCreditNote(creditNote);
    } else {
      onViewPdf({
        ...creditNote,
        documentType: 'creditNote' // Fallback if needed
      });
    }
  };

  const handleDebitNoteBadgeClick = (debitNote: ConnectedDebitNote) => {
    if (onViewDebitNote) {
      onViewDebitNote(debitNote);
    } else {
      onViewPdf({
        ...debitNote,
        documentType: 'debitNote' // Fallback if needed
      });
    }
  };

  if (
    invoices.length === 0 && 
    purchases.length === 0 && 
    expenses.length === 0 && 
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

      {purchases.map((purchase) => (
        <Badge
          key={purchase._id}
          variant="warning"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={() => handlePurchaseBadgeClick(purchase)}
        >
          <ShoppingCart className="h-3 w-3" />
          {purchase.referenceNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      ))}

      {expenses.map((expense) => (
        <Badge
          key={expense._id}
          variant="info"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={() => handleExpenseBadgeClick(expense)}
        >
          <Banknote className="h-3 w-3" />
          {expense.referenceNumber}
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
          <Receipt className="h-3 w-3" />
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
          <CreditCard className="h-3 w-3" />
          {debitNote.debitNoteNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      ))}
    </div>
  );
}