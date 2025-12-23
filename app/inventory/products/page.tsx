// app/products/page.tsx

"use client";

import * as React from "react";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { DataTable } from "@/components/data-table/data-table";
import { Card, CardContent } from "@/components/ui/card";
import { getColumns } from "./columns";
import { ProductForm } from "./product-form";
import type { IProduct } from "@/models/Product";
import { Button } from "@/components/ui/button";
import { Package, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useProductPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";

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

type ProductFormData = {
  name: string;
  type: string;
  price: number;
};

export default function ProductsPage() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<IProduct | null>(null);
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
  } = useProductPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchProducts = async () => {
    if (!canRead) return;
    try {
      setIsLoading(true);
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
    } catch (error) {
      toast.error("Could not load products.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted && canRead) {
      fetchProducts();
    }
  }, [isMounted, canRead]);

  const handleOpenForm = (product: IProduct | null = null) => {
    if (!canCreate && !product) {
      toast.error("You don't have permission to create products");
      return;
    }
    if (!canUpdate && product) {
      toast.error("You don't have permission to update products");
      return;
    }
    setSelectedProduct(product);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: ProductFormData, id?: string) => {
    const url = id ? `/api/products/${id}` : "/api/products";
    const method = id ? "PUT" : "POST";

    toast.promise(
      fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
      {
        loading: id ? "Updating product..." : "Adding product...",
        success: () => {
          fetchProducts();
          setIsFormOpen(false);
          setSelectedProduct(null);
          return `Product ${id ? "updated" : "added"} successfully.`;
        },
        error: `Failed to ${id ? "update" : "add"} product.`,
      }
    );
  };

  const handleDelete = async (selectedProducts: IProduct[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete products");
      return;
    }

    try {
      const deletePromises = selectedProducts.map((product) =>
        fetch(`/api/products/${product._id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      toast.success(
        `${selectedProducts.length} ${selectedProducts.length === 1 ? 'product' : 'products'} moved to trash.`,
      );

      fetchProducts();
    } catch (error) {
      console.error('Failed to delete products:', error);
      toast.error('Failed to delete products.');
    }
  };

  const columns = useMemo(() => getColumns(
    (product) => handleOpenForm(product),
    (productOrId: IProduct | string) => {
      const id = typeof productOrId === 'object' ? productOrId._id : productOrId;
      const productToDelete = products.find((p: IProduct) => p._id === id);
      if (productToDelete) {
        handleDelete([productToDelete]);
      }
    },
    { canUpdate, canDelete }
  ), [products, canUpdate, canDelete]);

  const columnsWithOptions = useMemo(() => {
    const typeOptions = products.length > 0
      ? Array.from(new Set(products.map(p => p.type)))
        .map(type => ({
          label: type,
          value: type,
          count: products.filter(p => p.type === type).length,
        }))
      : [];

    return columns.map((col: any) => {
      if (col.accessorKey === "type") {
        return { ...col, meta: { ...col.meta, options: typeOptions } };
      }
      return col;
    });
  }, [columns, products]);

  const existingTypes = React.useMemo(() => {
    const types = new Set(products.map(prod => prod.type).filter(Boolean));
    return Array.from(types);
  }, [products]);

  const { table } = useDataTable({
    data: products,
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
                  <Package className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Products</h1>
                  <p className="text-muted-foreground">
                    Manage your inventory and product details
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {canViewTrash && (
                  <Link href="./products/trash">
                    <Button variant="outline" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Trash
                    </Button>
                  </Link>
                )}
                {canCreate && (
                  <Button onClick={() => {
                    setSelectedProduct(null);
                    setIsFormOpen(true);
                  }} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Product
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

              {products.length === 0 && !isLoading && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Package className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No products yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Start managing your inventory by adding your first product.
                    </p>
                    {canCreate && (
                      <Button onClick={() => {
                        setSelectedProduct(null);
                        setIsFormOpen(true);
                      }} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Your First Product
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <ProductForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedProduct(null);
        }}
        onSubmit={handleFormSubmit}
        defaultValues={selectedProduct}
        existingTypes={existingTypes}
      />
    </>
  );
}