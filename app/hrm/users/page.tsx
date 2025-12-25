// app/users/page.tsx - UPDATED: Added Suspense & Silent Background Fetch

"use client";

import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { getColumns } from "./columns";
import { UserForm } from "./user-form";
import { UserViewModal } from "./user-view";
import { Button } from "@/components/ui/button";
import { BookUser, UserPlus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import type { BetterAuthUser, AdminRole } from "@/lib/types";
import React from "react";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { DataTableSkeleton } from "@/components/data-table/data-table-skeleton";
import { useUserManagementPermissions } from "@/hooks/use-permissions";
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

// ✅ FIXED: Wrapper component to provide Suspense boundary
export default function UsersPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-full">
            <BookUser className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
        </div>
        <Card>
          <CardContent className="p-6">
            <DataTableSkeleton columnCount={7} rowCount={10} />
          </CardContent>
        </Card>
      </div>
    }>
      <UsersPageContent />
    </Suspense>
  );
}

/**
 * The main page component content
 */
function UsersPageContent() {
  const router = useRouter();
  const [users, setUsers] = useState<BetterAuthUser[]>([]);
  const [currentUser, setCurrentUser] = useState<BetterAuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BetterAuthUser | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const hasShownAccessError = useRef(false);
  const isSmallScreen = useMediaQuery("(max-width: 640px)");

  // Use the custom hook for permissions
  const {
    permissions: {
      canList,
      canCreate,
      canUpdate,
      canDelete,
      canSetRole,
      canBan,
      canImpersonate,
      canListSessions,
      canRevokeSession,
    },
    session,
    isPending,
  } = useUserManagementPermissions();

  // Track when component is mounted (client-side only)
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // ✅ SEPARATE EFFECT: Sync current user from session
  // This prevents fetchUsers from needing 'session' as a dependency
  useEffect(() => {
    if (session?.user) {
      setCurrentUser(session.user as BetterAuthUser);
    }
  }, [session]);

  /**
   * Fetches the list of users from Better Auth Admin API.
   * ✅ UPDATED: Added 'background' param for silent refreshes
   */
  const fetchUsers = useCallback(async (background = false) => {
    if (!canList) return;

    try {
      // Only show spinner if not a background fetch
      if (!background) {
        setIsLoading(true);
      }

      const { data, error } = await authClient.admin.listUsers({
        query: {
          limit: 1000,
          offset: 0,
        }
      });

      if (error) {
        const errorMessage = error.message || "Failed to fetch users";
        if (errorMessage.toLowerCase().includes("not allowed") ||
          errorMessage.toLowerCase().includes("permission") ||
          errorMessage.toLowerCase().includes("unauthorized")) {

          if (!hasShownAccessError.current && !background) {
            hasShownAccessError.current = true;
            toast.error("Access denied", {
              description: "You do not have permission to view users."
            });
          }
          return;
        }

        throw new Error(errorMessage);
      }

      const transformedUsers: BetterAuthUser[] = (data?.users || []).map((user: any) => ({
        ...user,
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(user.updatedAt),
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
        banned: user.banned || false,
        banExpires: user.banExpires ? new Date(user.banExpires) : null,
      }));

      setUsers(transformedUsers);
    } catch (error: any) {
      console.error("Fetch users error:", error);
      if (!hasShownAccessError.current && !background) {
        toast.error("Failed to load users", {
          description: error.message
        });
      }
    } finally {
      if (!background) {
        setIsLoading(false);
      }
    }
  }, [canList]);

  // ✅ UPDATED: Standard fetch on mount/permission change
  // Removed 'session' dependency to prevent double-fetch on focus
  useEffect(() => {
    if (isMounted && canList) {
      fetchUsers();
    } else if (isMounted && !canList && !isPending) {
      toast.error("You don't have permission to view users", {
        description: "Only admins and above can access this page",
      });
      setIsLoading(false);
    }
  }, [isMounted, canList, isPending, fetchUsers]);

  // ✅ NEW: Window Focus Listener - SILENT MODE
  // Triggers silent background fetch when returning to the tab
  useEffect(() => {
    const onFocus = () => {
      if (isMounted && canList) {
        fetchUsers(true);
      }
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchUsers, isMounted, canList]);

  /**
   * Check if current user can manage target user based on role hierarchy
   */
  const canManageUser = (targetRole?: string) => {
    const currentRole = (session?.user as any)?.role || "user";
    const target = targetRole || "user";
    
    // Owner can manage everyone
    if (currentRole === "owner") return true;
    
    // Admin cannot manage owner or other admins
    if (currentRole === "admin") {
      return target !== "owner" && target !== "admin";
    }
    
    // Manager can only view users
    if (currentRole === "manager") {
      return false;
    }
    
    // Regular users can't manage anyone
    return false;
  };

  /**
   * Handles the submission of the user form (create user).
   */
  const handleFormSubmit = async (data: any, avatarBlob: Blob | null, wasAvatarRemoved: boolean) => {
    if (!canCreate) {
      toast.error("You don't have permission to create users");
      return;
    }

    // Check if admin is trying to create owner
    if (!canManageUser(data.role)) {
      toast.error("You don't have permission to create users with this role", {
        description: "Admins cannot create owner or admin accounts"
      });
      return;
    }

    try {
      let imageUrl: string | undefined = undefined;

      if (avatarBlob) {
        const formData = new FormData();
        const filename = `${Date.now()}-avatar.jpeg`;
        formData.append('file', avatarBlob, filename);

        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();

        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || 'Image upload failed.');
        }
        imageUrl = uploadData.url;
      }

      const userData = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role || "user",
        data: {
          username: data.username || undefined,
          image: imageUrl,
        },
      };

      const { error } = await authClient.admin.createUser(userData);

      if (error) {
        throw new Error(error.message || "Failed to create user.");
      }

      toast.success("User created successfully.");

      setIsFormOpen(false);
      await fetchUsers();
      setSelectedUser(null);

    } catch (error: any) {
      console.error("Handle form submit error:", error);
      toast.error("Failed to create user", {
        description: error.message
      });
    }
  };

  /**
   * Handles updating an existing user by an admin.
   */
  const handleUserUpdate = async (data: any, avatarBlob: Blob | null, wasAvatarRemoved: boolean) =>{
    if (!selectedUser) return;

    if (!canUpdate) {
      toast.error("You don't have permission to update users");
      return;
    }

    try {
      let imageUrl: string | null = selectedUser.image || null;

      if (avatarBlob) {
        const formData = new FormData();
        const filename = `${Date.now()}-avatar.jpeg`;
        formData.append('file', avatarBlob, filename);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.success) {
          throw new Error(uploadData.error || 'Image upload failed.');
        }
        imageUrl = uploadData.url;
      } else if (wasAvatarRemoved) {
        imageUrl = null;
      }

      const updateData: any = {
        name: data.name,
        username: data.username,
        image: imageUrl,
      };

      if (data.email && data.email !== selectedUser.email) {
        updateData.email = data.email;
      }

      const { error: detailsError } = await authClient.admin.updateUser({
        userId: selectedUser.id,
        data: updateData
      });

      if (detailsError) {
        throw new Error(detailsError.message || "Failed to update user details.");
      }

      if (data.role && data.role !== selectedUser.role) {
        if (!canSetRole) {
          toast.warning("User details updated, but you don't have permission to change roles.");
        } else {
          const { error: roleError } = await authClient.admin.setRole({
            userId: selectedUser.id,
            role: data.role,
          });
          if (roleError) {
            toast.warning("User details updated, but failed to change role.", {
              description: roleError.message,
            });
          }
        }
      }

      if (data.newPassword) {
        const { error: passwordError } = await authClient.admin.setUserPassword({
          userId: selectedUser.id,
          newPassword: data.newPassword,
        });
        if (passwordError) {
          toast.warning("User details updated, but failed to set new password.", {
            description: passwordError.message,
          });
        }
      }

      toast.success("User updated successfully!");

      setIsFormOpen(false);
      await fetchUsers();
      setSelectedUser(null);

    } catch (error: any) {
      console.error("Handle user update error:", error);
      toast.error("Failed to update user", {
        description: error.message
      });
    }
  };

  /**
   * Handles toggling user ban status.
   */
  const handleToggleBan = async (user: BetterAuthUser) => {
    if (!canBan) {
      toast.error("You don't have permission to ban/unban users");
      return;
    }

    // Check if current user can manage the target user
    if (!canManageUser(user.role)) {
      toast.error("You don't have permission to ban/unban this user", {
        description: "Admins cannot ban/unban owner or admin accounts"
      });
      return;
    }

    const action = user.banned ? 'unban' : 'ban';
    try {
      const result = user.banned
        ? await authClient.admin.unbanUser({ userId: user.id })
        : await authClient.admin.banUser({ userId: user.id, banReason: "Banned by administrator" });

      if (result.error) {
        throw new Error(result.error.message || `Failed to ${action} user`);
      }

      toast.success(`User ${action}ned successfully`);
      await fetchUsers();

    } catch (error: any) {
      toast.error(`Failed to ${action} user`, {
        description: error.message
      });
    }
  };

  /**
   * Handles setting user role.
   */
  const handleSetRole = async (user: BetterAuthUser, role: AdminRole) => {
    if (!canSetRole) {
      toast.error("You don't have permission to change user roles");
      return;
    }

    // Check if current user can manage the target user
    if (!canManageUser(user.role)) {
      toast.error("You don't have permission to change this user's role", {
        description: "Admins cannot change owner or admin roles"
      });
      return;
    }

    // Check if trying to assign a role the current user can't manage
    if (!canManageUser(role)) {
      toast.error("You don't have permission to assign this role", {
        description: "Admins cannot assign owner or admin roles"
      });
      return;
    }

    try {
      const { error } = await authClient.admin.setRole({
        userId: user.id,
        role: role,
      });

      if (error) {
        throw new Error(error.message || "Failed to set user role");
      }

      toast.success("User role updated successfully");
      await fetchUsers();

    } catch (error: any) {
      toast.error("Failed to set user role", {
        description: error.message
      });
    }
  };

  const handleUndoDelete = (deletedUsers: BetterAuthUser[], originalIndexes: number[]) => {
    setUsers(prevUsers => {
      const newUsers = [...prevUsers];
      deletedUsers.forEach((deletedUser, index) => {
        const originalIndex = originalIndexes[index];
        const insertIndex = Math.min(originalIndex, newUsers.length);
        newUsers.splice(insertIndex, 0, deletedUser);
      });
      return newUsers;
    });

    toast.success('Users restored.');
  };

  /**
   * Handles deleting one or more users.
   */
  const handleDelete = async (selectedUsers: BetterAuthUser[]) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete users");
      return;
    }

    // Check if any of the selected users cannot be managed
    const unmanageableUsers = selectedUsers.filter(user => !canManageUser(user.role));
    if (unmanageableUsers.length > 0) {
      toast.error("You don't have permission to delete some of these users", {
        description: "Admins cannot delete owner or admin accounts"
      });
      return;
    }

    const userIds = selectedUsers.map(u => u.id);

    const originalPositions = selectedUsers.map(user =>
      users.findIndex(u => u.id === user.id)
    );

    const filteredUsers = users.filter(u => !userIds.includes(u.id));
    setUsers(filteredUsers);

    let isUndone = false;

    const toastId = toast.success('Users deleted.', {
      action: {
        label: 'Undo',
        onClick: () => {
          isUndone = true;
          toast.dismiss(toastId);
          handleUndoDelete(selectedUsers, originalPositions);
        },
      },
      duration: 10000,
    });

    setTimeout(async () => {
      if (!isUndone) {
        try {
          const deletePromises = userIds.map(id => authClient.admin.removeUser({ userId: id }));
          const results = await Promise.all(deletePromises);

          const failedDeletes = results.filter(result => result.error);
          if (failedDeletes.length > 0) {
            console.error(`Failed to delete ${failedDeletes.length} user(s) from database`);
          } else {
            console.log('Users permanently deleted from database');
          }
        } catch (error) {
          console.error('Failed to delete from database:', error);
        }
      }
    }, 10000);
  };

  // Memoize columns to prevent re-creation on every render
  const columns = useMemo(() => getColumns(
    (user) => {
      if (currentUser && user.id === currentUser.id) {
        router.push('/settings/account');
        return;
      }
      setSelectedUser(user);
      setIsViewOpen(true);
    },
    (user) => {
      if (!canUpdate) {
        toast.error("You don't have permission to edit users");
        return;
      }
      if (!canManageUser(user.role)) {
        toast.error("You don't have permission to edit this user", {
          description: "Admins cannot edit owner or admin accounts"
        });
        return;
      }
      setSelectedUser(user);
      setIsFormOpen(true);
    },
    (userOrId: BetterAuthUser | string) => {
      const id = typeof userOrId === 'object' ? userOrId.id : userOrId;
      const userToDelete = users.find((u: BetterAuthUser) => u.id === id);
      if (userToDelete) {
        handleDelete([userToDelete]);
      }
    },
    (user) => handleToggleBan(user),
    currentUser,
    canUpdate,
    canDelete,
    canBan
  ), [users, currentUser, router, handleDelete, canUpdate, canDelete, canBan, session]);

  // Initialize data table
  const { table } = useDataTable({
    data: users,
    columns,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      pagination: {
        pageSize: 10,
        pageIndex: 0
      },
    },
    getRowId: (row) => row.id,
  });

  // Show loading state while checking permissions
  if (!isMounted || isPending) {
    return (
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 px-4 lg:px-6 gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-primary/10 rounded-full">
                  <BookUser className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                  <p className="text-muted-foreground">
                    Loading...
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 px-4 lg:px-6 xl:gap-6">
              <Card>
                <CardContent className="p-6">
                  <DataTableSkeleton columnCount={7} rowCount={10} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user doesn't have list permission, show access denied
  if (!canList) {
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
                  <BookUser className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Users</h1>
                  <p className="text-muted-foreground">
                    Manage system users and their permissions
                  </p>
                </div>
              </div>
              {canCreate && (
                <Button onClick={() => {
                  setSelectedUser(null);
                  setIsFormOpen(true);
                }} className="gap-2">
                  <UserPlus className="h-4 w-4" /> Add User
                </Button>
              )}
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
                    <DataTable table={table}>
                      <DataTableToolbar table={table} />
                    </DataTable>
                  )}
                </CardContent>
              </Card>

              {!isLoading && users.length === 0 && canCreate && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <BookUser className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No users yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Start building your team by adding your first user.
                    </p>
                    <Button onClick={() => {
                      setSelectedUser(null);
                      setIsFormOpen(true);
                    }} className="gap-2">
                      <UserPlus className="h-4 w-4" /> Add Your First User
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      <UserViewModal
        isOpen={isViewOpen}
        onClose={() => setIsViewOpen(false)}
        user={selectedUser}
        onToggleBan={() => {
          if (selectedUser) {
            handleToggleBan(selectedUser);
          }
        }}
        onSetRole={(role: AdminRole) => {
          if (selectedUser) {
            handleSetRole(selectedUser, role);
          }
        }}
        canBan={canBan}
        canSetRole={canSetRole}
        currentUserRole={(session?.user as any)?.role || "user"}
      />

      {canCreate && (
        <UserForm
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setSelectedUser(null);
          }}
          onSubmit={selectedUser ? handleUserUpdate : handleFormSubmit}
          defaultValues={selectedUser}
          currentUserRole={(session?.user as any)?.role || "user"}
        />
      )}
    </>
  );
}