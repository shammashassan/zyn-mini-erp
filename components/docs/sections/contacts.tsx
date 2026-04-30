"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function ContactsSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">
            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Contacts represent specific individuals associated with a Party. While a Party is often a company or organization,
                    Contacts are the people you communicate with—procurement managers, accounts payable clerks, sales representatives, etc.
                </p>
                <p className="leading-7 mb-6">
                    A single Party can have multiple Contacts. One contact can be designated as the Primary Contact for automatic communication.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Key Attributes</h2>
                <ul className="list-disc list-inside space-y-2 mb-6 text-sm">
                    <li><strong>Name:</strong> Full name of the individual.</li>
                    <li><strong>Designation:</strong> Job title or role (e.g., "Purchasing Manager").</li>
                    <li><strong>Email:</strong> Direct email address.</li>
                    <li><strong>Phone:</strong> Direct phone/mobile number.</li>
                    <li><strong>Primary Status:</strong> Flag indicating the main point of contact.</li>
                </ul>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Managing Contacts</h2>
                <div className="ml-2">
                    <Step title="Navigate to Contacts">
                        Access <strong>People &gt; Contacts</strong> to see a master list of all contacts, or view them
                        under a specific Party's "Contacts" tab.
                    </Step>
                    <Step title="Add Contact">
                        From a Party's profile, click <strong>Add Contact</strong>. Enter their personal details and role within the organization.
                    </Step>
                    <Step title="Primary Contact">
                        Marking a contact as "Primary" ensures their email and phone are auto-filled on documents (Invoices, POs) issued to that Party.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Integration</h2>
                <p className="leading-7 mb-6">
                    When creating documents like Invoices or Purchase Orders, you can select the specific Contact person addressed.
                    This personalizes communication and ensures documents reach the right desk.
                </p>

                <PermissionTable
                    resourceName="Contacts"
                    userPerms="View, Create, Update"
                    managerPerms="View, Create, Update, Soft Delete"
                    adminPerms="Full Access"
                />
            </div>
        </div>
    );
}
