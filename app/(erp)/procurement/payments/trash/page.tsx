// app/procurement/payments/trash/page.tsx

"use client";

import { TrashPage } from "@/components/shared/TrashPage";
import { formatCurrency } from "@/utils/formatters/currency";
import { Wallet } from "lucide-react";
import { useVoucherPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/shared/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { redirect, usePathname } from "next/navigation";

interface DeletedPayment {
    _id: string;
    invoiceNumber: string;
    payeeName?: string;
    vendorName?: string;
    partyId?: any; // Populated
    voucherType?: 'payment';
    grandTotal?: number;
    deletedAt?: Date | string;
    deletedBy?: string;
}

export default function PaymentsTrashPage() {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const {
        permissions: { canViewTrash },
        isPending,
        session
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

    if (!session) {
        redirect(`/login?callbackURL=${encodeURIComponent(pathname)}`);
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
            getItemDescription={(item) => {
                const party = item.partyId;
                const name = party?.name || party?.company || item.payeeName || item.vendorName || 'Unknown';

                return `${name} • ${formatCurrency(item.grandTotal || 0.00)}`;
            }}
        />
    );
}
