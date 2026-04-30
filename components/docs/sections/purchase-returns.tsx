"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function PurchaseReturnsSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Purchase Returns document goods returned to suppliers due to defects, damage, incorrect items, or
                    other quality issues. Returns reduce inventory levels and accounts payable balances, creating a
                    credit against future purchases or triggering refunds.
                </p>
                <p className="leading-7 mb-6">
                    Purchase return transactions must reference the original purchase order and specify the reason for
                    return. Proper documentation is essential for supplier relationship management and inventory accuracy.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Creating a Purchase Return</h2>
                <div className="ml-2">
                    <Step title="Navigate to Purchase Returns">
                        Access <strong>Procurement &gt; Purchase Returns</strong> from the main navigation menu.
                    </Step>
                    <Step title="Initiate Return">
                        Click <strong>New Return</strong>. Select the supplier and original purchase order.
                    </Step>
                    <Step title="Select Items">
                        Choose the items to return and specify quantities. The system validates against received quantities.
                    </Step>
                    <Step title="Specify Reason">
                        Enter a mandatory reason for the return (e.g., "Defective goods", "Incorrect items shipped").
                    </Step>
                    <Step title="Post Return">
                        Click <strong>Save</strong>. Inventory is reduced immediately and accounting entries are posted.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Accounting Impact</h2>
                <p className="leading-7 mb-4">
                    Purchase returns reverse the original purchase accounting entries:
                </p>
                <div className="rounded-md border p-4 bg-muted/30 mb-6">
                    <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Accounts Payable (Liability) - Return Amount</p>
                    <p className="text-sm font-mono mb-2"><strong>Credit:</strong> Inventory (Asset) - Subtotal</p>
                    <p className="text-sm font-mono"><strong>Credit:</strong> Input Tax (Asset) - Tax Amount</p>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Compliance & Audit</h2>
                <p className="leading-7 mb-6">
                    All purchase returns are logged with user identification, timestamp, and mandatory reason. Returns
                    are immutable once posted. The system maintains a complete audit trail linking returns to original
                    purchase orders for supplier performance analysis and quality control.
                </p>

                <PermissionTable
                    resourceName="Purchase Returns"
                    userPerms="View, Create, Update"
                    managerPerms="View, Create, Update, Update Status, Soft Delete"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
