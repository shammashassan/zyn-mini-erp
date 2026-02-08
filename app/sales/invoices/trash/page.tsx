// app/sales/invoices/trash/page.tsx

"use client";

import { TrashPage } from "@/components/TrashPage";
import { formatCurrency } from "@/utils/formatters/currency";
import { FileText } from "lucide-react";
import { useInvoicePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { redirect, usePathname } from "next/navigation";

interface DeletedInvoice {
  _id: string;
  invoiceNumber: string;
  partyId?: any; // Populated
  grandTotal?: number;
  paymentStatus?: string;
  deletedAt?: Date | string;
  deletedBy?: string;
}

export default function InvoicesTrashPage() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const {
    permissions: { canViewTrash },
    isPending,
    session
  } = useInvoicePermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || isPending) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!session) {
    redirect(`/login?callbackURL=${encodeURIComponent(pathname)}`);
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
      getItemDescription={(item) => {
        const party = item.partyId;
        const name = party?.name || party?.company || 'Unknown Party';
        return `${name} • ${formatCurrency(item.grandTotal || 0.00)} • ${item.paymentStatus || 'N/A'}`;
      }}
    />
  );
}