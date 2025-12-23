"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getColumns } from "./columns";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { PayeeForm } from "./payee-form";
import { PayeeViewModal } from "./payee-view-modal";
import type { IPayee } from "@/models/Payee";
import { Users, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePayeePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";

type PayeeFormData = {
  name: string;
  type: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  notes?: string;
};

export default function PayeesPage() {
  const [payees, setPayees] = useState<IPayee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPayeeForEdit, setSelectedPayeeForEdit] = useState<IPayee | null>(null);
  
  // View Modal State
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [payeeToView, setPayeeToView] = useState<IPayee | null>(null);

  const [isMounted, setIsMounted] = useState(false);

  const {
    permissions: {
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      canViewTrash
    },
    isPending: isPermissionsPending,
  } = usePayeePermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchPayees = async () => {
    if (!canRead) return;
    try {
      setIsLoading(true);
      const res = await fetch("/api/payees");
      if (!res.ok) throw new Error("Failed to fetch payees");
      const data = await res.json();
      setPayees(data);
    } catch (error) {
      toast.error("Could not load payees.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted && canRead) {
      fetchPayees();
    }
  }, [isMounted, canRead]);

  const handleOpenForm = (payee: IPayee | null = null) => {
    if (!canCreate && !payee) {
      toast.error("You don't have permission to create payees");
      return;
    }
    if (!canUpdate && payee) {
      toast.error("You don't have permission to update payees");
      return;
    }
    setSelectedPayeeForEdit(payee);
    setIsFormOpen(true);
  };

  const handleViewDetails = (payee: IPayee) => {
    setPayeeToView(payee);
    setIsViewModalOpen(true);
  };

  const handleFormSubmit = async (data: PayeeFormData, id?: string) => {
    const url = id ? `/api/payees/${id}` : "/api/payees";
    const method = id ? "PUT" : "POST";

    toast.promise(
      fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
      {
        loading: id ? "Updating payee..." : "Adding payee...",
        success: () => {
          fetchPayees();
          setIsFormOpen(false);
          setSelectedPayeeForEdit(null);
          return `Payee ${id ? "updated" : "added"} successfully.`;
        },
        error: `Failed to ${id ? "update" : "add"} payee.`,
      }
    );
  };

  const handleDelete = async (selectedPayees: IPayee[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete payees");
      return;
    }

    try {
      const deletePromises = selectedPayees.map((payee) =>
        fetch(`/api/payees/${payee._id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      toast.success(
        `${selectedPayees.length} ${selectedPayees.length === 1 ? 'payee' : 'payees'} moved to trash.`,
      );

      fetchPayees();
    } catch (error) {
      console.error('Failed to delete payees:', error);
      toast.error('Failed to delete payees.');
    }
  };

  const columns = useMemo(() => getColumns(
    (payee) => handleOpenForm(payee),
    (payeeOrId: IPayee | string) => {
      const id = typeof payeeOrId === 'object' ? payeeOrId._id : payeeOrId;
      const payeeToDelete = payees.find((p: IPayee) => p._id === id);
      if (payeeToDelete) {
        handleDelete([payeeToDelete]);
      }
    },
    (payee) => handleViewDetails(payee),
    { canUpdate, canDelete }
  ), [payees, canUpdate, canDelete]);

  const { table } = useDataTable({
    data: payees,
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

  if (!isMounted || isPermissionsPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10"/>
      </div>
    );
  }

  if (!canRead) {
    return <AccessDenied />;
  }

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 px-4 lg:px-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Users className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Payees</h1>
                  <p className="text-muted-foreground">
                    Manage all your payment recipients
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {canViewTrash && (
                  <Link href="./payees/trash">
                    <Button variant="outline" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Trash
                    </Button>
                  </Link>
                )}
                {canCreate && (
                  <Button onClick={() => {
                    setSelectedPayeeForEdit(null);
                    setIsFormOpen(true);
                  }} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Payee
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 px-4 lg:px-6 xl:gap-6">
              <Card>
                <CardContent className="p-6">
                  {isLoading ? (
                    <DataTableSkeleton
                      columnCount={columns.length}
                      rowCount={10}
                    />
                  ) : (
                    <>
                      <DataTable table={table}>
                        <DataTableToolbar table={table} />
                      </DataTable>
                    </>
                  )}
                </CardContent>
              </Card>

              {payees.length === 0 && !isLoading && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No payees yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Start managing your payment recipients by adding your first payee.
                    </p>
                    {canCreate && (
                      <Button onClick={() => {
                        setSelectedPayeeForEdit(null);
                        setIsFormOpen(true);
                      }} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Your First Payee
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <PayeeForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedPayeeForEdit(null);
        }}
        onSubmit={handleFormSubmit}
        defaultValues={selectedPayeeForEdit}
      />

      <PayeeViewModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setPayeeToView(null);
        }}
        payee={payeeToView}
      />
    </>
  );
}