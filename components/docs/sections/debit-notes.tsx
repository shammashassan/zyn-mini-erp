"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function DebitNotesSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Debit Notes are issued to customers to correct billing errors where the original invoice
                    undercharged the client. They serve to increase the specific customer's accounts receivable
                    balance without issuing a new full invoice.
                </p>
                <p className="leading-7 mb-6">
                    Common scenarios include post-invoice freight charges, correction of pricing errors, or interest
                    charged on overdue payments.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Accounting Impact</h2>
                <p className="leading-7 mb-4">
                    Posting a Debit Note creates a journal obligation for the customer:
                </p>
                <div className="rounded-md border p-4 bg-muted/30 mb-6">
                    <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Accounts Receivable (Asset)</p>
                    <p className="text-sm font-mono"><strong>Credit:</strong> Other Income / Service Revenue (Income)</p>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Creating a Debit Note</h2>
                <div className="ml-2">
                    <Step title="Navigate">
                        Go to <strong>Sales &gt; Debit Notes</strong> and click <strong>New Debit Note</strong>.
                    </Step>
                    <Step title="Details">
                        Select the Customer and specify the Amount. Provide a clear reason (e.g., "Undercharge on Invoice #1024")
                        for the adjustment.
                    </Step>
                    <Step title="Post">
                        Click <strong>Save</strong>. The customer's outstanding balance increases immediately.
                        The debit note can subsequently be allocated against a future receipt voucher.
                    </Step>
                </div>

                <PermissionTable
                    resourceName="Debit Notes"
                    userPerms="View, Create, Update"
                    managerPerms="View, Create, Update, Update Status, Soft Delete, Create Receipt"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
