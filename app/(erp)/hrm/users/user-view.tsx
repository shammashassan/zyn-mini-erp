"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Shield,
  Mail,
  User,
  Calendar,
  Clock,
  Crown,       // Added
  Briefcase,   // Added
  UserX,
  UserCheck,
  Fingerprint,
  AtSign,
  LogIn
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BetterAuthUser, AdminRole } from "@/lib/types";
import { formatDateTime } from "@/utils/formatters/date";

interface UserViewProps {
  isOpen: boolean;
  onClose: () => void;
  onToggleBan: () => void;
  onSetRole: (role: AdminRole) => void;
  user: BetterAuthUser | null;
  canBan: boolean;
  canSetRole: boolean;
  currentUserRole?: string;
}

export function UserViewModal({
  isOpen,
  onClose,
  onToggleBan,
  onSetRole,
  user,
  canBan,
  canSetRole,
  currentUserRole
}: UserViewProps) {
  const [isBanned, setIsBanned] = React.useState(false);

  React.useEffect(() => {
    if (user) {
      setIsBanned(user.banned || false);
    }
  }, [user]);

  const handleToggleBan = () => {
    setIsBanned((prev) => !prev);
    onToggleBan();
  };

  if (!user) return null;

  const displayName = user.name || user.email;
  const fallback = user.name
    ? user.name.substring(0, 2).toUpperCase()
    : user.email.substring(0, 2).toUpperCase();

  // Determine Badge Styling & Icon
  const getRoleBadge = (role?: string) => {
    const r = (role || "user").toLowerCase();
    switch (r) {
      case "owner":
        return { variant: "info", icon: Crown };
      case "admin":
        return { variant: "primary", icon: Shield };
      case "manager":
        return { variant: "warning", icon: Briefcase };
      case "user":
      default:
        return { variant: "success", icon: User };
    }
  };

  const roleConfig = getRoleBadge(user.role);
  const RoleIcon = roleConfig.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Card with Avatar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <Avatar className="h-32 w-32 border-4 border-muted">
                  <AvatarImage src={user.image || undefined} alt={displayName} />
                  <AvatarFallback className="text-4xl">{fallback}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center md:text-left space-y-3">
                  <div>
                    <h2 className="text-2xl font-bold">{displayName}</h2>
                    <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                      <Badge
                        variant={roleConfig.variant as any}
                        appearance="outline"
                        className="capitalize"
                      >
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {user.role || "user"}
                      </Badge>
                      <Badge
                        variant={user.banned ? "destructive" : "success"}
                        appearance="outline"
                      >
                        {user.banned ? "Banned" : "Active"}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="break-all">{user.email}</span>
                    </div>
                    {user.username && (
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <AtSign className="h-4 w-4 text-muted-foreground" />
                        <span>{user.username}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security & Access Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security & Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Role Section */}
                <div className="flex items-start gap-3">
                  <RoleIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="w-full">
                    <div className="text-sm text-muted-foreground mb-1">
                      Role
                    </div>
                    <div>
                      <Badge
                        variant={roleConfig.variant as any}
                        appearance="outline"
                        className="capitalize"
                      >
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {user.role || "user"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Status Section */}
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 flex items-center justify-center">
                    <Shield className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="w-full">
                    <div className="text-sm text-muted-foreground mb-1">
                      Account Status
                    </div>
                    <div className="flex items-center gap-3">
                      {canBan && (
                        <Switch
                          id="ban-mode"
                          checked={!isBanned}
                          onCheckedChange={handleToggleBan}
                          className={
                            isBanned
                              ? "data-[state=unchecked]:bg-slate-200 dark:data-[state=unchecked]:bg-slate-800"
                              : "data-[state=checked]:bg-green-500"
                          }
                        />
                      )}

                      <Badge
                        variant={isBanned ? "destructive" : "success"}
                        appearance="outline"
                      >
                        {isBanned ? "Banned" : "Active"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Last Login */}
                <div className="flex items-start gap-3">
                  <LogIn className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="w-full">
                    <div className="text-sm text-muted-foreground mb-1">Last Login</div>
                    <div className="font-medium text-sm">
                      {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never"}
                    </div>
                  </div>
                </div>

                {/* User ID */}
                <div className="flex items-start gap-3">
                  <Fingerprint className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="w-full">
                    <div className="text-sm text-muted-foreground">User ID</div>
                    <div className="font-medium font-mono text-xs bg-muted p-1 rounded mt-1 break-all">
                      {user.id}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Account Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Account Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">Created Date</div>
                    <div className="font-medium">{formatDateTime(user.createdAt)}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">Last Updated</div>
                    <div className="font-medium">{formatDateTime(user.updatedAt)}</div>
                  </div>
                </div>

                {user.banned && user.banExpires && (
                  <div className="flex items-start gap-3 md:col-span-2 pt-2 border-t">
                    <Calendar className="h-5 w-5 text-destructive mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">Ban Expires</div>
                      <div className="font-medium text-destructive">
                        {formatDateTime(user.banExpires)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ban/Unban Button - Removed as requested */}
        </div>
      </DialogContent>
    </Dialog>
  );
}