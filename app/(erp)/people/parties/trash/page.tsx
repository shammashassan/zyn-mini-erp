// app/people/parties/trash/page.tsx

"use client";

import { TrashPage } from "@/components/shared/TrashPage";
import { Users } from "lucide-react";
import { usePartyPermissions } from "@/hooks/use-permissions";
import { forbidden } from "next/navigation";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { redirect, usePathname } from "next/navigation";

interface DeletedParty {
    _id: string;
    company?: string;
    name?: string;
    roles: {
        customer: boolean;
        supplier: boolean;
    };
    city?: string;
    state?: string;
    deletedAt?: Date | string;
    deletedBy?: string;
}

export default function PartiesTrashPage() {
    const pathname = usePathname();
    const [isMounted, setIsMounted] = useState(false);
    const {
        permissions: { canViewTrash },
        isPending,
        session
    } = usePartyPermissions();

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
        <TrashPage<DeletedParty>
            title="Parties Trash"
            description="Deleted parties that can be restored or permanently removed"
            icon={<Users className="h-8 w-8 text-destructive" />}
            apiEndpoint="/api/parties/trash"
            restoreEndpoint="/api/parties/trash/restore"
            deleteEndpoint="/api/parties/trash/delete"
            backUrl="/people/parties"
            backLabel="Back to Parties"
            getItemName={(item) =>
                item.company || item.name || "Unknown Party"
            }
            getItemDescription={(item) => {
                const roles = [];
                if (item.roles.customer) roles.push("Customer");
                if (item.roles.supplier) roles.push("Supplier");
                const location = [item.city, item.state].filter(Boolean).join(", ");
                return [roles.join(" & "), location].filter(Boolean).join(" • ");
            }}
        />
    );
}