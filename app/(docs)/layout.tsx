"use client";

import { ReactNode } from "react";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { DocumentationSidebar } from "@/components/docs/docs-sidebar";
import { DocsProvider, useDocs } from "@/components/docs/docs-context";
import * as React from "react";

function DocsLayoutContent({ children }: { children: ReactNode }) {
  const { activeSectionId, setActiveSectionId } = useDocs();

  return (
    <div className="[--header-height:calc(--spacing(14))]">
      <SidebarProvider className="flex flex-col">
        <SiteHeader />
        <div className="flex flex-1">
          <DocumentationSidebar
            variant="inset"
            activeSectionId={activeSectionId}
            onSectionSelect={(id) => {
              if (typeof id === 'string') setActiveSectionId(id);
            }}
          />
          <SidebarInset>
            {children}
          </SidebarInset>
        </div>
        <SiteFooter />
      </SidebarProvider>
    </div>
  );
}

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <DocsProvider>
      <DocsLayoutContent>{children}</DocsLayoutContent>
    </DocsProvider>
  );
}
