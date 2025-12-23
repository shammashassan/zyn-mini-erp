// app/purchases/ConnectedPaymentsBadges.tsx - FIXED: Explicit document types

"use client";

import { Badge } from "@/components/ui/badge";
import { Wallet, ExternalLink } from "lucide-react";

interface ConnectedPayment {
  _id: string;
  invoiceNumber: string;
  grandTotal: number;
  documentType: string;
}

interface ConnectedPaymentsBadgesProps {
  purchase: {
    _id: string;
    referenceNumber: string;
    connectedDocuments?: {
      paymentIds?: (string | ConnectedPayment)[];
    };
  };
  onViewPdf: (payment: any) => void;
}

export function ConnectedPaymentsBadges({ purchase, onViewPdf }: ConnectedPaymentsBadgesProps) {
  const paymentIds = purchase.connectedDocuments?.paymentIds || [];

  // Filter out string IDs (not populated) and get only populated objects
  const payments = paymentIds.filter(
    (payment): payment is ConnectedPayment =>
      typeof payment === 'object' && payment !== null
  );

  if (payments.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
        No payments yet
      </div>
    )
  }

  const handleView = (payment: ConnectedPayment) => {
    // ✅ FIXED: Explicitly set types so page.tsx uses correct route
    onViewPdf({
      ...payment,
      voucherType: 'payment',
      documentType: 'payment'
    });
  };

  return (
    <div className="flex flex-wrap gap-1">
      {payments.map((payment) => (
        <Badge
          key={payment._id}
          variant="success"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity gap-1 w-fit"
          onClick={() => handleView(payment)}
        >
          <Wallet className="h-3 w-3" />
          {payment.invoiceNumber}
          <ExternalLink className="h-3 w-3 ml-1" />
        </Badge>
      ))}
    </div>
  );
}