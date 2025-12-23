// app/suppliers/trash/page.tsx

"use client";

import { TrashPage } from "@/components/TrashPage";
import { Building2 } from "lucide-react";
import { useSupplierPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

interface DeletedSupplier {
  _id: string;
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  deletedAt?: Date | string;
  deletedBy?: string;
}

export default function SuppliersTrashPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { 
    permissions: { canViewTrash }, 
    isPending 
  } = useSupplierPermissions();

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
    <TrashPage<DeletedSupplier>
      title="Suppliers Trash"
      description="Deleted suppliers that can be restored or permanently removed"
      icon={<Building2 className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/suppliers/trash"
      restoreEndpoint="/api/suppliers/trash/restore"
      deleteEndpoint="/api/suppliers/trash/delete"
      backUrl="../suppliers"
      backLabel="Back to Suppliers"
      getItemName={(item) => item.name || "Unnamed Supplier"}
      getItemDescription={(item) => 
        [item.email, item.phone, item.location].filter(Boolean).join(" • ")
      }
    />
  );
}