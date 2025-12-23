"use client";

import { TrashPage } from "@/components/TrashPage";
import { Users } from "lucide-react";
import { usePayeePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

interface DeletedPayee {
  _id: string;
  name: string;
  type: string;
  email?: string;
  phone?: string;
  deletedAt?: Date | string;
  deletedBy?: string;
}

export default function PayeesTrashPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { 
    permissions: { canViewTrash }, 
    isPending 
  } = usePayeePermissions();

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
    <TrashPage<DeletedPayee>
      title="Payees Trash"
      description="Deleted payees that can be restored or permanently removed"
      icon={<Users className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/payees/trash"
      restoreEndpoint="/api/payees/trash/restore"
      deleteEndpoint="/api/payees/trash/delete"
      backUrl="../payees"
      backLabel="Back to Payees"
      getItemName={(item) => item.name || "Unnamed Payee"}
      getItemDescription={(item) => `${item.type?.replace(/_/g, ' ')} ${item.email || item.phone ? '• ' : ''}${item.email || item.phone || ""}`}
    />
  );
}