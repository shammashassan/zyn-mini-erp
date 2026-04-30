"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function DeliveryNotesSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Delivery Notes (or goods dispatch notes) serve as proof of shipment and are used to verify the
                    contents of a delivery with the customer. They accompany the physical goods and detail the
                    items and quantities dispatched.
                </p>
                <p className="leading-7 mb-6">
                    Crucially, the Delivery Note is the transaction that triggers <strong>inventory deduction</strong>.
                    It bridges the gap between the financial sale (Invoice) and the physical movement of stock.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Inventory Impact</h2>
                <p className="leading-7 mb-4">
                    When a delivery note is created and saved:
                </p>
                <div className="rounded-md border p-4 bg-muted/30 mb-6">
                    <p className="text-sm font-mono mb-2"><strong>Action:</strong> Inventory Quantity Deduction</p>
                    <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Cost of Goods Sold (Expense)</p>
                    <p className="text-sm font-mono"><strong>Credit:</strong> Inventory (Asset) - Quantity × Unit Cost</p>
                </div>
                <p className="leading-7 mb-6">
                    This ensures that stock levels in the system accurately reflect physical availability at the
                    warehouse.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Creation Workflow</h2>
                <div className="ml-2">
                    <Step title="From Invoice (Recommended)">
                        To ensure consistency, create delivery notes directly from an approved <strong>Invoice</strong>.
                    </Step>
                    <Step title="Select Items">
                        Open the Invoice and click <strong>Create Delivery</strong>. Select the items being shipped.
                        You can create multiple delivery notes for a single invoice (partial delivery).
                    </Step>
                    <Step title="Verify & Save">
                        Confirm quantities and click <strong>Save</strong>. The system instantly updates stock levels.
                        Once saved, the delivery note cannot be edited to prevent inventory discrepancies.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Compliance & Audit</h2>
                <p className="leading-7 mb-6">
                    Delivery Notes are sequentially numbered and support multiple status updates (e.g., Dispatched, Delivered).
                    Signed delivery notes should be retained (digitally or physically) as proof of fulfillment for
                    revenue recognition and dispute resolution.
                </p>

                <PermissionTable
                    resourceName="Delivery Notes"
                    userPerms="View, Create, Update Status"
                    managerPerms="View, Create, Update Status, Soft Delete"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
