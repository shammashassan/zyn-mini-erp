"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function SalesReturnsSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Sales Returns allow for the processing of goods returned by customers due to damage, defects,
                    or ordering errors. This document facilitates the reversal of the original sales transaction
                    and manages the restocking of inventory.
                </p>
                <p className="leading-7 mb-6">
                    Processing a return typically results in the issuance of a credit note to the customer or a refund,
                    along with the restoration of inventory levels for resaleable items.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Accounting & Inventory Impact</h2>
                <p className="leading-7 mb-4">
                    A posted Sales Return triggers the following updates:
                </p>
                <div className="rounded-md border p-4 bg-muted/30 mb-6">
                    <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Sales Returns / Revenue Reversal (Income Offset)</p>
                    <p className="text-sm font-mono mb-2"><strong>Credit:</strong> Accounts Receivable (Asset)</p>
                    <Separator className="my-2 bg-border/50" />
                    <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Inventory (Asset) - if goods are restocked</p>
                    <p className="text-sm font-mono"><strong>Credit:</strong> Cost of Goods Sold (Expense) - Reversal</p>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Processing Steps</h2>
                <div className="ml-2">
                    <Step title="Initiate Return">
                        Go to <strong>Sales &gt; Sales Returns</strong> and click <strong>New Return</strong>.
                    </Step>
                    <Step title="Reference Invoice">
                        Selecting the original invoice allows the system to auto-populate pricing and tax details,
                        ensuring the refund matches the original sale.
                    </Step>
                    <Step title="Specify Items and Condition">
                        Enter the quantity being returned. Indicate if items are to be returned to stock
                        (increasing inventory) or written off (if damaged).
                    </Step>
                    <Step title="Approve">
                        Click <strong>Save</strong>. The system generates a Credit Note for the customer's account balance
                        and updates inventory records accordingly.
                    </Step>
                </div>

                <PermissionTable
                    resourceName="Sales Returns"
                    userPerms="View, Create, Update"
                    managerPerms="View, Create, Update, Update Status, Soft Delete"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
