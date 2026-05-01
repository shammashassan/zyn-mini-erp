// app/sales/pos-returns/trash/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { TrashPage } from "@/components/shared/TrashPage";
import { PackageX, Undo2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { useReturnNotePermissions } from "@/hooks/use-permissions";
import { forbidden } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { redirect, usePathname } from "next/navigation";

interface DeletedPOSReturn {
  _id: string;
  returnNumber?: string;
  posSaleId?: any; // Populated
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

export default function POSReturnsTrashPage() {
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
    <TrashPage<DeletedPOSReturn>
      title="POS Returns Trash"
      description="Deleted POS returns that can be restored or permanently removed"
      icon={<Undo2 className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/return-notes/trash?returnType=posReturn"
      restoreEndpoint="/api/return-notes/trash/restore"
      deleteEndpoint="/api/return-notes/trash/delete"
      backUrl="../pos-returns"
      backLabel="Back to POS Returns"
      getItemName={(item) => item.returnNumber || "Unnamed POS Return"}
      getItemDescription={(item) => {
        const totalQuantity =
          item.items?.reduce((sum, i) => sum + (i.returnQuantity || 0), 0) || 0;
        const deleteAction = item.actionHistory?.find((a) => a.action === "Soft Deleted");
        const deletedByUsername = deleteAction?.username || item.deletedBy || "Unknown";
        const displayTotal = item.grandTotal || 0;

        const posSale = item.posSaleId;
        const saleRef = posSale?.saleNumber || "Unknown Sale";

        return `Sale: ${saleRef} • ${totalQuantity.toFixed(2)} units • ${formatCurrency(displayTotal)} • ${item.reason || "No reason"} • Deleted by @${deletedByUsername}`;
      }}
    />
  );
}
