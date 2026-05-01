// app/people/contacts/page.tsx

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { UserCircle, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { ContactForm } from "./contact-form";
import { ContactViewModal } from "./contact-view-modal";
import { getContactColumns } from "./columns";
import type { IContact } from "@/models/Contact";
import type { IParty } from "@/models/Party";
import Link from "next/link";
import { StatsCards, type StatItem } from "@/components/shared/stats-cards";
import { useContactPermissions } from "@/hooks/use-permissions";
import { forbidden } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useSearchParams, redirect, usePathname } from "next/navigation";

function ContactsPageSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in-50">
            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <Card key={`stat-${i}`} className="p-6 py-3">
                        <CardContent className="p-0 space-y-3">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-5 w-14 rounded-full" />
                            </div>
                            <Skeleton className="h-9 w-32" />
                            <Skeleton className="h-3 w-20" />
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Content Skeleton */}
            <Card>
                <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-10 w-full" />
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={`row-${i}`} className="h-16 w-full" />
                    ))}
                </CardContent>
            </Card>
        </div>
    );
}

export default function ContactsPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-1 items-center justify-center min-h-[400px]">
                <Spinner className="size-10" />
            </div>
        }>
            <ContactsPageContent />
        </Suspense>
    );
}

function ContactsPageContent() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const partyIdFromUrl = searchParams.get('partyId');

    const [contacts, setContacts] = useState<IContact[]>([]);
    const [parties, setParties] = useState<IParty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedContact, setSelectedContact] = useState<IContact | null>(null);
    const [viewContact, setViewContact] = useState<IContact | null>(null);
    const [isMounted, setIsMounted] = useState(false);
    const [filterPartyId, setFilterPartyId] = useState<string | null>(partyIdFromUrl);

    const {
        permissions: {
            canRead,
            canCreate,
            canUpdate,
            canDelete,
            canViewTrash,
        },
        session,
        isPending,
    } = useContactPermissions();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    useEffect(() => {
        if (partyIdFromUrl) {
            setFilterPartyId(partyIdFromUrl);
        }
    }, [partyIdFromUrl]);

    const fetchContacts = useCallback(async (background = false) => {
        if (!canRead) return;
        try {
            if (!background) {
                setIsLoading(true);
            }

            const url = filterPartyId
                ? `/api/contacts?partyId=${filterPartyId}`
                : "/api/contacts";

            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch contacts");
            const data = await res.json();
            setContacts(data);
        } catch (error) {
            console.error("Error fetching contacts:", error);
            if (!background) toast.error("Could not load contacts.");
        } finally {
            if (!background) {
                setIsLoading(false);
            }
        }
    }, [canRead, filterPartyId]);

    const fetchParties = useCallback(async () => {
        try {
            const res = await fetch("/api/parties");
            if (!res.ok) throw new Error("Failed to fetch parties");
            const data = await res.json();
            setParties(data);
        } catch (error) {
            console.error("Error fetching parties:", error);
        }
    }, []);

    useEffect(() => {
        if (isMounted && canRead) {
            fetchContacts();
            fetchParties();
        } else if (isMounted && !canRead && !isPending) {
            toast.error("You don't have permission to view contacts", {
                description: "Only managers and above can access this page",
            });
            setIsLoading(false);
        }
    }, [isMounted, canRead, isPending, fetchContacts, fetchParties]);

    useEffect(() => {
        const onFocus = () => {
            if (isMounted && canRead) {
                fetchContacts(true);
            }
        };

        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [fetchContacts, isMounted, canRead]);

    const handleOpenForm = (contact: IContact | null = null) => {
        if (!canCreate && !contact) {
            toast.error("You don't have permission to create contacts");
            return;
        }
        if (!canUpdate && contact) {
            toast.error("You don't have permission to update contacts");
            return;
        }

        setSelectedContact(contact);
        setIsFormOpen(true);
    };

    const handleOpenView = (contact: IContact) => {
        setViewContact(contact);
        setIsViewOpen(true);
    };

    const handleFormSubmit = async (data: any, id?: string) => {
        if (!canCreate && !id) return;
        if (!canUpdate && id) return;

        const url = id ? `/api/contacts/${id}` : "/api/contacts";
        const method = id ? "PUT" : "POST";

        toast.promise(
            fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }),
            {
                loading: id ? "Updating contact..." : "Creating contact...",
                success: () => {
                    fetchContacts();
                    setIsFormOpen(false);
                    setSelectedContact(null);
                    return `Contact ${id ? "updated" : "created"} successfully.`;
                },
                error: (err) => {
                    return err.message || `Failed to ${id ? "update" : "create"} contact.`;
                },
            }
        );
    };

    const handleDelete = async (selectedContacts: IContact[]) => {
        if (!canDelete) {
            toast.error("You don't have permission to delete contacts");
            return;
        }

        try {
            const deletePromises = selectedContacts.map((contact) =>
                fetch(`/api/contacts/${contact._id}`, { method: 'DELETE' })
            );

            await Promise.all(deletePromises);

            toast.success(`${selectedContacts.length} contact(s) moved to trash.`);
            fetchContacts();
        } catch (error) {
            console.error('Failed to delete contacts:', error);
            toast.error('Failed to delete contacts.');
        }
    };

    const handleSetPrimary = async (contact: IContact) => {
        if (!canUpdate) {
            toast.error("You don't have permission to update contacts");
            return;
        }

        try {
            const res = await fetch(`/api/contacts/${contact._id}/set-primary`, {
                method: 'POST',
            });

            if (!res.ok) throw new Error("Failed to set primary contact");

            toast.success("Primary contact updated successfully.");
            fetchContacts();
        } catch (error) {
            toast.error("Failed to set primary contact.");
        }
    };

    const handleToggleActive = async (contact: IContact) => {
        if (!canUpdate) {
            toast.error("You don't have permission to update contacts");
            return;
        }

        try {
            const res = await fetch(`/api/contacts/${contact._id}/set-active`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ active: !contact.isActive }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to update contact status");
            }

            toast.success(`Contact ${contact.isActive ? 'deactivated' : 'activated'} successfully.`);
            fetchContacts();
        } catch (error: any) {
            console.error('Error toggling contact status:', error);
            toast.error(error.message || "Failed to update contact status.");
        }
    };

    const columns = useMemo(() => getContactColumns(
        (contact) => handleOpenView(contact),
        (contact) => handleOpenForm(contact),
        (contact) => handleDelete([contact]),
        handleSetPrimary,
        handleToggleActive,
        { canRead, canUpdate, canDelete }
    ), [canRead, canUpdate, canDelete]);

    const { table } = useDataTable({
        data: contacts,
        columns,
        initialState: {
            sorting: [{ id: "name", desc: false }],
            pagination: {
                pageSize: 10,
                pageIndex: 0
            },
        },
        getRowId: (row) => row._id,
    });

    const stats = useMemo(() => {
        return {
            total: contacts.length,
            active: contacts.filter(c => c.isActive).length,
            primary: contacts.filter(c => c.isPrimary).length,
            parties: new Set(contacts.map(c =>
                typeof c.partyId === 'string' ? c.partyId : (c.partyId as any)?._id
            )).size,
        };
    }, [contacts]);

    const statsData: StatItem[] = useMemo(() => [
        {
            name: "Total Contacts",
            stat: stats.total.toString(),
            subtext: "All registered contacts",
            changeType: "neutral",
        },
        {
            name: "Active Contacts",
            stat: stats.active.toString(),
            subtext: "Currently available",
            changeType: "positive",
        },
        {
            name: "Primary Contacts",
            stat: stats.primary.toString(),
            subtext: "Default contacts",
            changeType: "neutral",
        },
        {
            name: "Parties",
            stat: stats.parties.toString(),
            subtext: "Linked parties",
            changeType: "neutral",
        }
    ], [stats]);

    const filteredParty = useMemo(() => {
        if (!filterPartyId) return null;
        return parties.find(p => p._id === filterPartyId);
    }, [filterPartyId, parties]);

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

    if (!canRead) {
        forbidden();
    }

    return (
        <>
            <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                        {/* Header */}
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 px-4 lg:px-6 gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <UserCircle className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">Contacts</h1>
                                    <p className="text-muted-foreground">
                                        {filteredParty
                                            ? `Contacts for ${filteredParty.company || filteredParty.name}`
                                            : "Manage contact persons for your parties"}
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {filterPartyId && (
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            setFilterPartyId(null);
                                            window.history.pushState({}, '', '/people/contacts');
                                        }}
                                    >
                                        Show All Contacts
                                    </Button>
                                )}
                                <Link href="/people/parties">
                                    <Button variant="outline" className="gap-2">
                                        <Users className="h-4 w-4" />
                                        View Parties
                                    </Button>
                                </Link>
                                {canViewTrash && (
                                    <Link href="/people/contacts/trash">
                                        <Button variant="outline" className="gap-2">
                                            <Trash2 className="h-4 w-4" />
                                            Trash
                                        </Button>
                                    </Link>
                                )}
                                {canCreate && (
                                    <Button
                                        onClick={() => handleOpenForm()}
                                        className="gap-2"
                                    >
                                        <UserCircle className="h-4 w-4" />
                                        Add Contact
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="px-4 lg:px-6">
                            <div className={cn("transition-opacity duration-200", isLoading && contacts.length === 0 ? "opacity-50" : "opacity-100")}>
                                {isLoading && contacts.length === 0 ? (
                                    <ContactsPageSkeleton />
                                ) : contacts.length > 0 ? (
                                    <>
                                        {/* Statistics Cards */}
                                        <div className="mb-6">
                                            <StatsCards data={statsData} columns={4} />
                                        </div>

                                        {/* Content */}
                                        <Card>
                                            <CardContent className="p-6">
                                                <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                                                    <DataTable table={table}>
                                                        <DataTableToolbar table={table} />
                                                    </DataTable>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </>
                                ) : (
                                    /* Empty State */
                                    <Card>
                                        <CardContent className="flex flex-col items-center justify-center py-12">
                                            <UserCircle className="h-12 w-12 text-muted-foreground mb-4" />
                                            <h3 className="text-lg font-semibold mb-2">No contacts yet</h3>
                                            <p className="text-muted-foreground text-center mb-4 max-w-md">
                                                {filteredParty
                                                    ? `No contacts found for ${filteredParty.company || filteredParty.name}. Add contact persons to manage communication.`
                                                    : "Start by adding contact persons for your parties. They will be used for communication and documentation."}
                                            </p>
                                            {canCreate && (
                                                <Button onClick={() => handleOpenForm()} className="gap-2">
                                                    <UserCircle className="h-4 w-4" />
                                                    Create First Contact
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <ContactForm
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelectedContact(null);
                }}
                onSubmit={handleFormSubmit}
                defaultValues={selectedContact}
                parties={parties}
                preselectedPartyId={filterPartyId || undefined}
            />

            <ContactViewModal
                isOpen={isViewOpen}
                onClose={() => {
                    setIsViewOpen(false);
                    setViewContact(null);
                }}
                contact={viewContact}
            />
        </>
    );
}