"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function QuotationsSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Quotations (estimates/proposals) allow you to provide customers with pricing and terms for goods or
                    services before a formal sale occurs. They are non-posting documents, meaning they do not affect
                    accounting ledgers or inventory quantities until converted into an invoice or delivery note.
                </p>
                <p className="leading-7 mb-6">
                    Using quotations helps streamline the sales process, ensures accurate pricing agreements, and
                    provides a professional document for customer approval.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Creating & Sending</h2>
                <div className="ml-2">
                    <Step title="Navigate to Quotations">
                        Access <strong>Sales &gt; Quotations</strong> and click <strong>New Quotation</strong>.
                    </Step>
                    <Step title="Enter Details">
                        Select the Customer and add line items (products/services). The system pulls current pricing
                        and tax rates, which can be overridden if permission allows.
                    </Step>
                    <Step title="Set Expiry">
                        Define an <strong>Expiry Date</strong> (default: 30 days) to limit the validity of the offer.
                    </Step>
                    <Step title="Save and Send">
                        Click <strong>Save & Send</strong>. You can print the quote as a PDF or email it directly
                        from the system.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Conversion Workflow</h2>
                <p className="leading-7 mb-4">
                    Converting an accepted quotation eliminates data re-entry and ensures errors are minimized.
                </p>
                <div className="ml-2">
                    <Step title="Open Quotation">
                        Locate the accepted quotation in the list.
                    </Step>
                    <Step title="Convert Action">
                        Click <strong>Convert to Invoice</strong>.
                    </Step>
                    <Step title="Review & Post">
                        The system generates a drafted invoice with all details copied. Review the final invoice
                        and click <strong>Approve</strong> to post it to the ledger. The original quotation status
                        updates to <strong>Invoiced</strong> automatically.
                    </Step>
                </div>

                <PermissionTable
                    resourceName="Quotations"
                    userPerms="View, Create, Update, Update Status, Create Invoice"
                    managerPerms="All User permissions + Soft Delete"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
