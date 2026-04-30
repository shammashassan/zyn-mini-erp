// app/employees/page.tsx - UPDATED: Added Suspense & Silent Background Fetch

"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useDataTable } from "@/hooks/use-data-table";
import { Card, CardContent } from "@/components/ui/card";
import { getColumns } from "./columns";
import { EmployeeForm } from "./employee-form";
import { EmployeeViewModal } from "./employee-view";
import type { IEmployee } from "@/models/Employee";
import { Button } from "@/components/ui/button";
import { UsersRound, Plus, Trash2, Briefcase } from "lucide-react";
import Link from "next/link";
import React from "react";
import { useEmployeePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/shared/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const listener = () => setMatches(media.matches);
    window.addEventListener("resize", listener);
    return () => window.removeEventListener("resize", listener);
  }, [query]);
  return matches;
};

// ✅ FIXED: Wrapper component to provide Suspense boundary
export default function EmployeesPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-full">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <DataTableSkeleton columnCount={6} rowCount={10} />
          </CardContent>
        </Card>
      </div>
    }>
      <EmployeesPageContent />
    </Suspense>
  );
}

/**
 * The main page component content
 */
function EmployeesPageContent() {
  const [employees, setEmployees] = useState<IEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<IEmployee | null>(null);
  const isSmallScreen = useMediaQuery("(max-width: 640px)");
  const [isMounted, setIsMounted] = useState(false);

  // Use the custom hook for permissions
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
  } = useEmployeePermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  /**
   * Fetches the list of employees from the API.
   * ✅ UPDATED: Added 'background' param for silent refreshes
   */
  const fetchEmployees = useCallback(async (background = false) => {
    if (!canRead) return;

    try {
      // Only show spinner if not a background fetch
      if (!background) {
        setIsLoading(true);
      }

      const res = await fetch("/api/employees");

      if (res.status === 403) {
        if (!background) toast.error("You don't have permission to view employees");
        return;
      }

      if (!res.ok) throw new Error("Failed to fetch employees");
      const data = await res.json();
      setEmployees(data);
    } catch (error) {
      if (!background) toast.error("Could not load employees.");
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, [canRead]);

  // ✅ UPDATED: Standard fetch on mount/permission change
  // Removed 'session' dependency to prevent double-fetch on focus
  useEffect(() => {
    if (isMounted && canRead) {
      fetchEmployees();
    } else if (isMounted && !canRead && !isPending) {
      toast.error("You don't have permission to view employees", {
        description: "Only managers and above can access this page",
      });
      setIsLoading(false);
    }
  }, [isMounted, canRead, isPending, fetchEmployees]);

  // ✅ NEW: Window Focus Listener - SILENT MODE
  // Triggers silent background fetch when returning to the tab
  useEffect(() => {
    const onFocus = () => {
      if (isMounted && canRead) {
        fetchEmployees(true);
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchEmployees, isMounted, canRead]);

  /**
   * Handles viewing an employee (opens view modal).
   */
  const handleView = (employee: IEmployee) => {
    setSelectedEmployee(employee);
    setIsViewOpen(true);
  };

  /**
   * Handles editing an employee (opens form modal).
   */
  const handleEdit = (employee: IEmployee) => {
    if (!canUpdate) {
      toast.error("You don't have permission to edit employees");
      return;
    }
    setSelectedEmployee(employee);
    setIsViewOpen(false);
    setIsFormOpen(true);
  };

  /**
   * Handles the submission of the employee form (create or update).
   */
  const handleFormSubmit = async (
    data: any,
    avatarBlob: Blob | null,
    wasAvatarRemoved: boolean,
    id?: string
  ) => {
    if (id && !canUpdate) {
      toast.error("You don't have permission to update employees");
      return;
    }
    if (!id && !canCreate) {
      toast.error("You don't have permission to create employees");
      return;
    }

    const wasEditing = !!id;
    // Process mobile numbers from objects to strings
    const processedData = {
      ...data,
      mobiles: Array.isArray(data.mobiles)
        ? data.mobiles.map((m: { value: string }) => m.value).filter(Boolean)
        : [],
    };
    let finalData = { ...processedData };

    // Handle avatar upload if a new one is provided
    if (avatarBlob) {
      const formData = new FormData();
      const filename = `${Date.now()}-avatar.jpeg`;
      formData.append("file", avatarBlob, filename);
      // Pass old avatar URL so the server can delete it from Cloudinary
      if (selectedEmployee?.avatar) {
        formData.append("oldImageUrl", selectedEmployee.avatar);
      }
      try {
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success)
          throw new Error(uploadData.error || "Image upload failed.");
        finalData.avatar = uploadData.url;
      } catch (error: any) {
        toast.error("Image Upload Failed", { description: error.message });
        return;
      }
    } else if (wasAvatarRemoved) {
      finalData.avatar = "";
      // Delete old image from Cloudinary
      if (selectedEmployee?.avatar) {
        fetch("/api/upload", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: selectedEmployee.avatar }),
        }).catch(e => console.warn("Failed to delete old employee avatar from Cloudinary:", e));
      }
    }

    const url = id ? `/api/employees/${id}` : "/api/employees";
    const method = id ? "PUT" : "POST";

    toast.promise(
      fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalData),
      }).then(async (res) => {
        if (res.status === 403) {
          throw new Error("You don't have permission to perform this action");
        }
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to save employee");
        }
        return res.json();
      }),
      {
        loading: id ? "Updating employee..." : "Adding employee...",
        success: () => {
          fetchEmployees();
          setIsFormOpen(false);
          setSelectedEmployee(null);
          setIsViewOpen(false);
          return `Employee ${id ? "updated" : "added"} successfully.`;
        },
        error: (err) =>
          err.message || `Failed to ${id ? "update" : "add"} employee.`,
      }
    );
  };

  /**
   * Handles soft deletion of employees
   */
  const handleDelete = async (selectedEmployees: IEmployee[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete employees");
      return;
    }

    try {
      const deletePromises = selectedEmployees.map((employee) =>
        fetch(`/api/employees/${employee._id}`, { method: "DELETE" }).then(
          async (res) => {
            if (res.status === 403) {
              throw new Error("You don't have permission to delete employees");
            }
            if (!res.ok) throw new Error("Failed to delete");
            return res.json();
          }
        )
      );

      await Promise.all(deletePromises);

      toast.success(
        `${selectedEmployees.length} ${selectedEmployees.length === 1 ? "employee" : "employees"
        } moved to trash.`
      );

      // Refresh the list
      fetchEmployees();
    } catch (error: any) {
      console.error("Failed to delete employees:", error);
      toast.error(error.message || "Failed to delete employees.");
    }
  };

  // Get unique roles from employees data
  const existingRoles = React.useMemo(() => {
    const roles = new Set(employees.map((emp) => emp.role).filter(Boolean));
    return Array.from(roles);
  }, [employees]);

  // Get unique roles from employees data
  const roleOptions = React.useMemo(() => {
    const roles = new Set(employees.map((emp) => emp.role).filter(Boolean));
    return Array.from(roles).map((role) => ({
      label: role.charAt(0).toUpperCase() + role.slice(1),
      value: role,
      count: employees.filter((emp) => emp.role === role).length,
    }));
  }, [employees]);

  // Memoized columns to prevent re-rendering
  const columns = useMemo(
    () =>
      getColumns(
        handleView,
        handleEdit,
        (employeeOrId: IEmployee | string) => {
          const id =
            typeof employeeOrId === "object" ? employeeOrId._id : employeeOrId;
          const employeeToDelete = employees.find(
            (e: IEmployee) => e._id === id
          );
          if (employeeToDelete) {
            handleDelete([employeeToDelete]);
          }
        },
        canUpdate,
        canDelete,
        roleOptions
      ),
    [employees, canUpdate, canDelete, roleOptions]
  );

  const { table } = useDataTable({
    data: employees,
    columns,
    initialState: {
      sorting: [{ id: "joinedDate", desc: true }],
      pagination: {
        pageSize: 10,
        pageIndex: 0,
      },
    },
    getRowId: (row) => row._id,
  });

  // Show loading state while checking permissions
  if (!isMounted || isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  // If user doesn't have read permission, show access denied
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
                  <Briefcase className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Employees
                  </h1>
                  <p className="text-muted-foreground">
                    Manage your company's employees
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                {canViewTrash && (
                  <Link href="./employees/trash">
                    <Button variant="outline" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Trash
                    </Button>
                  </Link>
                )}
                {canCreate && (
                  <Button
                    onClick={() => {
                      setSelectedEmployee(null);
                      setIsFormOpen(true);
                    }}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" /> Add Employee
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4 px-4 lg:px-6 xl:gap-6">
              <div className={cn("transition-opacity duration-200", isLoading ? "opacity-50" : "opacity-100")}>
                {isLoading ? (
                  <Card>
                    <CardContent className="p-6">
                      <DataTableSkeleton columnCount={columns.length} rowCount={10} />
                    </CardContent>
                  </Card>
                ) : employees.length > 0 ? (
                  <Card>
                    <CardContent className="p-6">
                      <DataTable table={table}>
                        <DataTableToolbar table={table} />
                      </DataTable>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <UsersRound className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No employees yet</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        Start building your team by adding your first employee.
                      </p>
                      {canCreate && (
                        <Button
                          onClick={() => {
                            setSelectedEmployee(null);
                            setIsFormOpen(true);
                          }}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" /> Add Your First Employee
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

      <EmployeeViewModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        employee={selectedEmployee}
      />
      {canCreate && (
        <EmployeeForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedEmployee(null);
          }}
          onSubmit={handleFormSubmit}
          defaultValues={selectedEmployee}
          existingRoles={existingRoles}
        />
      )}
    </>
  );
}