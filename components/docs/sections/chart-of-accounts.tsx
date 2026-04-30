"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function ChartOfAccountsSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    The Chart of Accounts (COA) defines the complete structure of the general ledger. Each account
                    represents a distinct financial category used to classify and record business transactions.
                    The COA forms the foundation of all financial reporting and analysis.
                </p>
                <p className="leading-7 mb-6">
                    Accounts are organized by type (Asset, Liability, Equity, Income, Expense) and assigned unique
                    account codes. Proper COA configuration is critical for accurate financial statements and
                    regulatory compliance.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Account Types</h2>
                <div className="space-y-3 mb-6">
                    <div className="flex items-start gap-3">
                        <Badge variant="success" appearance="outline">Asset</Badge>
                        <p className="text-sm leading-relaxed">
                            Resources owned by the business (e.g., Cash, Accounts Receivable, Inventory, Equipment).
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <Badge variant="destructive" appearance="outline">Liability</Badge>
                        <p className="text-sm leading-relaxed">
                            Obligations owed to external parties (e.g., Accounts Payable, Loans, Tax Payable).
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <Badge variant="primary" appearance="outline">Equity</Badge>
                        <p className="text-sm leading-relaxed">
                            Owner's stake in the business (e.g., Capital, Retained Earnings, Drawings).
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <Badge variant="success" appearance="outline">Income</Badge>
                        <p className="text-sm leading-relaxed">
                            Revenue from business operations (e.g., Sales Revenue, Service Income, Interest Income).
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <Badge variant="warning" appearance="outline">Expense</Badge>
                        <p className="text-sm leading-relaxed">
                            Costs incurred in operations (e.g., Salaries, Rent, Utilities, Cost of Goods Sold).
                        </p>
                    </div>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Creating an Account</h2>
                <div className="ml-2">
                    <Step title="Navigate to Chart of Accounts">
                        Access <strong>Accounting &gt; Chart of Accounts</strong> from the main menu.
                    </Step>
                    <Step title="Initiate Creation">
                        Click <strong>New Account</strong>. The system will prompt for account details.
                    </Step>
                    <Step title="Configure Account">
                        Enter Account Name (descriptive and unique), Account Code (numeric identifier), and
                        select Account Type (Asset, Liability, Equity, Income, or Expense).
                    </Step>
                    <Step title="Set Status">
                        Accounts are created in <strong>Active</strong> status by default. Inactive accounts
                        are hidden from transaction entry but retained for historical reporting.
                    </Step>
                    <Step title="Save Account">
                        Click <strong>Save</strong> to add the account to the Chart of Accounts.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Account Modification Constraints</h2>
                <p className="leading-7 mb-4">
                    Accounts with posted transactions cannot have their Account Type changed, as this would
                    invalidate historical financial statements. Account codes should remain stable to maintain
                    consistency across reporting periods.
                </p>
                <p className="leading-7 mb-6">
                    To discontinue use of an account, set its status to <strong>Inactive</strong> rather than
                    deleting it. This preserves historical data integrity while preventing future use.
                </p>

                <PermissionTable
                    resourceName="Chart of Accounts"
                    userPerms="None (No Access)"
                    managerPerms="View, Create, Update, Soft Delete, Activate/Deactivate"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
