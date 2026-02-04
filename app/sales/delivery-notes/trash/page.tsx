// app/sales/delivery-notes/trash/page.tsx

"use client";

import { TrashPage } from "@/components/TrashPage";
import { formatCurrency } from "@/utils/formatters/currency";
import { Truck } from "lucide-react";
import { useDeliveryNotePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { redirect } from "next/navigation";

interface DeletedDeliveryNote {
  _id: string;
  invoiceNumber: string;
  partyId?: any; // Populated
  grandTotal?: number;
  status?: string;
  deletedAt?: Date | string;
  deletedBy?: string;
}

export default function DeliveryNotesTrashPage() {
  const [isMounted, setIsMounted] = useState(false);
  const {
    permissions: { canViewTrash },
    isPending,
    session
  } = useDeliveryNotePermissions();

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
    redirect('/login');
  }

  if (!canViewTrash) {
    return <AccessDenied />;
  }

  return (
    <TrashPage<DeletedDeliveryNote>
      title="Delivery Notes Trash"
      description="Deleted delivery notes that can be restored or permanently removed"
      icon={<Truck className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/delivery-notes/trash"
      restoreEndpoint="/api/delivery-notes/trash/restore"
      deleteEndpoint="/api/delivery-notes/trash/delete"
      backUrl="../delivery-notes"
      backLabel="Back to Delivery Notes"
      getItemName={(item) => item.invoiceNumber || "Unnamed Delivery Note"}
      getItemDescription={(item) => {
        const party = item.partyId;
        const name = party?.name || party?.company || 'Unknown Party';
        return `${name} • ${formatCurrency(item.grandTotal || 0.00)} • ${item.status || 'N/A'}`;
      }}
    />
  );
}