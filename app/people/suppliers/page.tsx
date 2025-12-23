// app/suppliers/page.tsx

"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Building2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { SupplierForm } from "./supplier-form";
import { SupplierViewModal } from "./supplier-view-modal";
import { getColumns } from "./columns";
import type { ISupplier } from "@/models/Supplier";
import Link from "next/link";
import { useSupplierPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";

type SupplierFormData = {
  name: string;
  email: string;
  vatNumber: string;
  district: string;
  city: string;
  street: string;
  buildingNo: string;
  postalCode: string;
  contactNumbers: string[];
};

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<ISupplier | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [supplierToView, setSupplierToView] = useState<ISupplier | null>(null);

  const {
    permissions: {
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      canViewTrash
    },
    isPending,
  } = useSupplierPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchSuppliers = useCallback(async () => {
    if (!canRead) return;
    try {
      setIsLoading(true);
      const res = await fetch("/api/suppliers");
      if (!res.ok) throw new Error("Failed to fetch suppliers");
      const data = await res.json();
      setSuppliers(data);
    } catch (error) {
      toast.error("Could not load suppliers.");
    } finally {
      setIsLoading(false);
    }
  }, [canRead]);

  useEffect(() => {
    if (isMounted && canRead) {
      fetchSuppliers();
    }
  }, [isMounted, canRead, fetchSuppliers]);

  const handleOpenForm = (supplier: ISupplier | null = null) => {
    if (!canCreate && !supplier) {
      toast.error("You don't have permission to create suppliers");
      return;
    }
    if (!canUpdate && supplier) {
      toast.error("You don't have permission to update suppliers");
      return;
    }
    setSelectedSupplier(supplier);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: SupplierFormData, id?: string) => {
    const url = id ? `/api/suppliers/${id}` : "/api/suppliers";
    const method = id ? "PUT" : "POST";

    toast.promise(
      fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
      {
        loading: id ? "Updating supplier..." : "Adding supplier...",
        success: () => {
          fetchSuppliers();
          setIsFormOpen(false);
          setSelectedSupplier(null);
          return `Supplier ${id ? "updated" : "added"} successfully.`;
        },
        error: `Failed to ${id ? "update" : "add"} supplier.`,
      }
    );
  };

  const handleDelete = async (selectedSuppliers: ISupplier[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete suppliers");
      return;
    }

    try {
      const deletePromises = selectedSuppliers.map((supplier) =>
        fetch(`/api/suppliers/${supplier._id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      toast.success(
        `${selectedSuppliers.length} ${selectedSuppliers.length === 1 ? 'supplier' : 'suppliers'} moved to trash.`,
      );

      fetchSuppliers();
    } catch (error) {
      console.error('Failed to delete suppliers:', error);
      toast.error('Failed to delete suppliers.');
    }
  };

  const handleViewDetails = (supplierName: string) => {
    const supplier = suppliers.find(s => s.name === supplierName);
    if (!supplier) return;
    
    setSupplierToView(supplier);
    setIsViewModalOpen(true);
  };

  const columns = useMemo(() => getColumns(
    (supplier) => handleOpenForm(supplier),
    (supplierOrId: ISupplier | string) => {
      const id = typeof supplierOrId === 'object' ? supplierOrId._id : supplierOrId;
      const supplierToDelete = suppliers.find((s: ISupplier) => s._id === id);
      if (supplierToDelete) {
        handleDelete([supplierToDelete]);
      }
    },
    handleViewDetails,
    { canUpdate, canDelete }
  ), [suppliers, canUpdate, canDelete]);

  const columnsWithOptions = useMemo(() => {
    return columns;
  }, [columns]);

  const { table } = useDataTable({
    data: suppliers,
    columns: columnsWithOptions,
    initialState: {
      sorting: [{ id: "name", desc: false }],
      pagination: {
        pageSize: 10,
        pageIndex: 0
      },
    },
    getRowId: (row) => row._id,
  });

  if (!isMounted || isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10"/>
      </div>
    );
  }

  if (!canRead) {
    return <AccessDenied />
  }

  return (
    <>
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 px-4 lg:px-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <Building2 className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
                  <p className="text-muted-foreground">
                    Manage your business suppliers and their information
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {canViewTrash && (
                  <Link href="./suppliers/trash">
                    <Button variant="outline" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Trash
                    </Button>
                  </Link>
                )}
                {canCreate && (
                  <Button onClick={() => {
                    setSelectedSupplier(null);
                    setIsFormOpen(true);
                  }} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Supplier
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 px-4 lg:px-6 xl:gap-6">
              <Card>
                <CardContent className="p-6">
                  {isLoading ? (
                    <DataTableSkeleton
                      columnCount={columnsWithOptions.length}
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

              {suppliers.length === 0 && !isLoading && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No suppliers yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Start building your supplier network by adding your first supplier.
                    </p>
                    {canCreate && (
                      <Button onClick={() => {
                        setSelectedSupplier(null);
                        setIsFormOpen(true);
                      }} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Your First Supplier
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <SupplierForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedSupplier(null);
        }}
        onSubmit={handleFormSubmit}
        defaultValues={selectedSupplier}
      />

      <SupplierViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        supplier={supplierToView}
      />
    </>
  );
}