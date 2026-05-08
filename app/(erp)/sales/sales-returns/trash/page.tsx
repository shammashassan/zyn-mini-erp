// app/sales/sales-returns/trash/page.tsx

"use client";

import { useEffect, useState } from "react";
import { Undo2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { Spinner } from "@/components/ui/spinner";
import { TrashPage } from "@/components/shared/TrashPage";
import { useReturnNotePermissions } from "@/hooks/use-permissions";
import { forbidden, redirect, usePathname } from "next/navigation";

interface DeletedSalesReturn {
  _id: string;
  returnNumber?: string;
  invoiceReference?: string;
  partyId?: any; // Populated
  partySnapshot?: any; // Immutable snapshot fallback
  connectedDocuments?: any; // Populated connected documents
  items?: Array<{
    returnQuantity: number;
  }>;
  grandTotal?: number;
  reason?: string;
  status?: string;
  deletedAt?: Date | string;
  deletedBy?: string;
  actionHistory?: Array<{
    action: string;
    username?: string;
    userId?: string;
  }>;
}

export default function SalesReturnsTrashPage() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const {
    permissions: { canViewTrash },
    isPending,
    session
  } = useReturnNotePermissions();

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
    forbidden();
  }

  return (
    <TrashPage<DeletedSalesReturn>
      title="Sales Returns Trash"
      description="Deleted sales returns that can be restored or permanently removed"
      icon={<Undo2 className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/return-notes/trash?returnType=salesReturn"
      restoreEndpoint="/api/return-notes/trash/restore"
      deleteEndpoint="/api/return-notes/trash/delete"
      backUrl="../sales-returns"
      backLabel="Back to Sales Returns"
      getItemName={(item) => item.returnNumber || "Unnamed Sales Return"}
      getItemDescription={(item) => {
        const totalQuantity =
          item.items?.reduce((sum, i) => sum + (i.returnQuantity || 0), 0) || 0;
        const displayTotal = item.grandTotal || 0;

        const party = item.connectedDocuments?.partyId;
        const name = party?.name || party?.company || item.partySnapshot?.displayName || 'Unknown Party';

        const invoiceRef = item.connectedDocuments?.invoiceId?.invoiceNumber || item.invoiceReference || "N/A";

        return `${invoiceRef} • ${name} • ${totalQuantity.toFixed(2)} units • ${formatCurrency(displayTotal)} • ${item.reason || "No reason"}`;
      }}
    />
  );
}