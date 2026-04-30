// app/employees/trash/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { TrashPage } from "@/components/shared/TrashPage";
import { Briefcase, UsersRound } from "lucide-react";
import { useEmployeePermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/shared/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { redirect } from "next/navigation";

interface DeletedEmployee {
  _id: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  department?: string;
  phone?: string;
  deletedAt?: Date | string;
  deletedBy?: string;
}

export default function EmployeesTrashPage() {
  const [isMounted, setIsMounted] = useState(false);
  const {
    permissions: { canViewTrash },
    isPending,
    session
  } = useEmployeePermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted || isPending) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!session) {
    redirect("/login");
  }

  if (!canViewTrash) {
    return <AccessDenied />;
  }

  return (
    <TrashPage<DeletedEmployee>
      title="Employees Trash"
      description="Deleted employees that can be restored or permanently removed"
      icon={<Briefcase className="h-8 w-8 text-destructive" />}
      apiEndpoint="/api/employees/trash"
      restoreEndpoint="/api/employees/trash/restore"
      deleteEndpoint="/api/employees/trash/delete"
      backUrl="/hrm/employees"
      backLabel="Back to Employees"
      getItemName={(item) =>
        `${item.firstName || ''} ${item.lastName || ''}`.trim() || "Unnamed Employee"
      }
      getItemDescription={(item) =>
        [item.position, item.department, item.phone].filter(Boolean).join(" • ")
      }
    />
  );
}