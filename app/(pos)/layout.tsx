import { ReactNode } from "react";
import { POSHeader } from "@/components/pos/pos-header";
import { SiteFooter } from "@/components/layout/site-footer";

export default function POSLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <POSHeader />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
