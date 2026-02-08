// app/materials/trash/page.tsx

"use client";

import { TrashPage } from "@/components/TrashPage";
import { formatCurrency } from "@/utils/formatters/currency";
import { Layers } from "lucide-react";
import { useMaterialPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { redirect, usePathname } from "next/navigation";

interface DeletedMaterial {
  _id: string;
  name?: string;
  currentStock?: number;
  unit?: string;
  pricePerUnit?: number;
  deletedAt?: Date | string;
  deletedBy?: string;
}

export default function MaterialsTrashPage() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const {
    permissions: { canViewTrash },
    isPending,
    session
  } = useMaterialPermissions();

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
    return <AccessDenied />;
  }

  return (
    <TrashPage<DeletedMaterial>
      title="Materials Trash"
      description="Deleted materials that can be restored or permanently removed"
      icon={<Layers className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/materials/trash"
      restoreEndpoint="/api/materials/trash/restore"
      deleteEndpoint="/api/materials/trash/delete"
      backUrl="../materials"
      backLabel="Back to Materials"
      getItemName={(item) => item.name || "Unnamed Material"}
      getItemDescription={(item) =>
        `Stock: ${item.currentStock || 0} ${item.unit || ''} • ${formatCurrency(item.pricePerUnit || 0.00)}/unit`
      }
    />
  );
}