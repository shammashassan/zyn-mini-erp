"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function PayeesSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Payees represent individuals or entities that receive payments from the business but are not classified
                    as regular suppliers. This category typically includes authorities for tax payments, landlords for rent,
                    utility providers, and employees for expense reimbursements.
                </p>
                <p className="leading-7 mb-6">
                    Maintaining a distinct payee list allows for better categorization of miscellaneous expenses and
                    separates trade payables (Suppliers) from operational overheads in reports.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Managing Payees</h2>
                <div className="ml-2">
                    <Step title="Navigate to Payees">
                        Access <strong>People &gt; Payees</strong> from the main navigation menu.
                    </Step>
                    <Step title="Add Payee">
                        Click <strong>Add Payee</strong>. Enter the payee's name and contact information.
                    </Step>
                    <Step title="Expense Configuration">
                        Optionally assign a <strong>Default Expense Category</strong>. This prompts the system to
                        automatically pre-fill the expense type when recording payments to this payee, streamlining data entry.
                    </Step>
                    <Step title="Edit or Delete">
                        Payees can be edited to update contact details. Soft deletion is available to remove inactive
                        payees from selection lists without affecting historical transaction records.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Usage in Transactions</h2>
                <p className="leading-7 mb-6">
                    Payees are primarily selected during the creation of <strong>Expenses</strong> and <strong>Payments</strong>.
                    They do not appear in Purchase Orders or Goods Received Notes, as those modules are restricted to
                    Supplier interactions.
                </p>

                <PermissionTable
                    resourceName="Payees"
                    userPerms="View, Create, Update"
                    managerPerms="View, Create, Update, Soft Delete"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
