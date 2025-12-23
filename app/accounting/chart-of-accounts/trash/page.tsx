// app/accounting/chart-of-accounts/trash/page.tsx

"use client";

import { TrashPage } from "@/components/TrashPage";
import { ListTree } from "lucide-react";
import { useChartOfAccountsPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

interface DeletedCOA {
  _id: string;
  accountCode: string;
  accountName: string;
  groupName: string;
  subGroup: string;
  nature: 'debit' | 'credit';
  deletedAt?: Date | string;
  deletedBy?: string;
}

export default function COATrashPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { 
    permissions: { canViewTrash }, 
    isPending 
  } = useChartOfAccountsPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!canViewTrash) {
    return <AccessDenied />;
  }

  return (
    <TrashPage<DeletedCOA>
      title="Chart of Accounts Trash"
      description="Deleted accounts that can be restored or permanently removed"
      icon={<ListTree className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/chart-of-accounts/trash"
      restoreEndpoint="/api/chart-of-accounts/trash/restore"
      deleteEndpoint="/api/chart-of-accounts/trash/delete"
      backUrl="/accounting/chart-of-accounts"
      backLabel="Back to COA"
      getItemName={(item) => 
        `${item.accountCode} - ${item.accountName}`
      }
      getItemDescription={(item) => 
        `${item.groupName} › ${item.subGroup} • ${item.nature}`
      }
    />
  );
}