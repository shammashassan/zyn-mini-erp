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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AtSign
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
  const [selectedRole, setSelectedRole] = React.useState<AdminRole>("user");

  React.useEffect(() => {
    if (user) {
      setSelectedRole((user.role as AdminRole) || "user");
    }
  }, [user]);

  if (!user) return null;
  
  const displayName = user.name || user.email;
  const fallback = user.name 
    ? user.name.substring(0, 2).toUpperCase()
    : user.email.substring(0, 2).toUpperCase();

  const handleRoleChange = (newRole: AdminRole) => {
    if (newRole !== (user.role || "user")) {
      onSetRole(newRole);
      setSelectedRole(newRole);
    }
  };

  // Check if current user can assign a specific role
  const canAssignRole = (role: string) => {
    // Owner can assign any role
    if (currentUserRole === "owner") return true;
    
    // Admin cannot assign owner or admin roles
    if (currentUserRole === "admin") {
      return role !== "owner" && role !== "admin";
    }
    
    // Others can't assign any roles
    return false;
  };

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

                {/* Role Selector - Only show if user has permission */}
                {canSetRole ? (
                  <div className="flex items-start gap-3">
                    <RoleIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="w-full">
                      <div className="text-sm text-muted-foreground mb-1">Role Permission</div>
                      <Select value={selectedRole} onValueChange={handleRoleChange}>
                        <SelectTrigger className="h-8 w-full md:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem 
                            value="admin" 
                            disabled={!canAssignRole("admin")}
                          >
                            Admin
                          </SelectItem>
                          <SelectItem 
                            value="owner" 
                            disabled={!canAssignRole("owner")}
                          >
                            Owner
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <RoleIcon className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">Role Permission</div>
                      <div className="font-medium capitalize">{user.role || "user"}</div>
                    </div>
                  </div>
                )}
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

          {/* Ban/Unban Button - Only show if user has permission */}
          {canBan && (
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant={user.banned ? "default" : "destructive"}
                onClick={onToggleBan}
                className="w-full"
              >
                {user.banned ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Unban User
                  </>
                ) : (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Ban User
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}