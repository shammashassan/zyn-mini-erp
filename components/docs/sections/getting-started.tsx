"use client";

import { Kbd } from "@/components/ui/kbd";
import { Separator } from "@/components/ui/separator";

export default function GettingStartedSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">


            <div className="grid gap-8">
                <div className="space-y-4">
                    <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">Overview</h2>
                    <p className="leading-7">
                        ZynERP is an integrated Enterprise Resource Planning (ERP) system designed to centralize
                        and streamline core business processes across inventory management, sales operations,
                        procurement, financial accounting, and human resource management.
                    </p>
                    <p className="leading-7">
                        This system provides real-time visibility into business operations, enforces role-based
                        access controls, maintains comprehensive audit trails, and ensures data integrity across
                        all transactional workflows.
                    </p>
                </div>

                <div className="space-y-4">
                    <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">System Architecture</h2>
                    <p className="leading-7">
                        The Dashboard serves as the primary interface, presenting key performance indicators (KPIs)
                        including revenue metrics, expense summaries, recent transactions, and pending tasks. All
                        operational modules are accessible through the main navigation sidebar.
                    </p>
                </div>

                <div className="space-y-4">
                    <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">Navigation</h2>
                    <p className="leading-7">
                        The system employs a hierarchical navigation structure organized by functional modules.
                        Users can navigate via the sidebar menu or utilize the Command Menu (
                        <Kbd>Cmd</Kbd> + <Kbd>K</Kbd> or <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd>
                        ) for rapid access to specific pages and records.
                    </p>
                </div>

                <div className="space-y-4">
                    <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">Compliance & Audit</h2>
                    <p className="leading-7">
                        All financial transactions are recorded with complete audit trails, including user identification,
                        timestamps, and change history. The system maintains referential integrity between related documents
                        and enforces validation rules to ensure compliance with accounting standards.
                    </p>
                </div>
            </div>
        </div>
    );
}
