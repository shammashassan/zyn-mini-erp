"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function CustomersSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">


            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Customers represent individuals or organizations that purchase goods or services from your business.
                    Customer master data is essential for sales transactions, accounts receivable tracking, credit management,
                    and revenue reporting.
                </p>
                <p className="leading-7 mb-6">
                    Each customer record maintains contact information, billing addresses, payment terms, credit limits,
                    and transaction history. Accurate customer data ensures proper revenue recognition and facilitates
                    effective customer relationship management.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Key Attributes</h2>
                <ul className="list-disc list-inside space-y-2 mb-6 text-sm">
                    <li><strong>Customer Name:</strong> Legal or trading name of the customer</li>
                    <li><strong>Contact Information:</strong> Email, phone number, and primary contact person</li>
                    <li><strong>Billing Address:</strong> Invoice delivery and correspondence address</li>
                    <li><strong>Payment Terms:</strong> Credit period (e.g., Net 30, Net 60) and payment methods</li>
                    <li><strong>Credit Limit:</strong> Maximum outstanding receivables allowed (optional)</li>
                    <li><strong>Tax Registration:</strong> VAT/GST number for tax compliance (if applicable)</li>
                </ul>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Managing Customers</h2>
                <div className="ml-2">
                    <Step title="Navigate to Customers">
                        Access <strong>People &gt; Customers</strong> from the main navigation menu.
                    </Step>
                    <Step title="Create Customer">
                        Click <strong>Add Customer</strong>. Enter customer name, contact details, billing address,
                        and payment terms. Credit limit is optional but recommended for credit control.
                    </Step>
                    <Step title="Edit Customer">
                        Select a customer from the list and click <strong>Edit</strong> to update their profile.
                        Changes to contact information do not affect historical transactions.
                    </Step>
                    <Step title="Soft Delete">
                        Managers can soft delete customers to hide them from active lists. Deleted customers are
                        retained for audit purposes and can be restored by admins.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Accounts Receivable Integration</h2>
                <p className="leading-7 mb-6">
                    Customer records are linked to sales invoices and receipt vouchers. The system automatically tracks
                    outstanding balances, payment history, and aging reports. Credit limit warnings are displayed during
                    invoice creation if the customer's receivables exceed their configured limit.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Data Integrity</h2>
                <p className="leading-7 mb-6">
                    Customers referenced in invoices, or delivery notes cannot be permanently deleted.
                    The system enforces referential integrity to preserve transaction history and audit trails.
                </p>

                <PermissionTable
                    resourceName="Customers"
                    userPerms="View, Create, Update"
                    managerPerms="View, Create, Update, Soft Delete"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
