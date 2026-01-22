"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function ReceiptsSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">


            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Receipt Vouchers document payments received from customers. Each receipt reduces the customer's
                    accounts receivable balance and must be allocated against one or more outstanding invoices or
                    debit notes.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Accounting Impact</h2>
                <p className="leading-7 mb-4">
                    Upon creation, the system posts the following journal entries:
                </p>
                <div className="rounded-md border p-4 bg-muted/30 mb-6">
                    <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Cash/Bank Account (Asset) - Amount Received</p>
                    <p className="text-sm font-mono"><strong>Credit:</strong> Accounts Receivable (Asset) - Amount Received</p>
                </div>
                <p className="leading-7 mb-6">
                    The allocated invoices are updated with payment status (Partially Paid or Paid). Once a receipt
                    is posted, it cannot be edited. Corrections require voiding the receipt and creating a new entry.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Recording a Receipt</h2>
                <div className="ml-2">
                    <Step title="Navigate to Receipts">
                        Access <strong>Sales &gt; Receipts</strong> and click <strong>New Receipt</strong>.
                    </Step>
                    <Step title="Select Customer">
                        Choose the customer from whom payment was received. Outstanding invoices will be displayed.
                    </Step>
                    <Step title="Allocate to Invoices">
                        Select one or more invoices to allocate the payment against. The system will display
                        outstanding balances for each invoice.
                    </Step>
                    <Step title="Enter Payment Details">
                        Specify Amount Received, Payment Mode (Cash, Bank Transfer, Cheque, etc.), and Transaction
                        Reference (e.g., cheque number, transaction ID).
                    </Step>
                    <Step title="Post Transaction">
                        Click <strong>Save</strong> to post the receipt. Accounting entries are created immediately
                        and cannot be reversed.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Compliance & Audit</h2>
                <p className="leading-7 mb-6">
                    Receipt vouchers are sequentially numbered and immutable once posted. All receipts are logged
                    with timestamp and user identification. Bank reconciliation reports cross-reference receipt
                    vouchers with bank statement entries.
                </p>

                <PermissionTable
                    resourceName="Receipt Vouchers"
                    userPerms="View, Create"
                    managerPerms="View, Create, Soft Delete (Void)"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
