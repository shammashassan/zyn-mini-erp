"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function StockAdjustmentSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">


            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Stock Adjustments provide a mechanism to manually correct inventory quantities for products and materials
                    when physical counts differ from system records. These transactions are critical for maintaining inventory
                    accuracy and ensuring financial statements reflect true asset values.
                </p>
                <p className="leading-7 mb-6">
                    Common use cases include recording shrinkage, damaged goods write-offs, theft losses, physical count
                    reconciliations, and establishing opening balances during system implementation.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Adjustment Types</h2>
                <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                        <Badge variant="success" appearance="outline">Increase</Badge>
                        <p className="text-sm leading-relaxed">
                            Adds quantity to inventory. Used for found stock, correction of undercount errors, or
                            opening balance entries. Increases asset value on the balance sheet.
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <Badge variant="destructive" appearance="outline">Decrease</Badge>
                        <p className="text-sm leading-relaxed">
                            Removes quantity from inventory. Used for shrinkage, damaged goods, theft, spoilage, or
                            correction of overcount errors. Reduces asset value and impacts expense accounts.
                        </p>
                    </div>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Creating a Stock Adjustment</h2>
                <div className="ml-2">
                    <Step title="Navigate to Stock Adjustment">
                        Access <strong>Inventory &gt; Stock Adjustment</strong> from the main navigation menu.
                    </Step>
                    <Step title="Initiate Adjustment">
                        Click <strong>New Adjustment</strong>. The system will prompt for adjustment details.
                    </Step>
                    <Step title="Select Item">
                        Choose the Product or Material from the dropdown. Current stock level is displayed for reference.
                    </Step>
                    <Step title="Specify Adjustment Type">
                        Select <strong>Increase</strong> to add stock or <strong>Decrease</strong> to remove stock.
                    </Step>
                    <Step title="Enter Quantity and Reason">
                        Specify the adjustment quantity (positive integer). Provide a mandatory reason for audit purposes
                        (e.g., "Physical count variance - Q4 2024", "Damaged during warehouse relocation").
                    </Step>
                    <Step title="Post Adjustment">
                        Click <strong>Save</strong>. Inventory quantities and accounting entries are updated immediately.
                        This action is irreversible.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Accounting Impact</h2>
                <p className="leading-7 mb-4">
                    Stock adjustments directly affect the general ledger. The accounting treatment depends on the adjustment type:
                </p>
                <div className="space-y-4 mb-6">
                    <div>
                        <p className="font-semibold mb-2">Increase (Stock Found / Opening Balance):</p>
                        <div className="rounded-md border p-4 bg-muted/30">
                            <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Inventory (Asset) - Quantity × Unit Cost</p>
                            <p className="text-sm font-mono"><strong>Credit:</strong> Inventory Adjustment Gain (Income) or Opening Balance Equity</p>
                        </div>
                    </div>
                    <div>
                        <p className="font-semibold mb-2">Decrease (Shrinkage / Damage / Theft):</p>
                        <div className="rounded-md border p-4 bg-muted/30">
                            <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Inventory Loss / Shrinkage Expense (Expense)</p>
                            <p className="text-sm font-mono"><strong>Credit:</strong> Inventory (Asset) - Quantity × Unit Cost</p>
                        </div>
                    </div>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Compliance & Audit</h2>
                <p className="leading-7 mb-4">
                    All stock adjustments are logged with user identification, timestamp, and mandatory reason. Adjustments
                    are immutable once posted and cannot be edited or deleted (only voided by creating an offsetting entry).
                </p>
                <p className="leading-7 mb-6">
                    Frequent or large adjustments may indicate inventory control weaknesses and should be investigated.
                    Adjustment reports are subject to audit review and reconciliation with physical count documentation.
                </p>

                <PermissionTable
                    resourceName="Stock Adjustments"
                    userPerms="View, Create"
                    managerPerms="View, Create, Soft Delete"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
