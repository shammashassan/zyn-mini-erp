"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function ExpensesSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Expenses represent operating costs incurred in running the business that are not directly tied to
                    inventory purchases. Common examples include rent, utilities, salaries, professional fees, insurance,
                    and office supplies.
                </p>
                <p className="leading-7 mb-6">
                    Expense records create accounts payable liabilities (if unpaid) or directly reduce cash/bank balances
                    (if paid immediately). Proper expense categorization is essential for accurate profit and loss reporting
                    and tax compliance.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Key Attributes</h2>
                <ul className="list-disc list-inside space-y-2 mb-6 text-sm">
                    <li><strong>Payee:</strong> Individual or organization receiving payment</li>
                    <li><strong>Expense Category:</strong> Classification for P&L reporting (e.g., Rent, Utilities, Salaries)</li>
                    <li><strong>Amount:</strong> Total expense value including tax</li>
                    <li><strong>Tax Amount:</strong> Input tax for VAT/GST credit claims (if applicable)</li>
                    <li><strong>Payment Status:</strong> Unpaid (creates A/P) or Paid (reduces cash immediately)</li>
                    <li><strong>Reference:</strong> Invoice number, receipt number, or other supporting document ID</li>
                </ul>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Recording an Expense</h2>
                <div className="ml-2">
                    <Step title="Navigate to Expenses">
                        Access <strong>Procurement &gt; Expenses</strong> from the main navigation menu.
                    </Step>
                    <Step title="Initiate Entry">
                        Click <strong>New Expense</strong>. The system will prompt for expense details.
                    </Step>
                    <Step title="Select Payee and Category">
                        Choose the payee from the dropdown and select the appropriate expense category.
                        Categories map to expense accounts in the Chart of Accounts.
                    </Step>
                    <Step title="Enter Amount and Tax">
                        Specify the total amount and tax amount (if applicable). The system calculates the subtotal automatically.
                    </Step>
                    <Step title="Specify Payment Status">
                        Mark as <strong>Unpaid</strong> to create an accounts payable liability, or <strong>Paid</strong>
                        to record immediate cash disbursement.
                    </Step>
                    <Step title="Save Expense">
                        Click <strong>Save</strong>. Accounting entries are posted immediately.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Accounting Impact</h2>
                <p className="leading-7 mb-4">
                    The accounting treatment depends on the payment status:
                </p>
                <div className="space-y-4 mb-6">
                    <div>
                        <p className="font-semibold mb-2">Unpaid Expense:</p>
                        <div className="rounded-md border p-4 bg-muted/30">
                            <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Expense Account (Expense) - Subtotal</p>
                            <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Input Tax (Asset) - Tax Amount</p>
                            <p className="text-sm font-mono"><strong>Credit:</strong> Accounts Payable (Liability) - Total Amount</p>
                        </div>
                    </div>
                    <div>
                        <p className="font-semibold mb-2">Paid Expense:</p>
                        <div className="rounded-md border p-4 bg-muted/30">
                            <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Expense Account (Expense) - Subtotal</p>
                            <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Input Tax (Asset) - Tax Amount</p>
                            <p className="text-sm font-mono"><strong>Credit:</strong> Cash/Bank Account (Asset) - Total Amount</p>
                        </div>
                    </div>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Compliance & Audit</h2>
                <p className="leading-7 mb-6">
                    All expense transactions are logged with user identification, timestamp, and supporting reference.
                    Expenses are immutable once posted. Corrections require voiding the original entry and creating a
                    new expense record. Expense reports are subject to audit review and must be supported by valid invoices
                    or receipts.
                </p>

                <PermissionTable
                    resourceName="Expenses"
                    userPerms="View, Create, Update"
                    managerPerms="View, Create, Update, Soft Delete"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
