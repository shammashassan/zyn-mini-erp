// app/procurement/credit-notes/trash/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { TrashPage } from "@/components/TrashPage";
import { FileText } from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { useCreditNotePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";

interface DeletedCreditNote {
  _id: string;
  creditNoteNumber?: string;
  partyId?: any; // Populated
  items?: Array<{
    description: string;
    quantity: number;
  }>;
  totalAmount?: number;
  grandTotal?: number;
  vatAmount?: number;
  status?: string;
  deletedAt?: Date | string;
  deletedBy?: string;
  actionHistory?: Array<{
    action: string;
    username?: string;
    userId?: string;
  }>;
}

export default function CreditNotesTrashPage() {
  const [isMounted, setIsMounted] = useState(false);
  const {
    permissions: { canViewTrash },
    isPending
  } = useCreditNotePermissions();

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
    <TrashPage<DeletedCreditNote>
      title="Credit Notes Trash"
      description="Deleted credit notes that can be restored or permanently removed"
      icon={<FileText className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/credit-notes/trash"
      restoreEndpoint="/api/credit-notes/trash/restore"
      deleteEndpoint="/api/credit-notes/trash/delete"
      backUrl="../credit-notes"
      backLabel="Back to Credit Notes"
      getItemName={(item) =>
        item.creditNoteNumber || "Unnamed Credit Note"
      }
      getItemDescription={(item) => {
        const totalQuantity = item.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
        const deleteAction = item.actionHistory?.find(a => a.action === 'Soft Deleted');
        const deletedByUsername = deleteAction?.username || item.deletedBy || 'Unknown';
        const displayTotal = item.grandTotal || (item.totalAmount || 0) + (item.vatAmount || 0);
        const statusBadge = item.status ? ` • ${item.status}` : '';

        const party = item.partyId;
        const name = party?.name || party?.company || 'Unknown Party';

        return `${name} • ${totalQuantity} units • ${formatCurrency(displayTotal)}${statusBadge} • Deleted by @${deletedByUsername}`;
      }}
    />
  );
}