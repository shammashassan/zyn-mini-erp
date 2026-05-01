// app/sales/pos/trash/page.tsx

"use client";

import { TrashPage } from "@/components/shared/TrashPage";
import { ShoppingBag } from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { redirect, usePathname } from "next/navigation";
import { usePOSPermissions } from "@/hooks/use-permissions";
import { forbidden } from "next/navigation";

interface DeletedPOSSale {
    _id: string;
    saleNumber: string;
    customerName?: string;
    grandTotal?: number;
    paymentMethod?: string;
    deletedAt?: Date | string;
    deletedBy?: string;
}

export default function POSSalesTrashPage() {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);

    const {
        permissions: { canViewTrash, canRestore, canPermanentDelete },
        isPending,
        session,
    } = usePOSPermissions();

    useEffect(() => { setIsMounted(true); }, []);

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
        <TrashPage<DeletedPOSSale>
            title="POS Sales Trash"
            description="Deleted POS sales that can be restored or permanently removed"
            icon={<ShoppingBag className="h-8 w-8 text-destructive" />}
            apiEndpoint="/api/pos/trash"
            restoreEndpoint="/api/pos/trash/restore"
            deleteEndpoint="/api/pos/trash/delete"
            backUrl="../pos"
            backLabel="Back to POS Sales"
            getItemName={(item) => item.saleNumber || "Unnamed Sale"}
            getItemDescription={(item) => {
                const customer = item.customerName || "Walk-in Customer";
                const amount = formatCurrency(item.grandTotal || 0);
                const method = item.paymentMethod || "N/A";
                return `${customer} • ${amount} • ${method}`;
            }}
        />
    );
}