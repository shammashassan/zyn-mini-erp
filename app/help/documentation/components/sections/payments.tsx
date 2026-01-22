"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function PaymentsSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Payment Vouchers document disbursements made to suppliers, vendors, or payees. Each payment
                    reduces the accounts payable balance and must be allocated against one or more outstanding
                    purchase orders, expenses, or credit notes.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Accounting Impact</h2>
                <p className="leading-7 mb-4">
                    Upon creation, the system posts the following journal entries:
                </p>
                <div className="rounded-md border p-4 bg-muted/30 mb-6">
                    <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Accounts Payable (Liability) - Amount Paid</p>
                    <p className="text-sm font-mono"><strong>Credit:</strong> Cash/Bank Account (Asset) - Amount Paid</p>
                </div>
                <p className="leading-7 mb-6">
                    The allocated purchase orders are updated with payment status. Once posted, payment vouchers
                    are immutable. Corrections require voiding the payment and creating a new entry.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Recording a Payment</h2>
                <div className="ml-2">
                    <Step title="Navigate to Payments">
                        Access <strong>Procurement &gt; Payments</strong> and click <strong>New Payment</strong>.
                    </Step>
                    <Step title="Select Payee">
                        Choose the supplier or payee to whom payment is being made. Outstanding purchase orders
                        and expenses will be displayed.
                    </Step>
                    <Step title="Allocate to Documents">
                        Select one or more purchase orders or expenses to allocate the payment against. The system
                        displays outstanding balances for each document.
                    </Step>
                    <Step title="Enter Payment Details">
                        Specify Amount Paid, Payment Mode (Bank Transfer, Cheque, Cash, etc.), and Transaction
                        Reference (e.g., cheque number, wire transfer ID).
                    </Step>
                    <Step title="Post Transaction">
                        Click <strong>Save</strong> to post the payment. Accounting entries are created immediately
                        and cannot be reversed.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Compliance & Audit</h2>
                <p className="leading-7 mb-6">
                    Payment vouchers are sequentially numbered and immutable once posted. All payments are logged
                    with timestamp and user identification. Payment vouchers are cross-referenced with bank statements
                    during reconciliation processes.
                </p>

                <PermissionTable
                    resourceName="Payment Vouchers"
                    userPerms="View, Create"
                    managerPerms="View, Create, Soft Delete (Void)"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
