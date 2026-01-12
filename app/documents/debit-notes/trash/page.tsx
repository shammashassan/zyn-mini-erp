// app/documents/debit-notes/trash/page.tsx

"use client";

import React, { useEffect, useState } from "react";
import { TrashPage } from "@/components/TrashPage";
import { FileText } from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { useDebitNotePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";

interface DeletedDebitNote {
  _id: string;
  debitNoteNumber?: string;
  supplierName?: string;
  items?: Array<{
    materialName: string;
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

export default function DebitNotesTrashPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { 
    permissions: { canViewTrash }, 
    isPending 
  } = useDebitNotePermissions();

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
    <TrashPage<DeletedDebitNote>
      title="Debit Notes Trash"
      description="Deleted debit notes that can be restored or permanently removed"
      icon={<FileText className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/debit-notes/trash"
      restoreEndpoint="/api/debit-notes/trash/restore"
      deleteEndpoint="/api/debit-notes/trash/delete"
      backUrl="../debit-notes"
      backLabel="Back to Debit Notes"
      getItemName={(item) =>
        item.debitNoteNumber || "Unnamed Debit Note"
      }
      getItemDescription={(item) => {
        const totalQuantity = item.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
        const deleteAction = item.actionHistory?.find(a => a.action === 'Soft Deleted');
        const deletedByUsername = deleteAction?.username || item.deletedBy || 'Unknown';
        const displayTotal = item.grandTotal || (item.totalAmount || 0) + (item.vatAmount || 0);
        const statusBadge = item.status ? ` • ${item.status}` : '';
        return `${item.supplierName || 'Unknown Supplier'} • ${totalQuantity} units • ${formatCurrency(displayTotal)}${statusBadge} • Deleted by @${deletedByUsername}`;
      }}
    />
  );
}