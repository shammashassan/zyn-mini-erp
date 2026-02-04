// app/people/parties/page.tsx

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { Users, Trash2, UserCheck, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { useDataTable } from "@/hooks/use-data-table";
import { PartyForm } from "./party-form";
import { PartyViewModal } from "./party-view-modal";
import { getPartyColumns } from "./columns";
import type { IParty } from "@/models/Party";
import Link from "next/link";
import { StatsCards, type StatItem } from "@/components/stats-cards";
import { usePartyPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";

function PartiesPageSkeleton() {
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

            {/* Tabs Switcher Skeleton */}
            <div className="flex justify-center items-center mb-4">
                <Skeleton className="h-10 w-full max-w-2xl rounded-md" />
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

export default function PartiesPage() {
    return (
        <Suspense fallback={
            <div className="flex flex-1 items-center justify-center min-h-[400px]">
                <Spinner className="size-10" />
            </div>
        }>
            <PartiesPageContent />
        </Suspense>
    );
}

function PartiesPageContent() {
    const [parties, setParties] = useState<IParty[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isViewOpen, setIsViewOpen] = useState(false);
    const [selectedParty, setSelectedParty] = useState<IParty | null>(null);
    const [viewParty, setViewParty] = useState<IParty | null>(null);
    const [activeTab, setActiveTab] = useState<"all" | "customers" | "suppliers">("all");
    const [isMounted, setIsMounted] = useState(false);

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
    } = usePartyPermissions();

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const fetchParties = useCallback(async (background = false) => {
        if (!canRead) return;
        try {
            if (!background) {
                setIsLoading(true);
            }

            const res = await fetch("/api/parties");
            if (!res.ok) throw new Error("Failed to fetch parties");
            const data = await res.json();
            setParties(data);
        } catch (error) {
            console.error("Error fetching parties:", error);
            if (!background) toast.error("Could not load parties.");
        } finally {
            if (!background) {
                setIsLoading(false);
            }
        }
    }, [canRead]);

    useEffect(() => {
        if (isMounted && canRead) {
            fetchParties();
        } else if (isMounted && !canRead && !isPending) {
            toast.error("You don't have permission to view parties", {
                description: "Only managers and above can access this page",
            });
            setIsLoading(false);
        }
    }, [isMounted, canRead, isPending, fetchParties]);

    useEffect(() => {
        const onFocus = () => {
            if (isMounted && canRead) {
                fetchParties(true);
            }
        };

        window.addEventListener("focus", onFocus);
        return () => window.removeEventListener("focus", onFocus);
    }, [fetchParties, isMounted, canRead]);

    const handleOpenForm = (party: IParty | null = null) => {
        if (!canCreate && !party) {
            toast.error("You don't have permission to create parties");
            return;
        }
        if (!canUpdate && party) {
            toast.error("You don't have permission to update parties");
            return;
        }

        setSelectedParty(party);
        setIsFormOpen(true);
    };

    const handleOpenView = (party: IParty) => {
        setViewParty(party);
        setIsViewOpen(true);
    };

    const handleFormSubmit = async (data: any, id?: string) => {
        if (!canCreate && !id) return;
        if (!canUpdate && id) return;

        const url = id ? `/api/parties/${id}` : "/api/parties";
        const method = id ? "PUT" : "POST";

        toast.promise(
            fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            }),
            {
                loading: id ? "Updating party..." : "Creating party...",
                success: () => {
                    fetchParties();
                    setIsFormOpen(false);
                    setSelectedParty(null);
                    return `Party ${id ? "updated" : "created"} successfully.`;
                },
                error: (err) => {
                    return err.message || `Failed to ${id ? "update" : "create"} party.`;
                },
            }
        );
    };

    const handleDelete = async (selectedParties: IParty[]) => {
        if (!canDelete) {
            toast.error("You don't have permission to delete parties");
            return;
        }

        try {
            const deletePromises = selectedParties.map((party) =>
                fetch(`/api/parties/${party._id}`, { method: 'DELETE' })
            );

            await Promise.all(deletePromises);

            toast.success(`${selectedParties.length} part${selectedParties.length === 1 ? 'y' : 'ies'} moved to trash.`);
            fetchParties();
        } catch (error) {
            console.error('Failed to delete parties:', error);
            toast.error('Failed to delete parties.');
        }
    };

    const columns = useMemo(() => getPartyColumns(
        (party) => handleOpenView(party),
        (party) => handleOpenForm(party),
        (party) => handleDelete([party]),
        { canRead, canUpdate, canDelete }
    ), [canRead, canUpdate, canDelete]);

    const filteredParties = useMemo(() => {
        if (activeTab === "customers") {
            return parties.filter(p => p.roles.customer);
        } else if (activeTab === "suppliers") {
            return parties.filter(p => p.roles.supplier);
        }
        return parties;
    }, [parties, activeTab]);

    const { table } = useDataTable({
        data: filteredParties,
        columns,
        initialState: {
            sorting: [{ id: "company", desc: false }],
            pagination: {
                pageSize: 10,
                pageIndex: 0
            },
        },
        getRowId: (row) => row._id,
    });

    const stats = useMemo(() => {
        return {
            total: parties.length,
            customers: parties.filter(p => p.roles.customer).length,
            suppliers: parties.filter(p => p.roles.supplier).length,
            both: parties.filter(p => p.roles.customer && p.roles.supplier).length,
        };
    }, [parties]);

    const statsData: StatItem[] = useMemo(() => [
        {
            name: "Total Parties",
            stat: stats.total.toString(),
            subtext: "All registered parties",
            changeType: "neutral",
        },
        {
            name: "Customers",
            stat: stats.customers.toString(),
            subtext: "Sales parties",
            changeType: "positive",
        },
        {
            name: "Suppliers",
            stat: stats.suppliers.toString(),
            subtext: "Purchase parties",
            changeType: "positive",
        },
        {
            name: "Dual Role",
            stat: stats.both.toString(),
            subtext: "Both customer & supplier",
            changeType: "neutral",
        }
    ], [stats]);

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

    if (!canRead) {
        return <AccessDenied />
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
                                    <Users className="h-8 w-8 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight">Parties</h1>
                                    <p className="text-muted-foreground">
                                        Manage customers, suppliers, and business relationships
                                    </p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Link href="/people/contacts">
                                    <Button variant="outline" className="gap-2">
                                        <Users className="h-4 w-4" />
                                        View Contacts
                                    </Button>
                                </Link>
                                {canViewTrash && (
                                    <Link href="/people/parties/trash">
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
                                        <Users className="h-4 w-4" />
                                        Add Party
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="px-4 lg:px-6">
                            <div className={cn("transition-opacity duration-200", isLoading && parties.length === 0 ? "opacity-50" : "opacity-100")}>
                                {isLoading && parties.length === 0 ? (
                                    <PartiesPageSkeleton />
                                ) : parties.length > 0 ? (
                                    <>
                                        {/* Statistics Cards */}
                                        <div className="mb-6">
                                            <StatsCards data={statsData} columns={4} />
                                        </div>

                                        {/* Tabs and Content */}
                                        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
                                            <div className="flex justify-center items-center mb-4">
                                                <TabsList className="flex justify-center w-full max-w-2xl grid-cols-3">
                                                    <TabsTrigger value="all" className="flex items-center gap-2">
                                                        <Users className="h-4 w-4" />
                                                        <span className="hidden sm:inline">All Parties</span>
                                                        <span className="sm:hidden">All</span>
                                                    </TabsTrigger>
                                                    <TabsTrigger value="customers" className="flex items-center gap-2">
                                                        <UserCheck className="h-4 w-4" />
                                                        <span className="hidden sm:inline">Customers</span>
                                                        <span className="sm:hidden">Customers</span>
                                                    </TabsTrigger>
                                                    <TabsTrigger value="suppliers" className="flex items-center gap-2">
                                                        <ShoppingCart className="h-4 w-4" />
                                                        <span className="hidden sm:inline">Suppliers</span>
                                                        <span className="sm:hidden">Suppliers</span>
                                                    </TabsTrigger>
                                                </TabsList>
                                            </div>

                                            <TabsContent value="all" className="mt-0">
                                                <Card>
                                                    <CardContent className="p-6">
                                                        <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                                                            <DataTable table={table}>
                                                                <DataTableToolbar table={table} />
                                                            </DataTable>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>

                                            <TabsContent value="customers" className="mt-0">
                                                <Card>
                                                    <CardContent className="p-6">
                                                        <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                                                            <DataTable table={table}>
                                                                <DataTableToolbar table={table} />
                                                            </DataTable>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>

                                            <TabsContent value="suppliers" className="mt-0">
                                                <Card>
                                                    <CardContent className="p-6">
                                                        <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50 pointer-events-none" : "opacity-100")}>
                                                            <DataTable table={table}>
                                                                <DataTableToolbar table={table} />
                                                            </DataTable>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </TabsContent>
                                        </Tabs>
                                    </>
                                ) : (
                                    /* Empty State */
                                    <Card>
                                        <CardContent className="flex flex-col items-center justify-center py-12">
                                            <Users className="h-12 w-12 text-muted-foreground mb-4" />
                                            <h3 className="text-lg font-semibold mb-2">No parties yet</h3>
                                            <p className="text-muted-foreground text-center mb-4 max-w-md">
                                                Start building your network by adding customers and suppliers.
                                                These will be used across all transactions.
                                            </p>
                                            {canCreate && (
                                                <Button onClick={() => handleOpenForm()} className="gap-2">
                                                    <Users className="h-4 w-4" />
                                                    Create First Party
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

            <PartyForm
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setSelectedParty(null);
                }}
                onSubmit={handleFormSubmit}
                defaultValues={selectedParty}
            />

            <PartyViewModal
                isOpen={isViewOpen}
                onClose={() => {
                    setIsViewOpen(false);
                    setViewParty(null);
                }}
                party={viewParty}
            />
        </>
    );
}