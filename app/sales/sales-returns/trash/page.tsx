// app/sales/sales-returns/trash/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { TrashPage } from "@/components/TrashPage";
import { PackageX, Undo2 } from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { useReturnNotePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";

interface DeletedSalesReturn {
  _id: string;
  returnNumber?: string;
  invoiceReference?: string;
  customerName?: string;
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
        const deleteAction = item.actionHistory?.find((a) => a.action === "Soft Deleted");
        const deletedByUsername = deleteAction?.username || item.deletedBy || "Unknown";
        const displayTotal = item.grandTotal || 0;
        
        return `${item.invoiceReference || "N/A"} • ${item.customerName || "Unknown Customer"} • ${totalQuantity.toFixed(2)} units • ${formatCurrency(displayTotal)} • ${item.reason || "No reason"} • Deleted by @${deletedByUsername}`;
      }}
    />
  );
}