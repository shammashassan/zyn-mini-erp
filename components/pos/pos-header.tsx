"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Home, Monitor } from "lucide-react";

export function POSHeader() {
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    fetch("/api/company-details")
      .then((r) => { if (r.ok) return r.json(); })
      .then((d) => { if (d?.companyName) setCompanyName(d.companyName); })
      .catch(console.error);
  }, []);

  return (
    <header className="bg-background sticky top-0 z-50 flex h-14 shrink-0 items-center gap-2 border-b">
      <div className="flex w-full items-center gap-2 px-4 lg:px-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Monitor className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold tracking-tight text-lg">POS Terminal</span>
        </div>

        {companyName && (
          <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
            <h1 className="text-base font-semibold whitespace-nowrap">{companyName}</h1>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" aria-label="Dashboard">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
