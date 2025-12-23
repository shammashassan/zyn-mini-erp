// app/invoices/trash/page.tsx

"use client";

import { TrashPage } from "@/components/TrashPage";
import { formatCurrency } from "@/utils/formatters/currency";
import { FileText } from "lucide-react";
import { useInvoicePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

interface DeletedInvoice {
  _id: string;
  invoiceNumber: string;
  customerName?: string;
  grandTotal?: number;
  paymentStatus?: string;
  deletedAt?: Date | string;
  deletedBy?: string;
}

export default function InvoicesTrashPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { 
    permissions: { canViewTrash }, 
    isPending 
  } = useInvoicePermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || isPending) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Spinner className="size-10"/>
      </div>
    );
  }

  if (!canViewTrash) {
    return <AccessDenied />;
  }

  return (
    <TrashPage<DeletedInvoice>
      title="Invoices Trash"
      description="Deleted invoices that can be restored or permanently removed"
      icon={<FileText className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/invoices/trash"
      restoreEndpoint="/api/invoices/trash/restore"
      deleteEndpoint="/api/invoices/trash/delete"
      backUrl="../invoices"
      backLabel="Back to Invoices"
      getItemName={(item) => item.invoiceNumber || "Unnamed Invoice"}
      getItemDescription={(item) => 
        `${item.customerName || 'Unknown Customer'} • ${formatCurrency(item.grandTotal || 0.00)} • ${item.paymentStatus || 'N/A'}`
      }
    />
  );
}