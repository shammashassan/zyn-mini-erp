"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  Ban,
  Eye,
  MoreHorizontal,
  Trash2,
  XCircle,
  Pencil,
  Shield,
  CheckCircle2,
  User,
  UserCog,
  ArrowUpDown,
  Crown,
  Briefcase
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDisplayDate, formatRelativeTime } from "@/utils/formatters/date";

interface BetterAuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  username?: string;
  role?: string;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;
  lastLoginAt?: Date | null;
}

interface RowActionsProps {
  user: BetterAuthUser;
  currentUserId?: string;
  onView: (user: BetterAuthUser) => void;
  onEdit: (user: BetterAuthUser) => void;
  onDelete: (user: BetterAuthUser) => void;
  onToggleBan: (user: BetterAuthUser) => void;
  canUpdate: boolean;
  canDelete: boolean;
  canBan: boolean;
}

function RowActions({
  user,
  currentUserId,
  onView,
  onEdit,
  onDelete,
  onToggleBan,
  canUpdate,
  canDelete,
  canBan,
}: RowActionsProps) {
  const displayName = user.name || user.email;
  const isCurrentUser = user.id === currentUserId;

  return (
    <AlertDialog>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>

          <DropdownMenuItem onClick={() => onView(user)}>
            {isCurrentUser ? (
              <>
                <UserCog className="mr-2 h-4 w-4" />
                Manage Account
              </>
            ) : (
              <>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </>
            )}
          </DropdownMenuItem>

          {!isCurrentUser && canUpdate && (
            <>
              <DropdownMenuItem onClick={() => onEdit(user)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit User
              </DropdownMenuItem>
            </>
          )}

          {!isCurrentUser && canBan && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onToggleBan(user)}>
                <XCircle className="mr-2 h-4 w-4" />
                {user.banned ? 'Unban User' : 'Ban User'}
              </DropdownMenuItem>
            </>
          )}

          {!isCurrentUser && canDelete && (
            <>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete User
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {!isCurrentUser && (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete {displayName}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => onDelete(user)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  );
}

export const getColumns = (
  onView: (user: BetterAuthUser) => void,
  onEdit: (user: BetterAuthUser) => void,
  onDelete: (user: BetterAuthUser) => void,
  onToggleBan: (user: BetterAuthUser) => void,
  currentUser?: any,
  canUpdate: boolean = false,
  canDelete: boolean = false,
  canBan: boolean = false
): ColumnDef<BetterAuthUser>[] => [
    {
      id: "name",
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          User
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const user = row.original;
        const displayName = user.name || user.email;
        const fallback = user.name
          ? user.name.substring(0, 2).toUpperCase()
          : user.email.substring(0, 2).toUpperCase();

        const isSelf = currentUser?.id === user.id;

        return (
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className={cn(
                "font-medium text-white",
                isSelf ? "bg-primary" : "bg-gradient-to-br from-blue-500 to-purple-600"
              )}>
                {fallback}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                  {displayName}
                </span>
                {isSelf && (
                  <Badge variant="secondary" appearance="outline">
                    You
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground truncate">
                {user.email}
              </div>
            </div>
          </div>
        );
      },
      meta: {
        label: "User",
        placeholder: "Search users...",
        variant: "text",
        icon: User,
      },
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const user = row.original;
        const searchValue = value.toLowerCase();
        return (
          user.name?.toLowerCase().includes(searchValue) ||
          user.email.toLowerCase().includes(searchValue) ||
          user.username?.toLowerCase().includes(searchValue) ||
          false
        );
      },
    },
    {
      id: "username",
      accessorKey: "username",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Username
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const username = row.getValue("username") as string | undefined;

        if (!username) {
          return <span className="text-muted-foreground text-sm">—</span>;
        }

        return (
          <div className="font-mono text-sm">
            <div className="text-slate-900 dark:text-slate-100">
              @{username}
            </div>
          </div>
        );
      },
    },
    {
      id: "role",
      accessorKey: "role",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Role
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const role = (row.getValue("role") as string || "user").toLowerCase();

        let variant: "default" | "secondary" | "destructive" | "outline" | "info" | "warning" | "success" | "primary" | "neutral" = "primary";
        let Icon = User;

        switch (role) {
          case "owner":
            variant = "info";
            Icon = Crown;
            break;
          case "admin":
            variant = "primary";
            Icon = Shield;
            break;
          case "manager":
            variant = "warning";
            Icon = Briefcase;
            break;
          case "user":
          default:
            variant = "success";
            Icon = User;
            break;
        }
        return (
          <Badge
            variant={variant}
            appearance="outline"
            className="capitalize"
          >
            <Icon className="h-3 w-3 mr-1" />
            {role}
          </Badge>
        );
      },
      meta: {
        label: "Role",
        variant: "select",
        icon: Shield,
        options: [
          { label: "User", value: "user", icon: User },
          { label: "Manager", value: "manager", icon: Briefcase },
          { label: "Admin", value: "admin", icon: Shield },
          { label: "Owner", value: "owner", icon: Crown },
        ],
      },
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const role = row.getValue(id) as string | undefined;
        return value.includes(role || "user");
      },
    },
    {
      id: "status",
      accessorKey: "banned",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const banned = row.getValue("status") as boolean | undefined;
        return (
          <Badge
            variant={banned ? "destructive" : "success"}
            appearance="outline"
          >
            {banned ? "Banned" : "Active"}
          </Badge>
        );
      },
      meta: {
        label: "Status",
        variant: "select",
        options: [
          { label: "Active", value: "active", icon: CheckCircle2 },
          { label: "Banned", value: "banned", icon: Ban },
        ],
      },
      enableColumnFilter: true,
      filterFn: (row, id, value) => {
        const banned = row.original.banned;
        const status = banned ? "banned" : "active";
        return value.includes(status);
      },
    },
    {
      id: "lastLoginAt",
      accessorKey: "lastLoginAt",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Last Login
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const lastLoginAt = row.getValue("lastLoginAt") as Date | null;
        return (
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {lastLoginAt ? formatRelativeTime(lastLoginAt) : "Never"}
          </span>
        );
      },
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as Date;
        return (
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {formatDisplayDate(createdAt)}
          </span>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        return (
          <RowActions
            user={row.original}
            currentUserId={currentUser?.id}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleBan={onToggleBan}
            canUpdate={canUpdate}
            canDelete={canDelete}
            canBan={canBan}
          />
        );
      },
    },
  ];