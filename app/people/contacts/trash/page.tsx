// app/people/contacts/trash/page.tsx

"use client";

import { TrashPage } from "@/components/TrashPage";
import { UserCircle } from "lucide-react";
import { useContactPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { useState, useEffect } from "react";
import { Spinner } from "@/components/ui/spinner";
import { redirect } from "next/navigation";

interface DeletedContact {
    _id: string;
    name: string;
    designation?: string;
    phone?: string;
    email?: string;
    partyId?: {
        _id: string;
        company?: string;
        name?: string;
    };
    isPrimary: boolean;
    deletedAt?: Date | string;
    deletedBy?: string;
}

export default function ContactsTrashPage() {
    const [isMounted, setIsMounted] = useState(false);
    const {
        permissions: { canViewTrash },
        isPending,
        session
    } = useContactPermissions();

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
        redirect('/login');
    }

    if (!canViewTrash) {
        return <AccessDenied />;
    }

    return (
        <TrashPage<DeletedContact>
            title="Contacts Trash"
            description="Deleted contacts that can be restored or permanently removed"
            icon={<UserCircle className="h-8 w-8 text-destructive" />}
            apiEndpoint="/api/contacts/trash"
            restoreEndpoint="/api/contacts/trash/restore"
            deleteEndpoint="/api/contacts/trash/delete"
            backUrl="/people/contacts"
            backLabel="Back to Contacts"
            getItemName={(item) =>
                item.name
            }
            getItemDescription={(item) => {
                const parts = [];

                if (item.partyId) {
                    const partyName = item.partyId.company || item.partyId.name;
                    if (partyName) parts.push(partyName);
                }

                if (item.designation) parts.push(item.designation);
                if (item.isPrimary) parts.push("Primary");

                return parts.join(" • ");
            }}
        />
    );
}