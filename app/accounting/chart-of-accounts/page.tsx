// app/accounting/chart-of-accounts/page.tsx - UPDATED: Skeleton Toggle Size Fix

"use client";

import React, { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { List, ListTree, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useDataTable } from "@/hooks/use-data-table";
import { COAForm } from "./coa-form";
import { GroupManagement } from "./group-management";
import { getCOAColumns } from "./columns";
import type { IChartOfAccount } from "@/models/ChartOfAccount";
import Link from "next/link";
import { StatsCards, type StatItem } from "@/components/stats-cards";
import { useChartOfAccountsPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { redirect } from "next/navigation";

// ✅ UPDATED: Skeleton matching Tax Report style and Toggle Size
function COAPageSkeleton() {
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

      {/* Tabs Switcher Skeleton - UPDATED WIDTH */}
      <div className="flex justify-center items-center mb-4">
        <Skeleton className="h-10 w-full max-w-2xl rounded-md" />
      </div>

      {/* Content Skeleton */}
      <Card>
        <CardContent className="p-6 space-y-8">
          {[...Array(3)].map((_, i) => (
            <div key={`group-${i}`} className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-9 w-28" />
              </div>
              <div className="pl-14 space-y-3">
                <Skeleton className="h-12 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ChartOfAccountsPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 items-center justify-center min-h-[400px]">
        <Spinner className="size-10" />
      </div>
    }>
      <ChartOfAccountsPageContent />
    </Suspense>
  );
}

function ChartOfAccountsPageContent() {
  const [accounts, setAccounts] = useState<IChartOfAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<IChartOfAccount | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "tree">("tree");
  const [prefilledGroup, setPrefilledGroup] = useState<string | undefined>();
  const [prefilledSubGroup, setPrefilledSubGroup] = useState<string | undefined>();
  const [isMounted, setIsMounted] = useState(false);

  const {
    permissions: {
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      canActivate,
      canDeactivate,
      canViewTrash,
    },
    session,
    isPending,
  } = useChartOfAccountsPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchAccounts = useCallback(async (background = false) => {
    if (!canRead) return;
    try {
      if (!background) {
        setIsLoading(true);
      }

      const res = await fetch("/api/chart-of-accounts");
      if (!res.ok) throw new Error("Failed to fetch chart of accounts");
      const data = await res.json();
      setAccounts(data);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      if (!background) toast.error("Could not load chart of accounts.");
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, [canRead]);

  useEffect(() => {
    if (isMounted && canRead) {
      fetchAccounts();
    } else if (isMounted && !canRead && !isPending) {
      toast.error("You don't have permission to view chart of accounts", {
        description: "Only managers and above can access this page",
      });
      setIsLoading(false);
    }
  }, [isMounted, canRead, isPending, fetchAccounts]);

  useEffect(() => {
    const onFocus = () => {
      if (isMounted && canRead) {
        fetchAccounts(true);
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchAccounts, isMounted, canRead]);

  const handleOpenForm = (account: IChartOfAccount | null = null, group?: string, subGroup?: string) => {
    if (!canCreate && !account) {
      toast.error("You don't have permission to create accounts");
      return;
    }
    if (!canUpdate && account) {
      toast.error("You don't have permission to update accounts");
      return;
    }

    setSelectedAccount(account);
    setPrefilledGroup(group);
    setPrefilledSubGroup(subGroup);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: any, id?: string) => {
    if (!canCreate && !id) return;
    if (!canUpdate && id) return;

    const url = id ? `/api/chart-of-accounts/${id}` : "/api/chart-of-accounts";
    const method = id ? "PUT" : "POST";

    toast.promise(
      fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
      {
        loading: id ? "Updating account..." : "Creating account...",
        success: () => {
          fetchAccounts();
          setIsFormOpen(false);
          setSelectedAccount(null);
          setPrefilledGroup(undefined);
          setPrefilledSubGroup(undefined);
          return `Account ${id ? "updated" : "created"} successfully.`;
        },
        error: (err) => {
          return err.message || `Failed to ${id ? "update" : "create"} account.`;
        },
      }
    );
  };

  const handleDelete = async (selectedAccounts: IChartOfAccount[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete accounts");
      return;
    }

    try {
      const deletePromises = selectedAccounts.map((account) =>
        fetch(`/api/chart-of-accounts/${account._id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      toast.success(`${selectedAccounts.length} account(s) moved to trash.`);
      fetchAccounts();
    } catch (error) {
      console.error('Failed to delete accounts:', error);
      toast.error('Failed to delete accounts.');
    }
  };

  const handleToggleStatus = async (account: IChartOfAccount) => {
    if (!canActivate && !canDeactivate) {
      toast.error("You don't have permission to change account status");
      return;
    }

    if (account.isActive && !canDeactivate) {
      toast.error("You don't have permission to deactivate accounts");
      return;
    }

    if (!account.isActive && !canActivate) {
      toast.error("You don't have permission to activate accounts");
      return;
    }

    try {
      const res = await fetch(`/api/chart-of-accounts/${account._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !account.isActive }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(`Account ${account.isActive ? 'deactivated' : 'activated'} successfully.`);
      fetchAccounts();
    } catch (error) {
      toast.error("Failed to update account status.");
    }
  };

  const columns = useMemo(() => getCOAColumns(
    (account) => handleOpenForm(account),
    (account) => handleDelete([account]),
    handleToggleStatus,
    { canUpdate, canDelete, canActivate, canDeactivate }
  ), [canUpdate, canDelete, canActivate, canDeactivate]);

  const columnsWithOptions = useMemo(() => {
    const groupOptions = [
      { label: "Assets", value: "Assets", count: accounts.filter(a => a.groupName === "Assets").length },
      { label: "Liabilities", value: "Liabilities", count: accounts.filter(a => a.groupName === "Liabilities").length },
      { label: "Equity", value: "Equity", count: accounts.filter(a => a.groupName === "Equity").length },
      { label: "Income", value: "Income", count: accounts.filter(a => a.groupName === "Income").length },
      { label: "Expenses", value: "Expenses", count: accounts.filter(a => a.groupName === "Expenses").length },
    ].filter(opt => opt.count > 0);

    return columns.map((col: any) => {
      if (col.accessorKey === "groupName") {
        return { ...col, meta: { ...col.meta, options: groupOptions } };
      }
      return col;
    });
  }, [columns, accounts]);

  const { table } = useDataTable({
    data: accounts,
    columns: columnsWithOptions,
    initialState: {
      sorting: [{ id: "accountCode", desc: false }],
      pagination: {
        pageSize: 10,
        pageIndex: 0
      },
    },
    getRowId: (row) => row._id,
  });

  const existingSubGroups = useMemo(() => {
    return [...new Set(accounts.map(acc => acc.subGroup))];
  }, [accounts]);

  const stats = useMemo(() => {
    return {
      total: accounts.length,
      active: accounts.filter(acc => acc.isActive).length,
      groups: new Set(accounts.map(acc => acc.groupName)).size,
      subGroups: existingSubGroups.length,
    };
  }, [accounts, existingSubGroups]);

  const statsData: StatItem[] = useMemo(() => [
    {
      name: "Total Accounts",
      stat: stats.total.toString(),
      subtext: "Total registered accounts",
      changeType: "neutral",
    },
    {
      name: "Active Accounts",
      stat: stats.active.toString(),
      subtext: "Currently in use",
      changeType: "positive",
    },
    {
      name: "Account Groups",
      stat: stats.groups.toString(),
      subtext: "Primary categories",
      changeType: "neutral",
    },
    {
      name: "Subgroups",
      stat: stats.subGroups.toString(),
      subtext: "Detailed categories",
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
                  <ListTree className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Chart of Accounts</h1>
                  <p className="text-muted-foreground">
                    Manage your chart of accounts and transaction categories
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {canViewTrash && (
                  <Link href="/accounting/chart-of-accounts/trash">
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
                    <ListTree className="h-4 w-4" />
                    Add Account
                  </Button>
                )}
              </div>
            </div>

            <div className="px-4 lg:px-6">
              {/* ✅ UPDATED: Matching Tax Report transition pattern */}
              <div className={cn("transition-opacity duration-200", isLoading && accounts.length === 0 ? "opacity-50" : "opacity-100")}>
                {isLoading && accounts.length === 0 ? (
                  <COAPageSkeleton />
                ) : accounts.length > 0 ? (
                  <>
                    {/* Statistics Cards */}
                    <div className="mb-6">
                      <StatsCards data={statsData} columns={4} />
                    </div>

                    {/* View Toggle and Content */}
                    <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "table" | "tree")}>
                      <div className="flex justify-center items-center mb-4">
                        <TabsList className="flex justify-center w-full max-w-2xl grid-cols-3">
                          <TabsTrigger value="tree" className="flex items-center gap-2">
                            <ListTree className="h-4 w-4" />
                            <span className="hidden sm:inline">Tree View</span>
                          </TabsTrigger>
                          <TabsTrigger value="table" className="flex items-center gap-2">
                            <List className="h-4 w-4" />
                            <span className="hidden sm:inline">Table View</span>
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      <TabsContent value="tree" className="mt-0">
                        <GroupManagement
                          accounts={accounts}
                          onCreateAccount={(group, subGroup) => handleOpenForm(null, group, subGroup)}
                          canCreate={canCreate}
                        />
                      </TabsContent>

                      <TabsContent value="table" className="mt-0">
                        <Card>
                          <CardContent className="p-6">
                            {/* ✅ UPDATED: Table transition like Tax Report */}
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
                      <ListTree className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No accounts in chart yet</h3>
                      <p className="text-muted-foreground text-center mb-4 max-w-md">
                        Start building your chart of accounts by creating account entries.
                        These will be used to categorize all financial transactions.
                      </p>
                      {canCreate && (
                        <Button onClick={() => handleOpenForm()} className="gap-2">
                          <ListTree className="h-4 w-4" />
                          Create First Account
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

      <COAForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedAccount(null);
          setPrefilledGroup(undefined);
          setPrefilledSubGroup(undefined);
        }}
        onSubmit={handleFormSubmit}
        defaultValues={selectedAccount}
        existingSubGroups={existingSubGroups}
        existingAccounts={accounts}
      />
    </>
  );
}