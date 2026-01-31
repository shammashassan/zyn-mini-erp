// app/sales/quotations/trash/page.tsx

"use client";

import { TrashPage } from "@/components/TrashPage";
import { formatCurrency } from "@/utils/formatters/currency";
import { FileClock } from "lucide-react";
import { useQuotationPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

interface DeletedQuotation {
  _id: string;
  invoiceNumber: string;
  partyId?: any; // Populated
  grandTotal?: number;
  status?: string;
  deletedAt?: Date | string;
  deletedBy?: string;
}

export default function QuotationsTrashPage() {
  const [isMounted, setIsMounted] = useState(false);
  const {
    permissions: { canViewTrash },
    isPending
  } = useQuotationPermissions();

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

  if (!canViewTrash) {
    return <AccessDenied />;
  }

  return (
    <TrashPage<DeletedQuotation>
      title="Quotations Trash"
      description="Deleted quotations that can be restored or permanently removed"
      icon={<FileClock className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/quotations/trash"
      restoreEndpoint="/api/quotations/trash/restore"
      deleteEndpoint="/api/quotations/trash/delete"
      backUrl="../quotations"
      backLabel="Back to Quotations"
      getItemName={(item) => item.invoiceNumber || "Unnamed Quotation"}
      getItemDescription={(item) => {
        const party = item.partyId;
        const name = party?.name || party?.company || 'Unknown Party';
        return `${name} • ${formatCurrency(item.grandTotal || 0.00)} • ${item.status || 'N/A'}`;
      }}
    />
  );
}