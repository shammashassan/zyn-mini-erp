// app/procurement/expenses/trash/page.tsx - UPDATED with Permission Checks

"use client";

import React, { useEffect, useState } from "react";
import { TrashPage } from "@/components/shared/TrashPage";
import { Banknote } from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { useExpensePermissions } from "@/hooks/use-permissions";
import { forbidden } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { redirect, usePathname } from "next/navigation";

interface DeletedExpense {
  _id: string;
  referenceNumber?: string;
  description?: string;
  category?: string;
  amount?: number;
  deletedAt?: Date | string;
  deletedBy?: string;
  lastAction?: string;
}

// Helper to extract username from lastAction
const getDeletedByUsername = (expense: DeletedExpense): string => {
  if (expense.lastAction) {
    const match = expense.lastAction.match(/Soft Deleted by (@?\w+) at/);
    if (match) {
      return match[1];
    }
  }
  return expense.deletedBy || 'Unknown';
};

export default function ExpensesTrashPage() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const {
    permissions: { canViewTrash },
    isPending,
    session
  } = useExpensePermissions();

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
    <TrashPage<DeletedExpense>
      title="Expenses Trash"
      description="Deleted expenses that can be restored or permanently removed"
      icon={<Banknote className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/expenses/trash"
      restoreEndpoint="/api/expenses/trash/restore"
      deleteEndpoint="/api/expenses/trash/delete"
      backUrl="../expenses"
      backLabel="Back to Expenses"
      getItemName={(item) =>
        item.referenceNumber ||
        item.description ||
        "Unnamed Expense"
      }
      getItemDescription={(item) => {
        const deletedBy = getDeletedByUsername(item);
        return `${item.category || 'Uncategorized'} • ${formatCurrency(item.amount || 0)} • Deleted by @${deletedBy}`;
      }}
    />
  );
}