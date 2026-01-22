"use client";

import React from "react";
import {
    BookOpen,
    Users,
    ShoppingCart,
    Truck,
    Package,
    BarChart3,
    Settings,
    Shield,
    Layers,
    ArrowRightLeft,
    Building2,
    FileClock,
    FileText,
    Ticket,
    ClipboardCheck,
    Undo2,
    Banknote,
    Redo2,
    TrendingUp,
    ShoppingBag,
    PieChart,
    Wallet,
    Percent,
    ClipboardList,
    ListTree,
    NotebookPen,
    Landmark,
    Briefcase,
    BookUser,
    Archive,
    Receipt,
    BookOpenText,
    CircleUserRound,
    LayoutGrid,
} from "lucide-react";

import GettingStartedSection from "./components/sections/getting-started";
import RolesPermissionsSection from "./components/sections/roles-permissions";
import ProductsSection from "./components/sections/products";
import MaterialsSection from "./components/sections/materials";
import StockAdjustmentSection from "./components/sections/stock-adjustment";
import CustomersSection from "./components/sections/customers";
import SuppliersSection from "./components/sections/suppliers";
import PayeesSection from "./components/sections/payees";
import QuotationsSection from "./components/sections/quotations";
import InvoicesSection from "./components/sections/invoices";
import ReceiptsSection from "./components/sections/receipts";
import DeliveryNotesSection from "./components/sections/delivery-notes";
import SalesReturnsSection from "./components/sections/sales-returns";
import DebitNotesSection from "./components/sections/debit-notes";
import PurchasesSection from "./components/sections/purchases";
import ExpensesSection from "./components/sections/expenses";
import PaymentsSection from "./components/sections/payments";
import PurchaseReturnsSection from "./components/sections/purchase-returns";
import CreditNotesSection from "./components/sections/credit-notes";
import ReportsSection from "./components/sections/reports";
import ChartOfAccountsSection from "./components/sections/chart-of-accounts";
import JournalSection from "./components/sections/journal";
import FinancialStatementsSection from "./components/sections/financial-statements";
import EmployeesSection from "./components/sections/employees";
import UserManagementSection from "./components/sections/user-management";


export interface DocSection {
    id: string;
    title: string;
    icon: React.ElementType;
    group: string;
    description: string;
    content: React.ReactNode;
}

export const DOC_SECTIONS: DocSection[] = [
    // --- General ---
    {
        id: "getting-started",
        group: "General",
        title: "Getting Started",
        icon: BookOpen,
        description: "Enterprise Resource Planning system for comprehensive business operations management.",
        content: <GettingStartedSection />,
    },
    {
        id: "roles-permissions",
        group: "General",
        title: "Roles & Permissions",
        icon: Shield,
        description: "Role-Based Access Control (RBAC) framework for system security and operational governance.",
        content: <RolesPermissionsSection />,
    },

    // --- Inventory ---
    {
        id: "products",
        group: "Inventory",
        title: "Products",
        icon: Package,
        description: "Finished goods inventory and sellable items management.",
        content: <ProductsSection />,
    },
    {
        id: "materials",
        group: "Inventory",
        title: "Materials",
        icon: Layers,
        description: "Raw materials and component inventory management.",
        content: <MaterialsSection />,
    },
    {
        id: "stock-adjustment",
        group: "Inventory",
        title: "Stock Adjustment",
        icon: ArrowRightLeft,
        description: "Manual inventory quantity corrections and opening balances.",
        content: <StockAdjustmentSection />,
    },

    // --- People ---
    {
        id: "customers",
        group: "People",
        title: "Customers",
        icon: Users,
        description: "Client and accounts receivable master data management.",
        content: <CustomersSection />,
    },
    {
        id: "suppliers",
        group: "People",
        title: "Suppliers",
        icon: Building2,
        description: "Vendor and accounts payable master data management.",
        content: <SuppliersSection />,
    },
    {
        id: "payees",
        group: "People",
        title: "Payees",
        icon: Users,
        description: "Management of non-supplier payment recipients.",
        content: <PayeesSection />,
    },

    // --- Sales ---
    {
        id: "quotations",
        group: "Sales",
        title: "Quotations",
        icon: FileClock,
        description: "Sales estimates, proposals, and customer pricing.",
        content: <QuotationsSection />,
    },
    {
        id: "invoices",
        group: "Sales",
        title: "Invoices",
        icon: FileText,
        description: "Accounts receivable documentation and revenue recognition.",
        content: <InvoicesSection />,
    },
    {
        id: "receipts",
        group: "Sales",
        title: "Receipts",
        icon: Ticket,
        description: "Customer payment receipts and accounts receivable allocation.",
        content: <ReceiptsSection />,
    },
    {
        id: "delivery-notes",
        group: "Sales",
        title: "Delivery Notes",
        icon: Truck,
        description: "Inventory dispatch and logistics management.",
        content: <DeliveryNotesSection />,
    },
    {
        id: "sales-returns",
        group: "Sales",
        title: "Sales Returns",
        icon: Undo2,
        description: "Customer returns authorization and processing.",
        content: <SalesReturnsSection />,
    },
    {
        id: "debit-notes",
        group: "Sales",
        title: "Debit Notes",
        icon: ClipboardCheck,
        description: "Adjustments increasing customer indebtedness.",
        content: <DebitNotesSection />,
    },

    // --- Procurement ---
    {
        id: "purchases",
        group: "Procurement",
        title: "Purchases",
        icon: ShoppingCart,
        description: "Supplier procurement and accounts payable management.",
        content: <PurchasesSection />,
    },
    {
        id: "expenses",
        group: "Procurement",
        title: "Expenses",
        icon: Banknote,
        description: "Operating expense tracking and accounts payable management.",
        content: <ExpensesSection />,
    },
    {
        id: "payments",
        group: "Procurement",
        title: "Payments",
        icon: Banknote,
        description: "Supplier payments and accounts payable settlement.",
        content: <PaymentsSection />,
    },
    {
        id: "purchase-returns",
        group: "Procurement",
        title: "Purchase Returns",
        icon: Redo2,
        description: "Vendor returns and accounts payable adjustments.",
        content: <PurchaseReturnsSection />,
    },
    {
        id: "credit-notes",
        group: "Procurement",
        title: "Credit Notes",
        icon: ClipboardCheck,
        description: "Supplier-issued credits and accounts payable reductions.",
        content: <CreditNotesSection />,
    },

    // --- Reports ---
    {
        id: "reports",
        group: "Reports",
        title: "Reports Overview",
        icon: BarChart3,
        description: "Business intelligence and operational analytics.",
        content: <ReportsSection />,
    },

    // --- Accounting ---
    {
        id: "chart-of-accounts",
        group: "Accounting",
        title: "Chart of Accounts",
        icon: ListTree,
        description: "General ledger structure and account classification.",
        content: <ChartOfAccountsSection />,
    },
    {
        id: "journal",
        group: "Accounting",
        title: "Journal",
        icon: NotebookPen,
        description: "Manual double-entry accounting transactions.",
        content: <JournalSection />,
    },
    {
        id: "financial-statements",
        group: "Accounting",
        title: "Financial Statements",
        icon: Landmark,
        description: "Core auditing and statutory reporting documents.",
        content: <FinancialStatementsSection />,
    },

    // --- HRM ---
    {
        id: "employees",
        group: "HRM",
        title: "Employees",
        icon: Briefcase,
        description: "Human capital and payroll master data.",
        content: <EmployeesSection />,
    },
    {
        id: "user-management",
        group: "HRM",
        title: "User Management",
        icon: BookUser,
        description: "Identity, access control, and security administration.",
        content: <UserManagementSection />,
    },
];


export const GROUPED_SECTIONS = DOC_SECTIONS.reduce((acc, section) => {
    if (!acc[section.group]) acc[section.group] = [];
    acc[section.group].push(section);
    return acc;
}, {} as Record<string, DocSection[]>);

export const GroupsOrder = [
    "General", "Inventory", "People", "Sales", "Procurement", "Reports", "Accounting", "HRM"
];

export const GROUP_ICONS: Record<string, React.ElementType> = {
    "General": LayoutGrid,
    "Inventory": Archive,
    "People": Users,
    "Sales": FileText,
    "Procurement": Receipt,
    "Reports": BarChart3,
    "Accounting": BookOpenText,
    "HRM": CircleUserRound,
};
