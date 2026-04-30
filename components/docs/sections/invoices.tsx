"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function InvoicesSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">


            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Sales Invoices are primary financial documents that establish a legal obligation for customers
                    to remit payment for goods or services delivered. Each invoice creates an accounts receivable
                    entry and triggers revenue recognition in accordance with the accrual accounting method.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Accounting Impact</h2>
                <p className="leading-7 mb-4">
                    Upon approval, the system generates the following double-entry accounting transactions:
                </p>
                <div className="rounded-md border p-4 bg-muted/30 mb-6">
                    <p className="text-sm font-mono mb-2"><strong>Debit:</strong> Accounts Receivable (Asset) - Invoice Total</p>
                    <p className="text-sm font-mono mb-2"><strong>Credit:</strong> Sales Revenue (Income) - Subtotal</p>
                    <p className="text-sm font-mono"><strong>Credit:</strong> Tax Payable (Liability) - Tax Amount</p>
                </div>
                <p className="leading-7 mb-6">
                    These entries are immutable once posted. Any corrections must be made via Credit Notes or
                    Sales Returns, which create offsetting journal entries.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Inventory Impact</h2>
                <p className="leading-7 mb-6">
                    Invoices do not directly affect inventory levels. Inventory deduction occurs when a Delivery
                    Note is created and marked as dispatched. This separation allows for scenarios where invoicing
                    and delivery occur at different times.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Creating an Invoice</h2>
                <div className="ml-2">
                    <Step title="Navigate to Invoices">
                        Access <strong>Sales &gt; Invoices</strong> from the main navigation menu.
                    </Step>
                    <Step title="Initiate Creation">
                        Click <strong>New Invoice</strong>. The system will auto-generate a sequential invoice number.
                    </Step>
                    <Step title="Select Customer">
                        Choose the customer from the dropdown. Customer billing information will auto-populate.
                    </Step>
                    <Step title="Set Dates">
                        Specify Invoice Date (defaults to today) and Due Date. Payment terms are calculated automatically
                        based on customer configuration.
                    </Step>
                    <Step title="Add Line Items">
                        Add products or services. Unit prices and tax rates are retrieved from the product master.
                        Subtotal, tax, and total are calculated automatically.
                    </Step>
                    <Step title="Review & Save">
                        Verify all details. Click <strong>Save as Draft</strong> to preserve without posting, or
                        <strong>Save & Approve</strong> to post accounting entries immediately.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Editing an Invoice</h2>
                <div className="ml-2">
                    <Step title="Verify Status">
                        Only invoices in <strong>Draft</strong> status or approved invoices with no associated payments
                        can be edited. Invoices with allocated receipts cannot be modified.
                    </Step>
                    <Step title="Open Invoice">
                        Click the invoice row or select <strong>Edit</strong> from the action menu.
                    </Step>
                    <Step title="Modify & Save">
                        Make necessary changes. If invoice was previously approved, it will be reverted to Draft status
                        and accounting entries will be reversed. Re-approval is required.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Compliance & Audit</h2>
                <p className="leading-7 mb-6">
                    All invoice transactions are recorded in the audit log with user identification, timestamp, and
                    change details. Invoice numbers are sequential and cannot be reused. Deleted invoices are retained
                    in the system with a "Voided" status for audit trail purposes.
                </p>

                <PermissionTable
                    resourceName="Invoices"
                    userPerms="View, Create, Update (Draft only), Update Status, Create Receipt Voucher, Create Delivery Note"
                    managerPerms="All User permissions + Soft Delete"
                    adminPerms="Full Access (including Permanent Delete & Restore from Trash)"
                />
            </div>
        </div>
    );
}
