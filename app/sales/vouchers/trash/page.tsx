// app/sales/vouchers/trash/page.tsx

"use client";

import { TrashPage } from "@/components/TrashPage";
import { formatCurrency } from "@/utils/formatters/currency";
import { Ticket } from "lucide-react";
import { useVoucherPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

interface DeletedVoucher {
  _id: string;
  invoiceNumber: string;
  customerName?: string;
  supplierName?: string;
  voucherType?: 'receipt' | 'payment';
  grandTotal?: number;
  deletedAt?: Date | string;
  deletedBy?: string;
}

export default function VouchersTrashPage() {
  const [isMounted, setIsMounted] = useState(false);
  const { 
    permissions: { canViewTrash }, 
    isPending 
  } = useVoucherPermissions();

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
    <TrashPage<DeletedVoucher>
      title="Vouchers Trash"
      description="Deleted vouchers that can be restored or permanently removed"
      icon={<Ticket className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/vouchers/trash"
      restoreEndpoint="/api/vouchers/trash/restore"
      deleteEndpoint="/api/vouchers/trash/delete"
      backUrl="../vouchers"
      backLabel="Back to Vouchers"
      getItemName={(item) => 
        `${item.invoiceNumber || "Unnamed Voucher"} (${item.voucherType === 'receipt' ? 'Receipt' : 'Payment'})`
      }
      getItemDescription={(item) => 
        `${item.customerName || item.supplierName || 'Unknown'} • ${formatCurrency(item.grandTotal || 0.00)}`
      }
    />
  );
}