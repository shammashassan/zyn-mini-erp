"use client";

import { Separator } from "@/components/ui/separator";
import {
    TrendingUp,
    ShoppingBag,
    PieChart,
    Wallet,
    Percent,
    ClipboardList
} from "lucide-react";
import { PermissionTable, Step } from "../shared";

export default function ReportsSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    The Reporting module provides real-time insights into business performance, financial health, and operational
                    efficiency. Reports are generated dynamically from transactional data, ensuring that all metrics reflect
                    the most current state of the ledger and inventory.
                </p>
                <p className="leading-7 mb-6">
                    These tools are essential for management decision-making, tax compliance, and performance tracking across
                    sales, procurement, and finance departments.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Available Reports</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 py-4 mb-6">
                    {[
                        { name: "Sales Report", icon: TrendingUp },
                        { name: "Purchase Report", icon: ShoppingBag },
                        { name: "Expense Report", icon: PieChart },
                        { name: "Payments Report", icon: Wallet },
                        { name: "Tax Report", icon: Percent },
                        { name: "Inventory Report", icon: ClipboardList }
                    ].map(r => (
                        <div key={r.name} className="flex items-center p-4 border rounded-lg gap-3 bg-muted/20 hover:bg-muted/30 transition-colors">
                            <r.icon className="h-5 w-5 text-primary" />
                            <span className="font-medium">{r.name}</span>
                        </div>
                    ))}
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Generating Reports</h2>
                <div className="ml-2">
                    <Step title="Select Report">
                        Navigate to the <strong>Reports</strong> section and choose the desired report type.
                    </Step>
                    <Step title="Configure Filters">
                        Use the date picker to define the reporting period (e.g., "This Month", "Last Year", "Custom Range").
                        Apply additional filters (e.g., by Customer, Supplier, or Product Category) where available.
                    </Step>
                    <Step title="View & Analyze">
                        Review the data on-screen. Summary cards track Key Performance Indicators (KPIs) such as Total Revenue
                        or Net Profit.
                    </Step>
                    <Step title="Export Data">
                        Click <strong>Export</strong> to download the report in Excel or CSV format for external analysis,
                        archiving, or presentation.
                    </Step>
                </div>

                <PermissionTable
                    resourceName="Reports"
                    userPerms="None (Access Denied)"
                    managerPerms="Read, Export"
                    adminPerms="Full Access"
                />
            </div>
        </div>
    );
}
