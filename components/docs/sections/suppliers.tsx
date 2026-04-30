"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function SuppliersSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">


            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Suppliers represent vendors, manufacturers, or service providers from whom your business purchases
                    materials, products, or services. Supplier master data is critical for procurement, accounts payable
                    management, and cost control.
                </p>
                <p className="leading-7 mb-6">
                    Each supplier record maintains contact information, payment terms, tax registration details, and
                    transaction history. Accurate supplier data ensures timely payments, proper expense tracking, and
                    effective vendor relationship management.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Key Attributes</h2>
                <ul className="list-disc list-inside space-y-2 mb-6 text-sm">
                    <li><strong>Supplier Name:</strong> Legal or trading name of the vendor</li>
                    <li><strong>Contact Information:</strong> Email, phone number, and primary contact person</li>
                    <li><strong>Address:</strong> Physical or correspondence address for purchase orders</li>
                    <li><strong>Payment Terms:</strong> Standard payment period (e.g., Net 30, Net 60)</li>
                    <li><strong>Tax Registration:</strong> VAT/GST number for input tax credit claims</li>
                    <li><strong>Bank Details:</strong> Account information for electronic payments (optional)</li>
                </ul>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Managing Suppliers</h2>
                <div className="ml-2">
                    <Step title="Navigate to Suppliers">
                        Access <strong>People &gt; Suppliers</strong> from the main navigation menu.
                    </Step>
                    <Step title="Create Supplier">
                        Click <strong>New Supplier</strong>. Enter supplier name, contact details, address, and
                        payment terms. Tax registration is required for VAT/GST compliance.
                    </Step>
                    <Step title="Edit Supplier">
                        Select a supplier from the list and click <strong>Edit</strong> to update their profile.
                        Changes do not affect historical purchase orders.
                    </Step>
                    <Step title="Soft Delete">
                        Managers can soft delete suppliers to hide them from active lists. Deleted suppliers are
                        retained for audit purposes and can be restored by admins.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Accounts Payable Integration</h2>
                <p className="leading-7 mb-6">
                    Supplier records are linked to purchase orders and payment vouchers. The system automatically tracks
                    outstanding payables, payment history, and aging reports. This integration ensures accurate expense
                    recognition and facilitates vendor payment scheduling.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Data Integrity</h2>
                <p className="leading-7 mb-6">
                    Suppliers referenced in purchase orders, payment vouchers, or expenses cannot be permanently deleted.
                    The system enforces referential integrity to preserve transaction history and audit trails.
                </p>

                <PermissionTable
                    resourceName="Suppliers"
                    userPerms="View, Create, Update"
                    managerPerms="View, Create, Update, Soft Delete"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
