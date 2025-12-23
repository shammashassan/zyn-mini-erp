// app/customers/trash/page.tsx

"use client";

import { TrashPage } from "@/components/TrashPage";
import { Users } from "lucide-react";
import { useCustomerPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

interface DeletedCustomer {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  deletedAt?: Date | string;
  deletedBy?: string;
}

export default function CustomersTrashPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { 
    permissions: { canViewTrash }, 
    isPending 
  } = useCustomerPermissions();

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
    <TrashPage<DeletedCustomer>
      title="Customers Trash"
      description="Deleted customers that can be restored or permanently removed"
      icon={<Users className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/customers/trash"
      restoreEndpoint="/api/customers/trash/restore"
      deleteEndpoint="/api/customers/trash/delete"
      backUrl="../customers"
      backLabel="Back to Customers"
      getItemName={(item) => item.name || "Unnamed Customer"}
      getItemDescription={(item) => item.email || item.phone || ""}
    />
  );
}