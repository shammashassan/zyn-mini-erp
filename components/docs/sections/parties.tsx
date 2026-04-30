"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function PartiesSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">


            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Parties are the central entities in the system, representing individuals or organizations you do business with.
                    A single Party entity can act as a Customer, Supplier, Payee, or any combination of these roles. This unified model
                    simplifies master data management and prevents duplication.
                </p>
                <p className="leading-7 mb-6">
                    Rather than managing separate records for a company that buys from you and also sells to you, you manage a single
                    Party record with both "Customer" and "Supplier" roles enabled.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Key Attributes</h2>
                <ul className="list-disc list-inside space-y-2 mb-6 text-sm">
                    <li><strong>Party Name:</strong> Legal or trading name of the entity.</li>
                    <li><strong>Roles:</strong> Defines the relationship (Customer, Supplier, Payee).</li>
                    <li><strong>Tags:</strong> Categorization labels (e.g., "VIP", "Wholesale", "Local").</li>
                    <li><strong>Status:</strong> Active or Inactive state.</li>
                </ul>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Managing Parties</h2>
                <div className="ml-2">
                    <Step title="Navigate to Parties">
                        Access <strong>People &gt; Parties</strong> from the main navigation menu.
                    </Step>
                    <Step title="Create Party">
                        Click <strong>New Party</strong>. Enter the party name and select appropriate roles (Customer, Supplier, etc.).
                        You can link Contacts to this party immediately or later.
                    </Step>
                    <Step title="Edit Party">
                        Select a party to view their dashboard. From here you can edit core details, manage linked contacts,
                        and view transaction history across all roles.
                    </Step>
                    <Step title="Soft Delete">
                        Parties can be soft-deleted to hide them from selection lists while preserving historical data.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Unified Transaction History</h2>
                <p className="leading-7 mb-6">
                    The Party Dashboard provides a 360-degree view of the relationship. You can see:
                </p>
                <ul className="list-disc list-inside mt-2 ml-4 mb-6">
                    <li>Sales Orders & Invoices (Customer Role)</li>
                    <li>Purchase Orders & Bills (Supplier Role)</li>
                    <li>Payments & Receipts</li>
                    <li>Net Balance across all activities</li>
                </ul>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Data Integrity</h2>
                <p className="leading-7 mb-6">
                    Parties linked to any transaction (Invoice, Order, etc.) cannot be permanently deleted.
                    Referential integrity ensures that your accounting records always point to valid entity data.
                </p>

                <PermissionTable
                    resourceName="Parties"
                    userPerms="View, Create, Update"
                    managerPerms="View, Create, Update, Soft Delete"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
