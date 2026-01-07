"use client"

import * as React from "react"
import {
  BarChart3,
  HelpCircle,
  Search,
  Settings,
  BookOpenText,
  LayoutDashboard,
  Receipt,
  Archive,
  User,
  FileText,
  CircleUserRound,
  Command,
  Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"

// Define the precise Role type to satisfy TypeScript
type RoleType = "user" | "admin" | "manager" | "owner";

// 1. Define the Permission Mapping based on your permissions.ts
const PERMISSION_MAP: Record<string, Record<string, string[]>> = {
  // General
  "Dashboard": { dashboard: ["read"] },
  
  // Inventory
  "Products": { product: ["read"] },
  "Materials": { material: ["read"] },
  "Stock Adjustment": { stockAdjustment: ["read"] },
  
  // People
  "Customers": { customer: ["read"] },
  "Suppliers": { supplier: ["read"] },
  "Payees": { payee: ["read"] },
  
  // Documents
  "Quotations": { invoice: ["read"] },
  "Invoices": { invoice: ["read"] },
  "Vouchers": { voucher: ["read"] },
  "Delivery notes": { deliveryNote: ["read"] },
  
  // Expenses
  "Purchases": { purchase: ["read"] },
  "Expenses": { expense: ["read"] },
  "Return Notes": { returnNote: ["read"] },
  
  // Reports
  "Sales Report": { report: ["read"] },
  "Purchase Report": { report: ["read"] },
  "Expense Report": { report: ["read"] },
  "Payments Report": { report: ["read"] },
  "Tax Report": { report: ["read"] },
  "Inventory Report": { report: ["read"] },
  
  // Accounting
  "Chart of Accounts": { chartOfAccounts: ["read"] },
  "Journal": { journal: ["read"] },
  "ledger": { journal: ["read"] },
  "Trial Balance": { trialBalance: ["read"] },
  "Profit & Loss": { profitLoss: ["read"] },
  "Financial Statements": { financialStatements: ["read"] },
  
  // HRM
  "Employees": { employee: ["read"] },
  "User Management": { user: ["list"] },
};

const staticData = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: LayoutDashboard
    },
    {
      title: "Inventory",
      url: "#",
      icon: Archive,
      items: [
        { title: "Products", url: "/inventory/products" },
        { title: "Materials", url: "/inventory/materials" },
        { title: "Stock Adjustment", url: "/inventory/stock-adjustment" },
      ],
    },
    {
      title: "People",
      url: "#",
      icon: Users,
      items: [
        { title: "Customers", url: "/people/customers" },
        { title: "Suppliers", url: "/people/suppliers" },
        { title: "Payees", url: "/people/payees" },
      ],
    },
    {
      title: "Documents",
      url: "/#",
      icon: FileText,
      items: [
        { title: "Quotations", url: "/documents/quotations" },
        { title: "Invoices", url: "/documents/invoices" },
        { title: "Vouchers", url: "/documents/vouchers" },
        { title: "Delivery notes", url: "/documents/delivery-notes" },
      ]
    },
    {
      title: "Expenses",
      url: "#",
      icon: Receipt,
      items: [
        { title: "Purchases", url: "/expenses/purchases" },
        { title: "Expenses", url: "/expenses/expenses" },
        { title: "Return Notes", url: "/expenses/return-notes" },
      ],
    },
    {
      title: "Reports",
      url: "#",
      icon: BarChart3,
      items: [
        { title: "Sales Report", url: "/reports/sales-report" },
        { title: "Purchase Report", url: "/reports/purchase-report" },
        { title: "Expense Report", url: "/reports/expense-report" },
        { title: "Payments Report", url: "/reports/payments-report" },
        { title: "Tax Report", url: "/reports/tax-report" },
        { title: "Inventory Report", url: "/reports/inventory-report" },
      ],
    },
    {
      title: "Accounting",
      url: "#",
      icon: BookOpenText,
      items: [
        { title: "Chart of Accounts", url: "/accounting/chart-of-accounts" },
        { title: "Journal", url: "/accounting/journal" },
        { title: "ledger", url: "/accounting/ledger" },
        { title: "Trial Balance", url: "/accounting/trial-balance" },
        { title: "Profit & Loss", url: "/accounting/profit-loss" },
        { title: "Financial Statements", url: "/accounting/financial-statements" },
      ],
    },
    {
      title: "HRM",
      url: "#",
      icon: CircleUserRound,
      items: [
        { title: "Employees", url: "/hrm/employees" },
        { title: "User Management", url: "/hrm/users" },
      ],
    },
  ],
  navSecondary: [
    { title: "Settings", url: "/settings", icon: Settings },
    { title: "Get Help", url: "/help", icon: HelpCircle },
    { title: "Search", url: "#", icon: Search },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, isPending } = authClient.useSession()
  const [isMounted, setIsMounted] = React.useState(false)

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  const currentUser = React.useMemo(() => {
    if (!session?.user) {
      return {
        name: "User",
        email: "user@company.com",
        avatar: null,
        username: undefined
      }
    }

    return {
      name: session.user.name || session.user.email?.split('@')[0] || "User",
      email: session.user.email || "user@company.com",
      avatar: session.user.image || null,
      username: session.user.username || undefined,
    }
  }, [session])

  // 2. Filter Navigation based on granular permissions
  const filteredNavMain = React.useMemo(() => {
    if (isPending) return [];

    // FIX: Cast the role string to the specific union type expected by checkRolePermission
    const userRole = (session?.user?.role || "user") as RoleType;

    const hasAccess = (itemTitle: string) => {
      const requiredPermission = PERMISSION_MAP[itemTitle];
      
      // If no permission is mapped, assume it's public (or change to false to restrict)
      if (!requiredPermission) return true;

      // Now userRole satisfies the expected type
      return authClient.admin.checkRolePermission({
        role: userRole,
        permissions: requiredPermission
      });
    };

    return staticData.navMain.map((item) => {
      // Case 1: Item has sub-items (Group)
      if (item.items) {
        const visibleChildren = item.items.filter((subItem) => 
          hasAccess(subItem.title)
        );

        if (visibleChildren.length === 0) return null;

        return { ...item, items: visibleChildren };
      }

      // Case 2: Item is a direct link
      if (hasAccess(item.title)) {
        return item;
      }

      return null;
    }).filter(Boolean) as typeof staticData.navMain;
    
  }, [session, isPending]);

  return (
    <Sidebar 
    className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
    collapsible="icon" {...props}>
      {/* <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <Command className="!size-5" />
                <span className="text-base font-semibold">Acme Inc.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader> */}
      <SidebarContent className="sidebar-scroll">
        <NavMain items={filteredNavMain} />
        <NavSecondary items={staticData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        {!isMounted || isPending ? (
          <div className="flex items-center gap-3 rounded-lg p-2">
            <div className="h-8 w-8 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        ) : (
          <NavUser user={currentUser} />
        )}
      </SidebarFooter>
    </Sidebar>
  )
}