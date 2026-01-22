"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function PurchasesSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Purchase Orders are formal procurement documents issued to suppliers for the acquisition of
                    materials, products, or services. Each purchase order creates an accounts payable liability
                    and, upon receipt, updates inventory levels.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Accounting Impact</h2>
                <p className="leading-7 mb-4">
                    When a purchase order is marked as <strong>Received</strong>, the following entries are posted:
                </p>
                <div className="rounded-md border p-4 bg-muted/30 mb-6">
                    <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Inventory/Expense Account (Asset/Expense) - Subtotal</p>
                    <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Input Tax (Asset) - Tax Amount</p>
                    <p className="text-sm font-mono"><strong>Credit:</strong> Accounts Payable (Liability) - Total Amount</p>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Creating a Purchase Order</h2>
                <div className="ml-2">
                    <Step title="Navigate to Purchases">
                        Access <strong>Procurement &gt; Purchases</strong> from the main menu.
                    </Step>
                    <Step title="Initiate Order">
                        Click <strong>New Purchase</strong>. Select the supplier from the dropdown.
                    </Step>
                    <Step title="Add Line Items">
                        Add materials or products to the order. Unit costs and tax rates are retrieved from
                        the supplier's pricing or material master data.
                    </Step>
                    <Step title="Review & Save">
                        Verify order details. Click <strong>Save as Draft</strong> or <strong>Save & Order</strong>
                        to send to the supplier.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Receiving Goods</h2>
                <div className="ml-2">
                    <Step title="Open Purchase Order">
                        Locate the confirmed purchase order in <strong>Ordered</strong> status.
                    </Step>
                    <Step title="Mark as Received">
                        Change status to <strong>Received</strong>. This action posts accounting entries and
                        updates inventory quantities.
                    </Step>
                    <Step title="Verify Inventory">
                        Confirm that inventory levels have been updated correctly in the Inventory module.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Compliance & Audit</h2>
                <p className="leading-7 mb-6">
                    All purchase transactions are logged with user identification and timestamps. Purchase order
                    numbers are sequential and immutable. Goods receipt is a critical control point for inventory
                    valuation and must be performed by authorized personnel only.
                </p>

                <PermissionTable
                    resourceName="Purchase Orders"
                    userPerms="View, Create, Update, Update Status (Draft to Ordered)"
                    managerPerms="All User permissions + Soft Delete, Update Status (Ordered to Received), Create Payment Voucher"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
