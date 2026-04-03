// app-sidebar.tsx - UPDATED: Products/Materials → Items

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
  Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar"
import { authClient } from "@/lib/auth-client"

type RoleType = "user" | "admin" | "manager" | "owner";

// ─── Permission map ────────────────────────────────────────────────────────
// "product" and "material" keys are removed; "Items" uses item: ["read"]
const PERMISSION_MAP: Record<string, Record<string, string[]>> = {
  "Dashboard": { dashboard: ["read"] },

  // Inventory (unified)
  "Items": { item: ["read"] },
  "Stock": { item: ["read"] },
  "Adjustment": { stockAdjustment: ["read"] },

  // People
  "Parties": { party: ["read"] },
  "Contacts": { contact: ["read"] },
  "Payees": { payee: ["read"] },

  // Sales
  "Quotations": { quotation: ["read"] },
  "Invoices": { invoice: ["read"] },
  "Receipts": { voucher: ["read"] },
  "Delivery Notes": { deliveryNote: ["read"] },
  "Sales Returns": { returnNote: ["read"] },
  "Debit Notes": { debitNote: ["read"] },

  // Procurement
  "Purchases": { purchase: ["read"] },
  "Expenses": { expense: ["read"] },
  "Payments": { voucher: ["read"] },
  "Purchase Returns": { returnNote: ["read"] },
  "Credit Notes": { creditNote: ["read"] },

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
  "Ledger": { ledger: ["read"] },
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
      icon: LayoutDashboard,
    },
    {
      title: "Inventory",
      url: "#",
      icon: Archive,
      items: [
        { title: "Items", url: "/inventory/items" },
        { title: "Stock", url: "/inventory/stock" },
        { title: "Adjustment", url: "/inventory/stock-adjustment" },
      ],
    },
    {
      title: "People",
      url: "#",
      icon: Users,
      items: [
        { title: "Parties", url: "/people/parties" },
        { title: "Contacts", url: "/people/contacts" },
        { title: "Payees", url: "/people/payees" },
      ],
    },
    {
      title: "Sales",
      url: "/#",
      icon: FileText,
      items: [
        { title: "Quotations", url: "/sales/quotations" },
        { title: "Invoices", url: "/sales/invoices" },
        { title: "Receipts", url: "/sales/receipts" },
        { title: "Delivery Notes", url: "/sales/delivery-notes" },
        { title: "Sales Returns", url: "/sales/sales-returns" },
        { title: "Credit Notes", url: "/sales/credit-notes" },
      ],
    },
    {
      title: "Procurement",
      url: "#",
      icon: Receipt,
      items: [
        { title: "Purchases", url: "/procurement/purchases" },
        { title: "Expenses", url: "/procurement/expenses" },
        { title: "Payments", url: "/procurement/payments" },
        { title: "Purchase Returns", url: "/procurement/purchase-returns" },
        { title: "Debit Notes", url: "/procurement/debit-notes" },
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
        { title: "Ledger", url: "/accounting/ledger" },
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
    if (!session?.user) return { name: "User", email: "user@company.com", avatar: null, username: undefined }
    return {
      name: session.user.name || session.user.email?.split('@')[0] || "User",
      email: session.user.email || "user@company.com",
      avatar: session.user.image || null,
      username: session.user.username || undefined,
    }
  }, [session])

  const filteredNavMain = React.useMemo(() => {
    if (isPending) return [];
    const userRole = (session?.user?.role || "user") as RoleType;

    const hasAccess = (itemTitle: string) => {
      const required = PERMISSION_MAP[itemTitle];
      if (!required) return true;
      return authClient.admin.checkRolePermission({ role: userRole, permissions: required });
    };

    return staticData.navMain.map((item) => {
      if (item.items) {
        const visible = item.items.filter((sub) => hasAccess(sub.title));
        if (visible.length === 0) return null;
        return { ...item, items: visible };
      }
      return hasAccess(item.title) ? item : null;
    }).filter(Boolean) as typeof staticData.navMain;
  }, [session, isPending]);

  return (
    <Sidebar
      className="top-(--header-height) h-[calc(100svh-var(--header-height))]!"
      collapsible="icon"
      {...props}
    >
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