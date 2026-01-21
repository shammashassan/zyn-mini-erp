"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard, // Dashboard
  Package, // Products
  Layers, // Materials
  ArrowRightLeft, // Stock Adjustment
  Users, // Customers
  Truck, // Suppliers
  FileClock, // Quotations
  FileText, // Invoices
  Ticket, // Vouchers
  ClipboardCheck, // Delivery notes
  ShoppingCart, // Purchases
  Banknote, // Expenses
  TrendingUp, // Sales Report
  ShoppingBag, // Purchase Report
  PieChart, // Expense Report
  Wallet, // Payments Report
  Percent, // Tax Report
  ClipboardList, // Inventory Report
  ListTree, // Chart of Accounts
  NotebookPen, // Journal
  Book, // Ledger
  Scale, // Trial Balance
  Calculator, // Profit & Loss
  Landmark, // Financial Statements
  Briefcase, // Employees
  BookUser, // User Management
  Building2,
  ScrollText,
  Cog,
  CircleUser,
  CircleQuestionMark,
  Factory,
  Bell,
  Undo2,
  Redo2
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { authClient } from "@/lib/auth-client"

type RoleType = "user" | "admin" | "manager" | "owner"

// Same permission map as in app-sidebar.tsx
const PERMISSION_MAP: Record<string, Record<string, string[]>> = {
  // General
  "Dashboard": { dashboard: ["read"] },
  "Billing": { bill: ["create"] },

  // Inventory
  "Products": { product: ["read"] },
  "Materials": { material: ["read"] },
  "Stock Adjustment": { stockAdjustment: ["read"] },

  // People
  "Customers": { customer: ["read"] },
  "Suppliers": { supplier: ["read"] },
  "Payees": { payee: ["read"] },

  // Sales
  "Quotations": { quotation: ["read"] },
  "Invoices": { invoice: ["read"] },
  "Vouchers": { voucher: ["read"] },
  "Receipts": { voucher: ["read"] },
  "Delivery notes": { deliveryNote: ["read"] },
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
  "ledger": { ledger: ["read"] },
  "Trial Balance": { trialBalance: ["read"] },
  "Profit & Loss": { profitLoss: ["read"] },
  "Financial Statements": { financialStatements: ["read"] },

  // HRM
  "Employees": { employee: ["read"] },
  "User Management": { user: ["list"] },

  // Settings
  "Settings": { settings: ["read"] },
  "Account": { account: ["read"] },
  "Company Details": { companyDetails: ["read"] },

  // Notifications
  "Notifications": { notification: ["read"] },

  // Help
  "Get Help": { help: ["read"] },
}

const navigationData = [
  // General
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, group: "General" },
  { title: "Billing", url: "/billing", icon: ScrollText, group: "General" },

  // Inventory
  { title: "Products", url: "/inventory/products", icon: Package, group: "Inventory" },
  { title: "Materials", url: "/inventory/materials", icon: Layers, group: "Inventory" },
  { title: "Stock Adjustment", url: "/inventory/stock-adjustment", icon: ArrowRightLeft, group: "Inventory" },

  // People
  { title: "Customers", url: "/people/customers", icon: Users, group: "People" },
  { title: "Suppliers", url: "/people/suppliers", icon: Building2, group: "People" },
  { title: "Payees", url: "/people/payees", icon: Users, group: "People" },

  // Sales
  { title: "Quotations", url: "/sales/quotations", icon: FileClock, group: "Sales" },
  { title: "Invoices", url: "/sales/invoices", icon: FileText, group: "Sales" },
  { title: "Vouchers", url: "/sales/vouchers", icon: Ticket, group: "Sales" },
  { title: "Receipts", url: "/sales/receipts", icon: Ticket, group: "Sales" },
  { title: "Delivery notes", url: "/sales/delivery-notes", icon: Truck, group: "Sales" },
  { title: "Sales Returns", url: "/sales/sales-returns", icon: Undo2, group: "Sales" },
  { title: "Debit Notes", url: "/sales/debit-notes", icon: ClipboardCheck, group: "Sales" },

  // Procurement
  { title: "Purchases", url: "/procurement/purchases", icon: ShoppingCart, group: "Procurement" },
  { title: "Expenses", url: "/procurement/expenses", icon: Banknote, group: "Procurement" },
  { title: "Payments", url: "/procurement/payments", icon: Banknote, group: "Procurement" },
  { title: "Purchase Returns", url: "/procurement/purchase-returns", icon: Redo2, group: "Procurement" },
  { title: "Credit Notes", url: "/procurement/credit-notes", icon: ClipboardCheck, group: "Procurement" },

  // Reports
  { title: "Sales Report", url: "/reports/sales-report", icon: TrendingUp, group: "Reports" },
  { title: "Purchase Report", url: "/reports/purchase-report", icon: ShoppingBag, group: "Reports" },
  { title: "Expense Report", url: "/reports/expense-report", icon: PieChart, group: "Reports" },
  { title: "Payments Report", url: "/reports/payments-report", icon: Wallet, group: "Reports" },
  { title: "Tax Report", url: "/reports/tax-report", icon: Percent, group: "Reports" },
  { title: "Inventory Report", url: "/reports/inventory-report", icon: ClipboardList, group: "Reports" },

  // Accounting
  { title: "Chart of Accounts", url: "/accounting/chart-of-accounts", icon: ListTree, group: "Accounting" },
  { title: "Journal", url: "/accounting/journal", icon: NotebookPen, group: "Accounting" },
  { title: "Ledger", url: "/accounting/ledger", icon: Book, group: "Accounting" },
  { title: "Trial Balance", url: "/accounting/trial-balance", icon: Scale, group: "Accounting" },
  { title: "Profit & Loss", url: "/accounting/profit-loss", icon: Calculator, group: "Accounting" },
  { title: "Financial Statements", url: "/accounting/financial-statements", icon: Landmark, group: "Accounting" },

  // HRM
  { title: "Employees", url: "/hrm/employees", icon: Briefcase, group: "HRM" },
  { title: "User Management", url: "/hrm/users", icon: BookUser, group: "HRM" },

  { title: "Settings", url: "/settings", icon: Cog, group: "Settings" },
  { title: "Account", url: "/settings/account", icon: CircleUser, group: "Settings" },
  { title: "Company Details", url: "/settings/company-details", icon: Factory, group: "Settings" },
  { title: "Notifications", url: "/notifications", icon: Bell, group: "Notifications" },
  { title: "Get Help", url: "/help", icon: CircleQuestionMark, group: "Help" },
];

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const router = useRouter()
  const { data: session, isPending } = authClient.useSession()

  const filteredNavigation = React.useMemo(() => {
    if (isPending) return []

    const userRole = (session?.user?.role || "user") as RoleType

    const hasAccess = (itemTitle: string) => {
      const requiredPermission = PERMISSION_MAP[itemTitle]
      if (!requiredPermission) return true

      return authClient.admin.checkRolePermission({
        role: userRole,
        permissions: requiredPermission
      })
    }

    return navigationData.filter((item) => hasAccess(item.title))
  }, [session, isPending])

  // Group items by category
  const groupedNavigation = React.useMemo(() => {
    const groups: Record<string, typeof navigationData> = {}

    filteredNavigation.forEach((item) => {
      if (!groups[item.group]) {
        groups[item.group] = []
      }
      groups[item.group].push(item)
    })

    return groups
  }, [filteredNavigation])

  const handleSelect = (url: string) => {
    onOpenChange(false)
    router.push(url)
  }

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [open, onOpenChange])

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search pages..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {Object.entries(groupedNavigation).map(([group, items], index, array) => (
          <React.Fragment key={group}>
            <CommandGroup heading={group}>
              {items.map((item) => (
                <CommandItem
                  key={item.url}
                  value={item.title}
                  onSelect={() => handleSelect(item.url)}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
            {index < array.length - 1 && <CommandSeparator />}
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  )
}