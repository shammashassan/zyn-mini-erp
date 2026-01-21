// app/procurement/payments/trash/page.tsx

"use client";

import { TrashPage } from "@/components/TrashPage";
import { formatCurrency } from "@/utils/formatters/currency";
import { Wallet } from "lucide-react";
import { useVoucherPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";

interface DeletedPayment {
    _id: string;
    invoiceNumber: string;
    customerName?: string;
    supplierName?: string;
    payeeName?: string;
    vendorName?: string;
    voucherType?: 'payment';
    grandTotal?: number;
    deletedAt?: Date | string;
    deletedBy?: string;
}

export default function PaymentsTrashPage() {
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
                <Spinner className="size-10" />
            </div>
        );
    }

    if (!canViewTrash) {
        return <AccessDenied />;
    }

    return (
        <TrashPage<DeletedPayment>
            title="Payments Trash"
            description="Deleted payments that can be restored or permanently removed"
            icon={<Wallet className="h-8 w-8 text-destructive" />}
            apiEndpoint="/api/vouchers/trash?voucherType=payment"
            restoreEndpoint="/api/vouchers/trash/restore"
            deleteEndpoint="/api/vouchers/trash/delete"
            backUrl="../payments"
            backLabel="Back to Payments"
            getItemName={(item) =>
                `${item.invoiceNumber || "Unnamed Payment"}`
            }
            getItemDescription={(item) =>
                `${item.customerName || item.supplierName || item.payeeName || item.vendorName || 'Unknown'} • ${formatCurrency(item.grandTotal || 0.00)}`
            }
        />
    );
}
