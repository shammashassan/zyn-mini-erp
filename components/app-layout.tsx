"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { SiteFooter } from "./site-footer";

const NO_LAYOUT_ROUTES = ["/login", "/help/documentation"];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // If the current page is one of the no-layout routes, just render the page itself
  if (NO_LAYOUT_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <AppSidebar variant="inset" />
          <SidebarInset>
            {children}
          </SidebarInset>
        </div>
        <SiteFooter />
      </SidebarProvider>
    </div>
  );
}
