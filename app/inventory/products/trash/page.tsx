// app/products/trash/page.tsx

"use client";

import { TrashPage } from "@/components/TrashPage";
import { formatCurrency } from "@/utils/formatters/currency";
import { Package } from "lucide-react";
import { useProductPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { redirect } from "next/navigation";

interface DeletedProduct {
  _id: string;
  name?: string;
  category?: string;
  price?: number;
  deletedAt?: Date | string;
  deletedBy?: string;
}

export default function ProductsTrashPage() {
  const [isMounted, setIsMounted] = useState(false);
  const {
    permissions: { canViewTrash },
    isPending,
    session
  } = useProductPermissions();

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
    <TrashPage<DeletedProduct>
      title="Products Trash"
      description="Deleted products that can be restored or permanently removed"
      icon={<Package className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/products/trash"
      restoreEndpoint="/api/products/trash/restore"
      deleteEndpoint="/api/products/trash/delete"
      backUrl="../products"
      backLabel="Back to Products"
      getItemName={(item) => item.name || "Unnamed Product"}
      getItemDescription={(item) =>
        `${item.category || 'Uncategorized'} • ${formatCurrency(item.price || 0.00)}`
      }
    />
  );
}