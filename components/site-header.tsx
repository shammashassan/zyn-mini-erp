// site-header.tsx - UPDATED: products/materials → items

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList,
  BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, ChevronDown } from "lucide-react";

const routeGroups: Record<string, { label: string; path: string }[]> = {
  accounting: [
    { label: "Journal", path: "/accounting/journal" },
    { label: "Ledger", path: "/accounting/ledger" },
    { label: "Profit & Loss", path: "/accounting/profit-loss" },
  ],
  sales: [
    { label: "POS", path: "/sales/pos" },
    { label: "Invoices", path: "/sales/invoices" },
    { label: "Receipts", path: "/sales/receipts" },
    { label: "Delivery Notes", path: "/sales/delivery-notes" },
    { label: "Sales Returns", path: "/sales/sales-returns" },
    { label: "POS Returns", path: "/sales/pos-returns" },
  ],
  hrm: [
    { label: "Employees", path: "/hrm/employees" },
    { label: "Users", path: "/hrm/users" },
  ],
  settings: [
    { label: "Settings", path: "/settings" },
    { label: "Account", path: "/settings/account" },
    { label: "Company Details", path: "/settings/company-details" },
  ],
  inventory: [
    // Unified: products/materials → items
    { label: "Items", path: "/inventory/items" },
    { label: "Stock Adjustment", path: "/inventory/stock-adjustment" },
  ],
  people: [
    { label: "Parties", path: "/people/parties" },
    { label: "Contacts", path: "/people/contacts" },
    { label: "Payees", path: "/people/payees" },
  ],
  procurement: [
    { label: "Purchases", path: "/procurement/purchases" },
    { label: "Expenses", path: "/procurement/expenses" },
    { label: "Payments", path: "/procurement/payments" },
    { label: "Purchase Returns", path: "/procurement/purchase-returns" },
  ],
  reports: [
    { label: "Sales Report", path: "/reports/sales-report" },
    { label: "Purchase Report", path: "/reports/purchase-report" },
    { label: "Expense Report", path: "/reports/expense-report" },
    { label: "Payments Report", path: "/reports/payments-report" },
    { label: "Tax Report", path: "/reports/tax-report" },
    { label: "Inventory Report", path: "/reports/inventory-report" },
  ],
};

const standaloneRoutes = ["/dashboard", "/help", "/settings", "/notifications"];

export function SiteHeader() {
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    fetch("/api/company-details")
      .then((r) => { if (r.ok) return r.json(); })
      .then((d) => { if (d?.companyName) setCompanyName(d.companyName); })
      .catch(console.error);
  }, []);

  const generateBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean);
    return paths.map((path, index) => {
      const href = "/" + paths.slice(0, index + 1).join("/");
      const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " ");
      const hasGroup = routeGroups[path] !== undefined;
      const group = hasGroup ? routeGroups[path] : null;
      const isStandalone = standaloneRoutes.includes(href);
      return { href, label, hasGroup, group, isStandalone };
    });
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="bg-background sticky top-0 z-50 flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
          <Breadcrumb className="hidden md:block">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Home</BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.map((crumb, index) => (
                <div key={crumb.href} className="flex items-center gap-1.5">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {index === breadcrumbs.length - 1 ? (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : crumb.hasGroup && crumb.group ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="flex items-center gap-1">
                          {crumb.label}
                          <ChevronDown className="h-3 w-3" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {crumb.group.map((item) => (
                            <DropdownMenuItem key={item.path} asChild>
                              <Link href={item.path}>{item.label}</Link>
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : crumb.isStandalone ? (
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {companyName && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <h1 className="text-lg md:text-base font-semibold whitespace-nowrap">{companyName}</h1>
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