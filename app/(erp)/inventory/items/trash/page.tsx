// app/inventory/items/trash/page.tsx

'use client';

import { TrashPage } from '@/components/shared/TrashPage';
import { Layers } from 'lucide-react';
import { formatCurrency } from '@/utils/formatters/currency';
import { useItemPermissions } from '@/hooks/use-permissions';
import { AccessDenied } from '@/components/shared/access-denied';
import { useState, useEffect } from 'react';
import { Spinner } from '@/components/ui/spinner';
import { redirect, usePathname } from 'next/navigation';

interface DeletedItem {
    _id: string;
    name?: string;
    types?: string[];
    category?: string;
    sellingPrice?: number;
    costPrice?: number;
    deletedAt?: Date | string;
    deletedBy?: string;
}

export default function ItemsTrashPage() {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const {
        permissions: { canViewTrash },
        isPending,
        session,
    } = useItemPermissions();

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
    if (!session) redirect(`/login?callbackURL=${encodeURIComponent(pathname)}`);
    if (!canViewTrash) return <AccessDenied />;

    return (
        <TrashPage<DeletedItem>
            title="Items Trash"
            description="Deleted items that can be restored or permanently removed"
            icon={<Layers className="h-8 w-8 text-destructive" />}
            apiEndpoint="/api/items/trash"
            restoreEndpoint="/api/items/trash/restore"
            deleteEndpoint="/api/items/trash/delete"
            backUrl="../items"
            backLabel="Back to Items"
            getItemName={(item) => item.name || 'Unnamed Item'}
            getItemDescription={(item) => {
                const types = item.types?.map((t) => t).join(' & ') || '—';
                const priceInfo = item.types?.includes('product')
                    ? `Sell: ${formatCurrency(item.sellingPrice || 0)}`
                    : item.types?.includes('material')
                        ? `Cost: ${formatCurrency(item.costPrice || 0)}`
                        : '';
                return `${types} • ${item.category || '—'} • ${priceInfo}`;
            }}
        />
    );
}