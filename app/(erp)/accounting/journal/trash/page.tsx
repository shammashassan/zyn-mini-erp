// app/accounting/journal/trash/page.tsx

"use client";

import { TrashPage } from "@/components/shared/TrashPage";
import { NotebookPen } from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate } from "@/utils/formatters/date";
import { useJournalPermissions } from "@/hooks/use-permissions";
import { forbidden } from "next/navigation";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { redirect, usePathname } from "next/navigation";

interface DeletedJournal {
  _id: string;
  journalNumber: string;
  entryDate: Date | string;
  referenceType: string;
  narration: string;
  totalDebit: number;
  totalCredit: number;
  status: string;
  deletedAt?: Date | string;
  deletedBy?: string;
}

export default function JournalTrashPage() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const {
    permissions: { canViewTrash },
    isPending,
    session
  } = useJournalPermissions();

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

  if (!session) {
    redirect(`/login?callbackURL=${encodeURIComponent(pathname)}`);
  }

  if (!canViewTrash) {
    forbidden();
  }

  return (
    <TrashPage<DeletedJournal>
      title="Journal Trash"
      description="Deleted journal entries that can be restored or permanently removed"
      icon={<NotebookPen className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/journal/trash"
      restoreEndpoint="/api/journal/trash/restore"
      deleteEndpoint="/api/journal/trash/delete"
      backUrl="/accounting/journal"
      backLabel="Back to Journal"
      getItemName={(item) =>
        `${item.journalNumber} - ${item.narration}`
      }
      getItemDescription={(item) => {
        const date = formatDisplayDate(item.entryDate);
        return `${date} • ${item.referenceType} • Dr: ${formatCurrency(item.totalDebit)} • Cr: ${formatCurrency(item.totalCredit)}`;
      }}
    />
  );
}