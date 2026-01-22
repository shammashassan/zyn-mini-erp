"use client";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function UserManagementSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    User Management controls system access and enforces the Role-Based Access Control (RBAC) policy.
                    It allows Administrators to invite new users, assign appropriate roles (permissions), and revoke
                    access when necessary.
                </p>
                <p className="leading-7 mb-6">
                    This module is the first line of defense in maintaining system security and data integrity.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Roles & Responsibilities</h2>
                <div className="space-y-3 mb-6">

                    <div className="flex items-start gap-3">
                        <Badge variant="info" appearance="outline">Owner</Badge>
                        <p className="text-sm leading-relaxed">
                            The Owner is the creator of the account and has full access to all features and data.
                            Can manage all data, configuration, and other users including admins.
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <Badge variant="primary" appearance="outline">Admin</Badge>
                        <p className="text-sm leading-relaxed">
                            Complete system control. Can manage all data, configuration, and other users.
                            Only Admins can permanently delete records.
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <Badge variant="warning" appearance="outline">Manager</Badge>
                        <p className="text-sm leading-relaxed">
                            Operational oversight. Can view, create, and edit most records. Can "soft delete" items
                            but cannot permanently destroy data or manage system configuration.
                        </p>
                    </div>
                    <div className="flex items-start gap-3">
                        <Badge variant="success" appearance="outline">User</Badge>
                        <p className="text-sm leading-relaxed">
                            Standard operational access. Can view and create specific records. Restricted from
                            deleting data or accessing sensitive reports.
                        </p>
                    </div>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Access Administration</h2>
                <div className="ml-2">
                    <Step title="Invite Users">
                        Go to <strong>HRM &gt; User Management</strong> and click <strong>Invite User</strong>.
                        Enter their email address and select the appropriate Role. An invitation email will be sent.
                    </Step>
                    <Step title="Modify Roles">
                        Admins can upgrade or downgrade a user's role at any time. Changes take effect on the
                        user's next login or session refresh.
                    </Step>
                    <Step title="Revoke Access (Ban)">
                        To immediately prevent a user from logging in, toggle the <strong>Ban Status</strong> to Active.
                        This is preferred over deletion for preserving audit trails linked to that user.
                    </Step>
                    <Step title="Delete User">
                        Permanent deletion removes the user account entirely. This should only be done for erroneous
                        accounts that have no associated transaction history.
                    </Step>
                </div>

                <PermissionTable
                    resourceName="Users"
                    userPerms="No Access (except viewing own profile)"
                    managerPerms="List Only"
                    adminPerms="Full Access (Invite, Update Role, Ban, Delete)"
                />
            </div>
        </div>
    );
}
