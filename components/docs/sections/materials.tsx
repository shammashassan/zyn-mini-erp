"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function MaterialsSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">


            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Materials represent raw materials, components, or consumables purchased from suppliers for use in
                    production, assembly, or operational activities. Unlike Products, Materials are not typically sold
                    directly to customers but are consumed internally or transformed into finished goods.
                </p>
                <p className="leading-7 mb-6">
                    Material master data supports procurement planning, inventory valuation, and cost accounting. Accurate
                    material records are essential for calculating Cost of Goods Sold (COGS) and maintaining inventory accuracy.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Key Attributes</h2>
                <ul className="list-disc list-inside space-y-2 mb-6 text-sm">
                    <li><strong>Material Name:</strong> Descriptive identifier for the material</li>
                    <li><strong>SKU (Stock Keeping Unit):</strong> Unique code for inventory tracking</li>
                    <li><strong>Unit Cost:</strong> Standard or average cost per unit for valuation</li>
                    <li><strong>Preferred Supplier:</strong> Default supplier for procurement</li>
                    <li><strong>Current Stock:</strong> Real-time inventory quantity (auto-calculated)</li>
                    <li><strong>Reorder Level:</strong> Minimum stock threshold triggering replenishment alerts</li>
                </ul>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Creating a Material</h2>
                <div className="ml-2">
                    <Step title="Navigate to Materials">
                        Access <strong>Inventory &gt; Materials</strong> from the main navigation menu.
                    </Step>
                    <Step title="Initiate Creation">
                        Click <strong>New Material</strong>. The system will prompt for material details.
                    </Step>
                    <Step title="Configure Material">
                        Enter Material Name, SKU (optional, auto-generated if blank), Unit Cost, and select
                        Preferred Supplier from the dropdown.
                    </Step>
                    <Step title="Set Inventory Parameters">
                        Specify Reorder Level to enable low-stock alerts. Current Stock is initialized via
                        Stock Adjustment transactions.
                    </Step>
                    <Step title="Save Material">
                        Click <strong>Save</strong> to add the material to the inventory master.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Accounting Impact</h2>
                <p className="leading-7 mb-6">
                    Materials are valued at cost and recorded as Inventory (Asset) on the balance sheet. When consumed
                    in production or operations, material costs are transferred to Work-in-Progress or Expense accounts,
                    impacting COGS or operating expenses.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Data Integrity</h2>
                <p className="leading-7 mb-6">
                    Materials referenced in purchase orders, stock adjustments, or production records cannot be permanently
                    deleted. The system enforces referential integrity to preserve audit trails and cost accounting accuracy.
                </p>

                <PermissionTable
                    resourceName="Materials"
                    userPerms="View, Create, Update"
                    managerPerms="View, Create, Update, Soft Delete"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
