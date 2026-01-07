// app/expenses/return-notes/trash/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { TrashPage } from "@/components/TrashPage";
import { PackageX } from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { useReturnNotePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";

interface DeletedReturnNote {
  _id: string;
  returnNumber?: string;
  purchaseReference?: string;
  supplierName?: string;
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

export default function ReturnNotesTrashPage() {
  const [isMounted, setIsMounted] = useState(false);
  const {
    permissions: { canViewTrash },
    isPending,
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

  if (!canViewTrash) {
    return <AccessDenied />;
  }

  return (
    <TrashPage<DeletedReturnNote>
      title="Return Notes Trash"
      description="Deleted return notes that can be restored or permanently removed"
      icon={<PackageX className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/return-notes/trash"
      restoreEndpoint="/api/return-notes/trash/restore"
      deleteEndpoint="/api/return-notes/trash/delete"
      backUrl="../return-notes"
      backLabel="Back to Return Notes"
      getItemName={(item) => item.returnNumber || "Unnamed Return Note"}
      getItemDescription={(item) => {
        const totalQuantity =
          item.items?.reduce((sum, i) => sum + (i.returnQuantity || 0), 0) || 0;
        const deleteAction = item.actionHistory?.find((a) => a.action === "Soft Deleted");
        const deletedByUsername = deleteAction?.username || item.deletedBy || "Unknown";
        const displayTotal = item.grandTotal || 0;
        
        return `${item.purchaseReference || "N/A"} • ${item.supplierName || "Unknown Supplier"} • ${totalQuantity.toFixed(2)} units • ${formatCurrency(displayTotal)} • ${item.reason || "No reason"} • Deleted by @${deletedByUsername}`;
      }}
    />
  );
}