// app/sales/receipts/trash/page.tsx

"use client";

import { TrashPage } from "@/components/TrashPage";
import { formatCurrency } from "@/utils/formatters/currency";
import { Receipt, Ticket } from "lucide-react";
import { useVoucherPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { redirect } from "next/navigation";

interface DeletedReceipt {
    _id: string;
    invoiceNumber: string;
    payeeName?: string;
    vendorName?: string;
    partyId?: any; // Populated
    voucherType?: 'receipt';
    grandTotal?: number;
    deletedAt?: Date | string;
    deletedBy?: string;
}

export default function ReceiptsTrashPage() {
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
        redirect('/login');
    }

    if (!canViewTrash) {
        return <AccessDenied />;
    }

    return (
        <TrashPage<DeletedReceipt>
            title="Receipts Trash"
            description="Deleted receipts that can be restored or permanently removed"
            icon={<Ticket className="h-8 w-8 text-destructive" />}
            apiEndpoint="/api/vouchers/trash?voucherType=receipt"
            restoreEndpoint="/api/vouchers/trash/restore"
            deleteEndpoint="/api/vouchers/trash/delete"
            backUrl="../receipts"
            backLabel="Back to Receipts"
            getItemName={(item) =>
                `${item.invoiceNumber || "Unnamed Receipt"}`
            }
            getItemDescription={(item) => {
                const party = item.partyId;
                const name = party?.name || party?.company || item.payeeName || item.vendorName || 'Unknown';

                return `${name} • ${formatCurrency(item.grandTotal || 0.00)}`;
            }}
        />
    );
}
