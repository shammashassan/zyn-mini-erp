"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function CreditNotesSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Credit Notes are documents issued by suppliers acknowledging a reduction in the amount owed by your
                    business. Common scenarios include purchase returns, pricing adjustments, damaged goods compensation,
                    or billing errors.
                </p>
                <p className="leading-7 mb-6">
                    Credit notes reduce accounts payable balances and can be applied against future purchases or converted
                    to cash refunds. Proper recording ensures accurate financial statements and supplier account reconciliation.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Recording a Credit Note</h2>
                <div className="ml-2">
                    <Step title="Navigate to Credit Notes">
                        Access <strong>Procurement &gt; Credit Notes</strong> from the main navigation menu.
                    </Step>
                    <Step title="Initiate Entry">
                        Click <strong>New Credit Note</strong>. Select the supplier from the dropdown.
                    </Step>
                    <Step title="Enter Credit Details">
                        Specify the credit amount and provide a reference (supplier's credit note number).
                        Enter a reason for the credit (e.g., "Return of defective goods", "Pricing adjustment").
                    </Step>
                    <Step title="Link to Purchase Order">
                        Optionally link the credit note to the original purchase order for audit trail purposes.
                    </Step>
                    <Step title="Post Credit Note">
                        Click <strong>Save</strong>. Accounts payable balance is reduced immediately.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Accounting Impact</h2>
                <p className="leading-7 mb-4">
                    Credit notes reduce the accounts payable liability:
                </p>
                <div className="rounded-md border p-4 bg-muted/30 mb-6">
                    <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Accounts Payable (Liability) - Credit Amount</p>
                    <p className="text-sm font-mono"><strong>Credit:</strong> Purchase Returns / Adjustments (Income or Expense Offset)</p>
                </div>
                <p className="leading-7 mb-6">
                    The credit can be applied against future payment vouchers or processed as a cash refund, depending
                    on supplier agreement.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Compliance & Audit</h2>
                <p className="leading-7 mb-6">
                    All credit notes are logged with user identification, timestamp, and mandatory reference. Credit notes
                    are immutable once posted. The system maintains a complete audit trail linking credits to suppliers
                    and original purchase transactions for reconciliation and financial reporting.
                </p>

                <PermissionTable
                    resourceName="Credit Notes"
                    userPerms="View, Create, Update"
                    managerPerms="View, Create, Update, Update Status, Soft Delete, Create Payment"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
