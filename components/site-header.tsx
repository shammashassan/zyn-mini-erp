"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "@/components/ui/mode-toggle";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Home, ChevronDown } from "lucide-react";

// Route structure organized by groups
const routeGroups: Record<string, { label: string; path: string }[]> = {
  accounting: [
    { label: "Chart of Accounts", path: "/accounting/chart-of-accounts" },
    { label: "Financial Statements", path: "/accounting/financial-statements" },
    { label: "Journal", path: "/accounting/journal" },
    { label: "Ledger", path: "/accounting/ledger" },
    { label: "Profit & Loss", path: "/accounting/profit-loss" },
    { label: "Trial Balance", path: "/accounting/trial-balance" },
  ],
  documents: [
    { label: "Delivery Notes", path: "/documents/delivery-notes" },
    { label: "Invoices", path: "/documents/invoices" },
    { label: "Quotations", path: "/documents/quotations" },
    { label: "Vouchers", path: "/documents/vouchers" },
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
    { label: "Materials", path: "/inventory/materials" },
    { label: "Products", path: "/inventory/products" },
    { label: "Stock Adjustment", path: "/inventory/stock-adjustment" },
  ],
  people: [
    { label: "Customers", path: "/people/customers" },
    { label: "Suppliers", path: "/people/suppliers" },
    { label: "Payees", path: "/people/payees" },
  ],
  expenses: [
    { label: "Purchases", path: "/expenses/purchases" },
    { label: "Expenses", path: "/expenses/expenses" },
    { label: "Return Notes", path: "/expenses/return-notes" },
  ],
  reports: [
    { label: "Expense Report", path: "/reports/expense-report" },
    { label: "Inventory Report", path: "/reports/inventory-report" },
    { label: "Payments Report", path: "/reports/payments-report" },
    { label: "Purchase Report", path: "/reports/purchase-report" },
    { label: "Sales Report", path: "/reports/sales-report" },
    { label: "Tax Report", path: "/reports/tax-report" },
  ],
};

// Standalone routes (not in groups)
const standaloneRoutes = [
  "/dashboard",
  "/help",
  "/settings",
  "/notifications",
];

export function SiteHeader() {
  const pathname = usePathname();
  const [companyName, setCompanyName] = useState<string>("");

  useEffect(() => {
    const fetchCompanyDetails = async () => {
      try {
        const response = await fetch("/api/company-details");
        if (response.ok) {
          const data = await response.json();
          setCompanyName(data.companyName || "");
        }
      } catch (error) {
        console.error("Failed to fetch company details:", error);
      }
    };

    fetchCompanyDetails();
  }, []);

  // Generate breadcrumb items from pathname
  const generateBreadcrumbs = () => {
    const paths = pathname.split("/").filter(Boolean);
    
    const breadcrumbs = paths.map((path, index) => {
      const href = "/" + paths.slice(0, index + 1).join("/");
      const label = path.charAt(0).toUpperCase() + path.slice(1).replace(/-/g, " ");
      
      // Check if this segment has a group
      const hasGroup = routeGroups[path] !== undefined;
      const group = hasGroup ? routeGroups[path] : null;
      
      // Check if it's a valid standalone route
      const isStandalone = standaloneRoutes.includes(href);
      
      return { href, label, hasGroup, group, isStandalone };
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  return (
    <header className="bg-background sticky top-0 z-50 flex h-[var(--header-height)] shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[var(--header-height)]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        {/* Left section */}
        <div className="flex items-center gap-1 lg:gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          
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
                      // Last item - always non-clickable
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    ) : crumb.hasGroup && crumb.group ? (
                      // Group with dropdown
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
                      // Standalone clickable route
                      <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                    ) : (
                      // Non-clickable segment
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </div>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Center section - Company Name */}
        {companyName && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <h1 className="text-lg md:text-base font-semibold whitespace-nowrap">
              {companyName}
            </h1>
          </div>
        )}

        {/* Right section */}
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