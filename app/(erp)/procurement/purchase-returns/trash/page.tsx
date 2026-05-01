// app/procurement/purchase-returns/trash/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { TrashPage } from "@/components/shared/TrashPage";
import { PackageX, Redo2 } from "lucide-react";
import { useReturnNotePermissions } from "@/hooks/use-permissions";
import { forbidden } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { redirect, usePathname } from "next/navigation";

interface DeletedPurchaseReturn {
  _id: string;
  returnNumber?: string;
  purchaseReference?: string;
  partyId?: any; // Populated
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
        const deleteAction = item.actionHistory?.find((a) => a.action === "Soft Deleted");
        const deletedByUsername = deleteAction?.username || item.deletedBy || "Unknown";

        const party = item.partyId;
        const name = party?.name || party?.company || 'Unknown Party';

        return `${item.purchaseReference || "N/A"} • ${name} • ${totalQuantity.toFixed(2)} units • ${item.reason || "No reason"} • Deleted by @${deletedByUsername}`;
      }}
    />
  );
}