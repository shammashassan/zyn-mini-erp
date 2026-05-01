// app/settings/page.tsx

"use client";

import * as React from "react";
import { authClient } from "@/lib/auth-client";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import {
  Settings as SettingsIcon,
  User,
  Building2,
  Users,
  ChevronRight,
  CircleUser,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettingsPermissions } from "@/hooks/use-permissions";
import { forbidden } from "next/navigation";
import { redirect } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";

type RoleType = "user" | "admin" | "manager" | "owner";

// Define permission requirements for each settings section
const SETTINGS_PERMISSIONS: Record<string, Record<string, string[]>> = {
  userManagement: { user: ["list"] },
  companyDetails: { companyDetails: ["read"] },
};

interface SettingsItem {
  id: string;
  title: string;
  description: string;
  icon: typeof User;
  href: string;
  permissionKey: string;
}

const SETTINGS_ITEMS: SettingsItem[] = [
  {
    id: "account",
    title: "Account Settings",
    description: "Manage your personal account, profile, and security settings",
    icon: CircleUser,
    href: "/settings/account",
    permissionKey: "account",
  },
  {
    id: "company",
    title: "Company Details",
    description: "Update company information, branding, and business details",
    icon: Building2,
    href: "/settings/company-details",
    permissionKey: "companyDetails",
  },
  {
    id: "users",
    title: "User Management",
    description: "Manage system users, roles, and permissions",
    icon: Users,
    href: "/hrm/users",
    permissionKey: "userManagement",
  },
];

export default function SettingsPage() {
  const [isMounted, setIsMounted] = React.useState(false);

  const {
    permissions: { canRead },
    session,
    isPending
  } = useSettingsPermissions();

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  // Filter settings items based on permissions
  const visibleItems = React.useMemo(() => {
    if (!isMounted || isPending || !session?.user) {
      return [];
    }

    const userRole = (session.user.role || "user") as RoleType;

    return SETTINGS_ITEMS.filter((item) => {
      const requiredPermissions = SETTINGS_PERMISSIONS[item.permissionKey];

      // If no permissions required (like account), show to everyone
      if (!requiredPermissions || Object.keys(requiredPermissions).length === 0) {
        return true;
      }

      // Check if user has required permissions
      return authClient.admin.checkRolePermission({
        role: userRole,
        permissions: requiredPermissions,
      });
    });
  }, [session, isPending, isMounted]);

  const handleNavigate = (href: string) => {
    redirect(href);
  };

  // Loading state
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

  if (!canRead) {
    forbidden();
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 px-4 lg:px-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <SettingsIcon className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                  Manage your account and system preferences
                </p>
              </div>
            </div>
          </div>

          {/* Settings Items */}
          <div className="flex flex-col gap-4 px-4 lg:px-6 xl:gap-6 min-h-[calc(100vh-12rem)]">
            <div className="max-w-4xl mx-auto w-full flex flex-col flex-1">
              <ItemGroup className="gap-5">
                {visibleItems.length === 0 ? (
                  <div className="text-center py-12">
                    <SettingsIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h3 className="text-lg font-semibold mb-2">No settings available</h3>
                    <p className="text-muted-foreground">
                      You don't have access to any settings pages.
                    </p>
                  </div>
                ) : (
                  visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Item
                        key={item.id}
                        asChild
                        variant="outline"
                        className="cursor-pointer transition-all hover:bg-muted/50"
                      >
                        <button
                          onClick={() => handleNavigate(item.href)}
                          className="w-full text-left"
                        >
                          <ItemMedia variant="icon">
                            <Icon className="h-5 w-5" />
                          </ItemMedia>
                          <ItemContent>
                            <ItemTitle>{item.title}</ItemTitle>
                            <ItemDescription>{item.description}</ItemDescription>
                          </ItemContent>
                          <div className="ml-auto">
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </button>
                      </Item>
                    );
                  })
                )}
              </ItemGroup>

              {/* Help Text - Sticky Bottom */}
              {visibleItems.length > 0 && (
                <div className="sticky bottom-6 z-10 mt-auto pt-8 pb-2">
                  <div className="p-4 bg-muted/95 backdrop-blur-sm rounded-lg border shadow-sm">
                    <p className="text-sm text-muted-foreground">
                      <strong>Note:</strong> The settings available to you depend on your role and permissions.
                      Contact your administrator if you need access to additional settings.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}