// app/stock-adjustment/trash/page.tsx

"use client";

import { TrashPage } from "@/components/TrashPage";
import { ArrowRightLeft } from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate, formatTime } from "@/utils/formatters/date";
import { useStockAdjustmentPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { redirect, usePathname } from "next/navigation";

interface DeletedAdjustment {
  _id: string;
  materialName?: string;
  adjustmentType?: 'increment' | 'decrement';
  value?: number;
  oldStock?: number;
  newStock?: number;
  oldUnitCost?: number;
  newUnitCost?: number;
  adjustmentReason?: string;
  createdAt?: Date | string;
  deletedAt?: Date | string;
  deletedBy?: string;
}

export default function StockAdjustmentTrashPage() {
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
  const {
    permissions: { canViewTrash },
    isPending,
    session
  } = useStockAdjustmentPermissions();

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
    <TrashPage<DeletedAdjustment>
      title="Stock Adjustment Trash"
      description="Deleted adjustment records that can be restored or permanently removed"
      icon={<ArrowRightLeft className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/stock-adjustments/trash"
      restoreEndpoint="/api/stock-adjustments/trash/restore"
      deleteEndpoint="/api/stock-adjustments/trash/delete"
      backUrl="../stock-adjustment"
      backLabel="Back to Stock Adjustment"
      getItemName={(item) => item.materialName || "Unknown Material"}
      getItemDescription={(item) => {
        const parts: string[] = [];

        // Add date information
        if (item.createdAt) {
          const date = new Date(item.createdAt);
          parts.push(`${formatDisplayDate(date)} at ${formatTime(date)}`);
        }

        // Add adjustment details
        const hasStockChange = (item.value ?? 0) > 0;
        const unitCostChanged =
          typeof item.oldUnitCost === 'number' &&
          typeof item.newUnitCost === 'number' &&
          item.oldUnitCost !== item.newUnitCost;

        if (hasStockChange) {
          const stockChange = item.adjustmentType === 'decrement'
            ? `-${item.value}`
            : `+${item.value}`;
          parts.push(`Stock: ${stockChange}`);
        }

        if (unitCostChanged) {
          parts.push(
            `Price: ${formatCurrency(item.oldUnitCost!)} → ${formatCurrency(item.newUnitCost!)}`
          );
        }

        // Add reason if available
        if (item.adjustmentReason) {
          parts.push(`Reason: ${item.adjustmentReason}`);
        }

        return parts.join(' • ');
      }}
    />
  );
}