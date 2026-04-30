"use client";

import * as React from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import {
  SidebarProvider,
  SidebarInset,
} from "@/components/ui/sidebar";
import { SiteFooter } from "@/components/layout/site-footer";

export default function ERPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
