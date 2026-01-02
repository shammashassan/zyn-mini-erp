// app/materials/page.tsx - UPDATED: Smooth transitions with silent refresh

"use client";

import * as React from "react";
import { useSession } from "@/lib/auth-client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { getColumns } from "./columns";
import { MaterialForm } from "./material-form";
import type { IMaterial } from "@/models/Material";
import { Button } from "@/components/ui/button";
import { Layers, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMaterialPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  React.useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [query]);
  return matches;
};

type MaterialFormData = {
  name: string;
  type: string;
  unit: string;
  stock: number;
  unitCost: number;
};

/**
 * The main page component for managing materials.
 * @returns {JSX.Element} The rendered component.
 */
export default function MaterialsPage() {
  const [materials, setMaterials] = useState<IMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<IMaterial | null>(null);
  const isSmallScreen = useMediaQuery("(max-width: 640px)");
  const [isMounted, setIsMounted] = useState(false);

  const {
    permissions: {
      canRead,
      canCreate,
      canUpdate,
      canDelete,
      canViewTrash
    },
    isPending,
  } = useMaterialPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Fetches the list of materials from the API.
   * @param {boolean} background - If true, fetches silently without showing loading state
   */
  const fetchMaterials = useCallback(async (background = false) => {
    if (!canRead) return;
    
    try {
      // Only show loading spinner if not a background fetch
      if (!background) {
        setIsLoading(true);
      }

      const res = await fetch("/api/materials");
      if (!res.ok) throw new Error("Failed to fetch materials");
      const data = await res.json();
      setMaterials(data);
    } catch (error) {
      console.error("Materials fetch error:", error);
      if (!background) {
        toast.error("Could not load materials.");
      }
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, [canRead]);

  // Standard fetch on component mount
  useEffect(() => {
    if (isMounted && canRead) {
      fetchMaterials();
    }
  }, [isMounted, canRead, fetchMaterials]);

  // ✅ NEW: Window Focus Listener - SILENT MODE
  useEffect(() => {
    const onFocus = () => {
      if (isMounted && canRead) {
        fetchMaterials(true);
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchMaterials, isMounted, canRead]);

  const handleOpenForm = (material: IMaterial | null = null) => {
    if (!canCreate && !material) {
      toast.error("You don't have permission to create materials");
      return;
    }
    if (!canUpdate && material) {
      toast.error("You don't have permission to update materials");
      return;
    }
    setSelectedMaterial(material);
    setIsFormOpen(true);
  };

  /**
   * Handles the submission of the material form (create or update).
   * @param {MaterialFormData} data - The form data.
   * @param {string | undefined} id - The ID of the material being edited.
   */
  const handleFormSubmit = async (data: MaterialFormData, id?: string) => {
    const url = id ? `/api/materials/${id}` : "/api/materials";
    const method = id ? "PUT" : "POST";

    toast.promise(
      fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
      {
        loading: id ? "Updating material..." : "Adding material...",
        success: () => {
          fetchMaterials();
          setIsFormOpen(false);
          setSelectedMaterial(null);
          return `Material ${id ? "updated" : "added"} successfully.`;
        },
        error: `Failed to ${id ? "update" : "add"} material.`,
      }
    );
  };

  /**
   * Handles soft deletion of materials
   * Materials are soft-deleted (not permanently removed)
   */
  const handleDelete = async (selectedMaterials: IMaterial[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete materials");
      return;
    }

    try {
      const deletePromises = selectedMaterials.map((material) =>
        fetch(`/api/materials/${material._id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      toast.success(
        `${selectedMaterials.length} ${selectedMaterials.length === 1 ? 'material' : 'materials'} moved to trash.`,
      );

      // Refresh the list
      fetchMaterials();
    } catch (error) {
      console.error('Failed to delete materials:', error);
      toast.error('Failed to delete materials.');
    }
  };

  // Memoize columns to prevent re-creation on every render
  const columns = useMemo(() => getColumns(
    (material) => handleOpenForm(material),
    (materialOrId: IMaterial | string) => {
      const id = typeof materialOrId === 'object' ? materialOrId._id : materialOrId;
      const materialToDelete = materials.find((m: IMaterial) => m._id === id);
      if (materialToDelete) {
        handleDelete([materialToDelete]);
      }
    },
    { canUpdate, canDelete }
  ), [materials, canUpdate, canDelete]);

  const columnsWithOptions = useMemo(() => {
    const typeOptions = materials.length > 0
      ? Array.from(new Set(materials.map(m => m.type)))
        .map(type => ({
          label: type,
          value: type,
          count: materials.filter(m => m.type === type).length,
        }))
      : [];

    return columns.map((col: any) => {
      if (col.accessorKey === "type") {
        return { ...col, meta: { ...col.meta, options: typeOptions } };
      }
      return col;
    });
  }, [columns, materials]);

  // Extract existing types from materials
  const existingTypes = React.useMemo(() => {
    const types = new Set(materials.map(mat => mat.type).filter(Boolean));
    return Array.from(types);
  }, [materials]);

  // Extract existing units from materials
  const existingUnits = React.useMemo(() => {
    const units = new Set(materials.map(mat => mat.unit).filter(Boolean));
    return Array.from(units);
  }, [materials]);

  const { table } = useDataTable({
    data: materials,
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
                  <Layers className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Materials</h1>
                  <p className="text-muted-foreground">
                    Manage your raw materials and inventory
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {canViewTrash && (
                  <Link href="./materials/trash">
                    <Button variant="outline" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Trash
                    </Button>
                  </Link>
                )}
                {canCreate && (
                  <Button onClick={() => {
                    setSelectedMaterial(null);
                    setIsFormOpen(true);
                  }} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Material
                  </Button>
                )}
              </div>
            </div>

            {/* ✅ UPDATED: Table with smooth opacity transition */}
            <div className="flex flex-col gap-4 px-4 lg:px-6 xl:gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className={cn(
                    "transition-opacity duration-200",
                    isLoading && !materials.length ? "opacity-50" : "opacity-100"
                  )}>
                    {isLoading && !materials.length ? (
                      <DataTableSkeleton
                        columnCount={columnsWithOptions.length}
                        rowCount={10}
                      />
                    ) : (
                      <DataTable table={table}>
                        <DataTableToolbar table={table} />
                      </DataTable>
                    )}
                  </div>
                </CardContent>
              </Card>

              {materials.length === 0 && !isLoading && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Layers className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No materials yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Start managing your inventory by adding your first material.
                    </p>
                    {canCreate && (
                      <Button onClick={() => {
                        setSelectedMaterial(null);
                        setIsFormOpen(true);
                      }} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Your First Material
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <MaterialForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedMaterial(null);
        }}
        onSubmit={handleFormSubmit}
        defaultValues={selectedMaterial}
        existingTypes={existingTypes}
        existingUnits={existingUnits}
      />
    </>
  );
}