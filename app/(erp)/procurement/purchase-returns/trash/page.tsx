// app/procurement/purchase-returns/trash/page.tsx

"use client";

import { useEffect, useState } from "react";
import { TrashPage } from "@/components/shared/TrashPage";
import { Redo2 } from "lucide-react";
import { useReturnNotePermissions } from "@/hooks/use-permissions";
import { Spinner } from "@/components/ui/spinner";
import { forbidden, redirect, usePathname } from "next/navigation";

interface DeletedPurchaseReturn {
  _id: string;
  returnNumber?: string;
  purchaseReference?: string;
  partyId?: any; // Populated
  partySnapshot?: any; // Immutable snapshot fallback
  connectedDocuments?: any; // Populated connected documents
  items?: Array<{
    returnQuantity: number;
  }>;
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

export default function PurchaseReturnsTrashPage() {
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
    <TrashPage<DeletedPurchaseReturn>
      title="Purchase Returns Trash"
      description="Deleted purchase returns that can be restored or permanently removed"
      icon={<Redo2 className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/return-notes/trash?returnType=purchaseReturn"
      restoreEndpoint="/api/return-notes/trash/restore"
      deleteEndpoint="/api/return-notes/trash/delete"
      backUrl="../purchase-returns"
      backLabel="Back to Purchase Returns"
      getItemName={(item) => item.returnNumber || "Unnamed Purchase Return"}
      getItemDescription={(item) => {
        const totalQuantity =
          item.items?.reduce((sum, i) => sum + (i.returnQuantity || 0), 0) || 0;

        const party = item.partyId;
        const name = party?.name || party?.company || item.partySnapshot?.displayName || 'Unknown Party';

        const purchaseRef = item.connectedDocuments?.purchaseId?.referenceNumber || item.purchaseReference || "N/A";

        return `${purchaseRef} • ${name} • ${totalQuantity.toFixed(2)} units • ${item.reason || "No reason"}`;
      }}
    />
  );
}