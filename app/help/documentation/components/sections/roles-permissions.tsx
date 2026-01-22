"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function RolesPermissionsSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">


            <div className="space-y-8">
                <div className="space-y-4">
                    <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">Overview</h2>
                    <p className="leading-7">
                        ZynERP implements a hierarchical Role-Based Access Control (RBAC) system to enforce the
                        principle of least privilege. Each user is assigned a role that determines their access
                        to system resources, transactional capabilities, and administrative functions.
                    </p>
                    <p className="leading-7">
                        The system defines four primary roles with escalating privileges. Role assignments are
                        immutable for active transactions and can only be modified by users with appropriate
                        administrative authority.
                    </p>
                </div>

                <div className="space-y-4">
                    <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">Role Hierarchy</h2>
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Badge variant="success" appearance="outline">User</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 font-medium">Operational Staff</p>
                            <p className="text-sm text-muted-foreground">
                                Standard operational role with permissions to view and create transactional documents
                                (invoices, quotations, purchase orders). Cannot delete records or access sensitive
                                configuration settings. Suitable for sales personnel, data entry clerks, and operational staff.
                            </p>
                        </div>
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Badge variant="warning" appearance="outline">Manager</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 font-medium">Supervisory Personnel</p>
                            <p className="text-sm text-muted-foreground">
                                Supervisory access with authority to perform soft deletions (records moved to trash),
                                manage document approval workflows, and access operational reports. Responsible for
                                day-to-day operational oversight and team supervision.
                            </p>
                        </div>
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Badge variant="primary" appearance="outline">Admin</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 font-medium">System Administrators</p>
                            <p className="text-sm text-muted-foreground">
                                Comprehensive operational and administrative access. Can manage trash (restore or
                                permanently delete records), configure system settings, manage user accounts (excluding
                                Owner accounts), and access all financial data and reports.
                            </p>
                        </div>
                        <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Badge variant="info" appearance="outline">Owner</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2 font-medium">System Owner</p>
                            <p className="text-sm text-muted-foreground">
                                Unrestricted system access. Possesses all Admin privileges plus the authority to
                                manage Admin-level accounts and modify critical system configurations. This role
                                should be assigned only to authorized business owners or senior executives.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">Security Considerations</h2>
                    <p className="leading-7">
                        Role assignments are logged in the audit trail. Any modification to user roles or permissions
                        requires re-authentication. The system enforces separation of duties by restricting certain
                        operations to specific role combinations.
                    </p>
                </div>
            </div>
        </div>
    );
}
