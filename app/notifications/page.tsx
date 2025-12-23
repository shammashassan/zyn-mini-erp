"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { AccessDenied } from "@/components/access-denied";
import { Bell } from "lucide-react";
import { EmptyNotificationState } from "@/components/empty-notification-state";
import { useNotificationPermissions } from "@/hooks/use-permissions";

export default function NotificationsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  
  const {
    permissions: { canRead },
    isPending,
  } = useNotificationPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 1. Loading State (Spinner)
  // We show this while the component is mounting or while permissions are being checked
  if (!isMounted || isPending) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <Spinner className="size-10" />
      </div>
    );
  }

  // 2. Access Control (Access Denied)
  // If the user does not have 'read' permission for 'notification', we block access
  if (!canRead) {
    return <AccessDenied />;
  }

  const handleRefresh = () => {
    setIsRefreshing(true);
    // Simulate network request
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 h-full">
          
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 px-4 lg:px-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-full">
                <Bell className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
                <p className="text-muted-foreground">
                  View your recent alerts and system updates
                </p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex flex-col flex-1 px-4 lg:px-6 min-h-[calc(100vh-12rem)]">
            <div className="max-w-4xl mx-auto w-full h-full flex flex-col flex-1 border rounded-xl overflow-hidden shadow-sm">
              <EmptyNotificationState 
                onRefresh={handleRefresh} 
                isRefreshing={isRefreshing} 
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}