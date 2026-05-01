// app/procurement/purchases/trash/page.tsx - UPDATED with Permission Checks

"use client";

import React, { useEffect, useState } from "react";
import { TrashPage } from "@/components/shared/TrashPage";
import { ShoppingCart } from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { usePurchasePermissions } from "@/hooks/use-permissions";
import { forbidden } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { redirect, usePathname } from "next/navigation";

interface DeletedPurchase {
  _id: string;
  referenceNumber?: string;
  partyId?: any; // Populated
  items?: Array<{
    quantity: number;
  }>;
  totalAmount?: number;
  vatAmount?: number;
  grandTotal?: number;
  deletedAt?: Date | string;
  deletedBy?: string;
  actionHistory?: Array<{
    action: string;
    username?: string;
    userId?: string;
  }>;
}

export default function PurchasesTrashPage() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const {
    permissions: { canViewTrash },
    isPending,
    session
  } = usePurchasePermissions();

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
    <TrashPage<DeletedPurchase>
      title="Purchases Trash"
      description="Deleted purchases that can be restored or permanently removed"
      icon={<ShoppingCart className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/purchases/trash"
      restoreEndpoint="/api/purchases/trash/restore"
      deleteEndpoint="/api/purchases/trash/delete"
      backUrl="../purchases"
      backLabel="Back to Purchases"
      getItemName={(item) =>
        item.referenceNumber ||
        "Unnamed Purchase"
      }
      getItemDescription={(item) => {
        const totalQuantity = item.items?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;
        const deleteAction = item.actionHistory?.find(a => a.action === 'Soft Deleted');
        const deletedByUsername = deleteAction?.username || item.deletedBy || 'Unknown';
        const displayTotal = item.grandTotal || (item.totalAmount || 0) + (item.vatAmount || 0);

        const party = item.partyId;
        const name = party?.name || party?.company || 'Unknown Party';

        return `${name} • ${totalQuantity} units • ${formatCurrency(displayTotal)} • Deleted by @${deletedByUsername}`;
      }}
    />
  );
}