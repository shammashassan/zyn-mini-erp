"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function FinancialStatementsSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Financial Statements are the formal records of the financial activities and position of the business.
                    These reports are standard outputs for external stakeholders (investors, tax authorities, banks)
                    and internal management.
                </p>
                <p className="leading-7 mb-6">
                    The system automatically compiles these statements based on the underlying Chart of Accounts and
                    posted journal entries.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Statement Types</h2>
                <div className="space-y-4 mb-6">
                    <div>
                        <p className="font-semibold mb-1">Profit & Loss (Income Statement)</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            Summarizes revenues, costs, and expenses incurred during a specific period.
                            Shows the Net Profit or Loss.
                        </p>
                    </div>
                    <div>
                        <p className="font-semibold mb-1">Balance Sheet</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            A snapshot of the company's financial position at a specific point in time.
                            Details Assets, Liabilities, and Equity (Assets = Liabilities + Equity).
                        </p>
                    </div>
                    <div>
                        <p className="font-semibold mb-1">Trial Balance</p>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            A list of all general ledger accounts and their balances (Debit vs Credit).
                            primarily used for internal auditing to ensure the books are balanced.
                        </p>
                    </div>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Analysis and Export</h2>
                <div className="ml-2">
                    <Step title="Navigate">
                        Go to <strong>Accounting &gt; Financial Statements</strong>.
                    </Step>
                    <Step title="Select Statement">
                        Choose between Profit & Loss, Balance Sheet, or Trial Balance.
                    </Step>
                    <Step title="Set Period">
                        Define the fiscal period (e.g., Fiscal Year 2024, Q1 2025). The Balance Sheet is typically
                        run "As of" a specific date.
                    </Step>
                    <Step title="Export">
                        Generate PDF for formal presentation or Excel for detailed financial modeling.
                    </Step>
                </div>

                <PermissionTable
                    resourceName="Financial Statements"
                    userPerms="None (Access Denied)"
                    managerPerms="Read, Export"
                    adminPerms="Full Access"
                />
            </div>
        </div>
    );
}
