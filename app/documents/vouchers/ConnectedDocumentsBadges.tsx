// app/documents/vouchers/ConnectedDocumentsBadges.tsx - FIXED: Pass onViewPdf to modals & Added Expense support

"use client";

import { Badge } from "@/components/ui/badge";
import { FileText, ShoppingCart, ExternalLink, Banknote } from "lucide-react";
import { useState } from "react";
import { PurchaseViewModal } from "@/app/expenses/purchases/PurchaseViewModal";
import { ExpenseViewModal } from "@/app/expenses/expenses/ExpenseViewModal";
import type { IPurchase } from "@/models/Purchase";
import type { IExpense } from "@/models/Expense";

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

interface ConnectedDocumentsBadgesProps {
  voucher: {
    _id: string;
    voucherType: "receipt" | "payment" | "refund";
    connectedDocuments?: {
      invoiceId?: string | ConnectedInvoice;
      invoiceIds?: (string | ConnectedInvoice)[];
      purchaseId?: string | ConnectedPurchase;
      purchaseIds?: (string | ConnectedPurchase)[];
      expenseIds?: (string | ConnectedExpense)[];
    };
  };
  onViewPdf: (doc: any) => void;
}

export function ConnectedDocumentsBadges({ voucher, onViewPdf }: ConnectedDocumentsBadgesProps) {
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<IPurchase | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<IExpense | null>(null);

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

  const handleInvoiceBadgeClick = (invoice: ConnectedInvoice) => {
    if (invoice) {
      onViewPdf({
        ...invoice,
        documentType: 'invoice'
      });
    }
  };

  const handlePurchaseBadgeClick = (purchase: ConnectedPurchase) => {
    if (purchase) {
      setSelectedPurchase(purchase as unknown as IPurchase);
      setIsPurchaseModalOpen(true);
    }
  };

  const handleExpenseBadgeClick = (expense: ConnectedExpense) => {
    if (expense) {
      setSelectedExpense(expense as unknown as IExpense);
      setIsExpenseModalOpen(true);
    }
  };

  if (invoices.length === 0 && purchases.length === 0 && expenses.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        No linked documents
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-1 justify-center">
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
      </div>

      <PurchaseViewModal
        isOpen={isPurchaseModalOpen}
        onClose={() => {
          setIsPurchaseModalOpen(false);
          setSelectedPurchase(null);
        }}
        purchase={selectedPurchase}
        onViewPdf={onViewPdf} // ✅ Fix: Pass onViewPdf to nested modal
      />

      <ExpenseViewModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setSelectedExpense(null);
        }}
        expense={selectedExpense}
        onViewPdf={onViewPdf} // ✅ Fix: Pass onViewPdf to nested modal
      />
    </>
  );
}