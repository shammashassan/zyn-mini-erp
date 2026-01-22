"use client";

import { Separator } from "@/components/ui/separator";
import { PermissionTable, Step } from "../shared";

export default function ProductsSection() {
    return (
        <div className="max-w-3xl mx-auto space-y-10">


            <div>
                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4">Overview</h2>
                <p className="leading-7 mb-4">
                    Products represent finished goods or services offered for sale to customers. Each product
                    record maintains critical information including Stock Keeping Unit (SKU), selling price,
                    tax classification, and current inventory levels.
                </p>
                <p className="leading-7 mb-6">
                    Product master data serves as the foundation for sales transactions, inventory valuation,
                    and revenue recognition. Accurate product configuration is essential for financial reporting
                    and operational efficiency.
                </p>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-4 mt-8">Key Attributes</h2>
                <ul className="list-disc list-inside space-y-2 mb-6 text-sm">
                    <li><strong>SKU (Stock Keeping Unit):</strong> Unique identifier for inventory tracking</li>
                    <li><strong>Selling Price:</strong> Default unit price for sales transactions</li>
                    <li><strong>Tax Rate:</strong> Applicable tax percentage for revenue calculation</li>
                    <li><strong>Current Stock:</strong> Real-time inventory quantity (auto-calculated)</li>
                    <li><strong>Reorder Level:</strong> Minimum stock threshold for replenishment alerts</li>
                </ul>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mb-6 mt-10">Creating a Product</h2>
                <div className="ml-2">
                    <Step title="Navigate to Products">
                        Access <strong>Inventory &gt; Products</strong> from the main navigation.
                    </Step>
                    <Step title="Initiate Creation">
                        Click <strong>New Product</strong>. The system will prompt for required fields.
                    </Step>
                    <Step title="Enter Product Details">
                        Specify Product Name, SKU (must be unique), Selling Price, and Tax Rate. Optionally
                        upload a product image for visual identification.
                    </Step>
                    <Step title="Set Inventory Parameters">
                        Configure Reorder Level and Initial Stock Quantity (if applicable). Initial stock
                        should be set via Stock Adjustment for audit trail purposes.
                    </Step>
                    <Step title="Save Product">
                        Click <strong>Save Product</strong> to add to the product master.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Editing a Product</h2>
                <div className="ml-2">
                    <Step title="Locate Product">
                        Search for the product in the Products list using the search or filter functions.
                    </Step>
                    <Step title="Open Editor">
                        Click the product row or select <strong>Edit</strong> from the action menu.
                    </Step>
                    <Step title="Modify & Save">
                        Update necessary fields. Price changes will apply to new transactions only; existing
                        invoices and quotations retain their original pricing.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Deleting a Product</h2>
                <div className="ml-2">
                    <Step title="Select Product">
                        Select the product(s) to remove using checkboxes or the row action menu.
                    </Step>
                    <Step title="Soft Delete">
                        Managers can perform Soft Delete, moving the product to trash. The product is hidden
                        from active lists but retained for historical transaction integrity.
                    </Step>
                    <Step title="Permanent Deletion">
                        Admins can permanently delete products from trash. This action is irreversible and
                        should only be performed if the product has no associated transactions.
                    </Step>
                </div>

                <h2 className="scroll-m-20 border-b pb-2 text-2xl font-semibold tracking-tight mt-10 mb-6">Data Integrity</h2>
                <p className="leading-7 mb-6">
                    Products referenced in historical transactions cannot be permanently deleted. The system
                    enforces referential integrity to preserve audit trails and financial accuracy.
                </p>

                <PermissionTable
                    resourceName="Products"
                    userPerms="View, Create, Update"
                    managerPerms="View, Create, Update, Soft Delete"
                    adminPerms="Full Access (including Permanent Delete & Restore)"
                />
            </div>
        </div>
    );
}
