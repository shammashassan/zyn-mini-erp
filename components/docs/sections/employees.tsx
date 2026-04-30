"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function EmployeesSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">

            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    The Employees module serves as the central repository for all staff-related information.
                    It maintains personal details, employment contracts, role assignments, and compensation data
                    necessary for payroll processing and workforce management.
                </p>
                <p className="leading-7 mb-6">
                    Secure management of employee data is critical for privacy compliance and effective organizational hierarchy definitions.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Key Attributes</h2>
                <ul className="list-disc list-inside space-y-2 mb-6 text-sm">
                    <li><strong>Personal Info:</strong> Full name, contact details, and emergency contacts</li>
                    <li><strong>Role & Department:</strong> Job title, department assignment, and reporting lines</li>
                    <li><strong>Compensation:</strong> Salary structure (Base, Allowances) and payment details (Bank Info) - <em>Restricted Access</em></li>
                    <li><strong>Status:</strong> Active, On Leave, or Terminated</li>
                </ul>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Employee Management</h2>
                <div className="ml-2">
                    <Step title="Navigate">
                        Access <strong>HRM &gt; Employees</strong>.
                    </Step>
                    <Step title="Onboard New Staff">
                        Click <strong>Add Employee</strong>. Complete the profile forms. Ensure mandatory fields like
                        National ID/Passport and Join Date are accurate.
                    </Step>
                    <Step title="Update Records">
                        Edit employee profiles to reflect promotions, salary adjustments, or contact changes.
                        Historical records are preserved.
                    </Step>
                    <Step title="Offboarding">
                        When an employee leaves, set their status to <strong>Terminated</strong> rather than deleting the record.
                        This ensures historical payroll and activity logs remain intact for audit purposes.
                    </Step>
                </div>

                <PermissionTable
                    resourceName="Employees"
                    userPerms="None (Access Denied)"
                    managerPerms="View, Create, Update, Soft Delete"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
