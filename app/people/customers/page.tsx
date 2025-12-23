// app/people/customers/page.tsx

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
import { CustomerForm } from "./customer-form";
import { CustomerViewModal } from "./customer-view-modal";
import type { ICustomer } from "@/models/Customer";
import { Users, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCustomerPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";

type CustomerFormData = {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedCustomerForEdit, setSelectedCustomerForEdit] = useState<ICustomer | null>(null);

  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<ICustomer | null>(null);

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
  } = useCustomerPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchCustomers = async () => {
    if (!canRead) return;
    try {
      setIsLoading(true);
      const res = await fetch("/api/customers");
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      setCustomers(data);
    } catch (error) {
      toast.error("Could not load customers.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isMounted && canRead) {
      fetchCustomers();
    }
  }, [isMounted, canRead]);

  const handleOpenForm = (customer: ICustomer | null = null) => {
    if (!canCreate && !customer) {
      toast.error("You don't have permission to create customers");
      return;
    }
    if (!canUpdate && customer) {
      toast.error("You don't have permission to update customers");
      return;
    }
    setSelectedCustomerForEdit(customer);
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (data: CustomerFormData, id?: string) => {
    const url = id ? `/api/customers/${id}` : "/api/customers";
    const method = id ? "PUT" : "POST";

    toast.promise(
      fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
      {
        loading: id ? "Updating customer..." : "Adding customer...",
        success: () => {
          fetchCustomers();
          setIsFormOpen(false);
          setSelectedCustomerForEdit(null);
          return `Customer ${id ? "updated" : "added"} successfully.`;
        },
        error: `Failed to ${id ? "update" : "add"} customer.`,
      }
    );
  };

  const handleDelete = async (selectedCustomers: ICustomer[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete customers");
      return;
    }

    try {
      const deletePromises = selectedCustomers.map((customer) =>
        fetch(`/api/customers/${customer._id}`, { method: 'DELETE' })
      );

      await Promise.all(deletePromises);

      toast.success(
        `${selectedCustomers.length} ${selectedCustomers.length === 1 ? 'customer' : 'customers'} moved to trash.`,
      );

      fetchCustomers();
    } catch (error) {
      console.error('Failed to delete customers:', error);
      toast.error('Failed to delete customers.');
    }
  };

  const handleViewDetails = (customerName: string) => {
    const customer = customers.find(c => c.name === customerName);
    if (!customer) return;
    
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
  };

  const columns = useMemo(() => getColumns(
    (customer) => handleOpenForm(customer),
    (customerOrId: ICustomer | string) => {
      const id = typeof customerOrId === 'object' ? customerOrId._id : customerOrId;
      const customerToDelete = customers.find((c: ICustomer) => c._id === id);
      if (customerToDelete) {
        handleDelete([customerToDelete]);
      }
    },
    handleViewDetails,
    { canUpdate, canDelete }
  ), [customers, canUpdate, canDelete]);

  const columnsWithOptions = useMemo(() => {
    return columns;
  }, [columns]);

  const { table } = useDataTable({
    data: customers,
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
                  <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
                  <p className="text-muted-foreground">
                    Manage your customer list and relationships
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {canViewTrash && (
                  <Link href="./customers/trash">
                    <Button variant="outline" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Trash
                    </Button>
                  </Link>
                )}
                {canCreate && (
                  <Button onClick={() => {
                    setSelectedCustomerForEdit(null);
                    setIsFormOpen(true);
                  }} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Customer
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

              {customers.length === 0 && !isLoading && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No customers yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Start building your customer base by adding your first customer.
                    </p>
                    {canCreate && (
                      <Button onClick={() => {
                        setSelectedCustomerForEdit(null);
                        setIsFormOpen(true);
                      }} className="gap-2">
                        <Plus className="h-4 w-4" /> Add Your First Customer
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <CustomerForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedCustomerForEdit(null);
        }}
        onSubmit={handleFormSubmit}
        defaultValues={selectedCustomerForEdit}
      />
      
      <CustomerViewModal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        customer={selectedCustomer}
      />
    </>
  );
}