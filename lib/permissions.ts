// lib/permissions.ts
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

/**
 * Define all resources and their available actions
 * Use as const for proper TypeScript inference
 */
export const statement = {
  ...defaultStatements, // Includes default 'user' and 'session' resources

  // General
  dashboard: ["read"],
  bill: ["create"],
  settings: ["read"],
  account: ["read"],
  help: ["read"],
  notification: ["read"],

  // Inventory Resources
  product: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  material: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  stockAdjustment: ["read", "create", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // People Resources
  customer: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  supplier: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  payee: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // Documents Resources
  quotation: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_invoice"],
  invoice: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_receipt", "create_delivery"],
  voucher: ["read", "create", "soft_delete", "view_trash", "restore", "permanent_delete"],
  deliveryNote: ["read", "create", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // Financial Resources
  purchase: ["read", "create", "update", "update_purchase_status", "update_inventory_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_payment"],
  expense: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // Reports Resources
  report: ["read", "export"],

  // Accounting Resources
  chartOfAccounts: ["read", "create", "update", "soft_delete", "activate", "deactivate", "view_trash", "restore", "permanent_delete"],
  journal: ["read", "create", "update", "soft_delete", "post", "void", "view_trash", "restore", "permanent_delete"],
  ledger: ["read", "export"],
  trialBalance: ["read", "export"],
  profitLoss: ["read", "export"],
  financialStatements: ["read", "export"],

  // HRM Resources
  employee: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // Settings Resources
  companyDetails: ["read", "update"],
} as const;

// Create the access controller
export const ac = createAccessControl(statement);

/**
 * User Role - Basic access
 * Can view and create most content, limited management capabilities
 */
export const user = ac.newRole({
  // General
  dashboard: ["read"],
  bill: ["create"],
  settings: ["read"],
  account: ["read"],
  help: ["read"],
  notification: ["read"],

  // Inventory - View, create, update only
  product: ["read", "create", "update"],
  material: ["read", "create", "update"],
  stockAdjustment: ["read", "create"],

  // People - View, create, update only
  customer: ["read", "create", "update"],
  supplier: ["read", "create", "update"],
  payee: ["read", "create", "update"],

  // Documents - View, create, update only
  quotation: ["read", "create", "update", "update_status", "create_invoice"],
  invoice: ["read", "create", "update", "update_status", "create_receipt", "create_delivery"],
  voucher: ["read", "create"],
  deliveryNote: ["read", "create", "update_status"],

  // Financial - View, create, update only
  purchase: ["read", "create", "update", "update_inventory_status", "update_purchase_status"],
  expense: ["read", "create", "update"],

  // No report access

  // No accounting access

  // No HRM access

  // No User Management access - users can only view their own profile

  // No settings access
});

/**
 * Manager Role - Supervisory access
 * Can soft delete and manage statuses, view reports
 */
export const manager = ac.newRole({
  // General
  dashboard: ["read"],
  bill: ["create"],
  settings: ["read"],
  account: ["read"],
  help: ["read"],
  notification: ["read"],

  // Inventory - Add soft delete
  product: ["read", "create", "update", "soft_delete"],
  material: ["read", "create", "update", "soft_delete"],
  stockAdjustment: ["read", "create", "soft_delete"],

  // People - Add soft delete
  customer: ["read", "create", "update", "soft_delete"],
  supplier: ["read", "create", "update", "soft_delete"],
  payee: ["read", "create", "update", "soft_delete"],

  // Documents - Add soft delete, status updates, and create connected docs
  quotation: ["read", "create", "update", "update_status", "soft_delete", "create_invoice"],
  invoice: ["read", "create", "update", "update_status", "soft_delete", "create_receipt", "create_delivery"],
  voucher: ["read", "create", "soft_delete"],
  deliveryNote: ["read", "create", "update_status", "soft_delete"],

  // Financial - Add soft delete and payment creation
  purchase: ["read", "create", "update", "update_inventory_status", "update_purchase_status", "soft_delete", "create_payment"],
  expense: ["read", "create", "update", "soft_delete"],

  // Reports - Full report access
  report: ["read", "export"],

  // Accounting - Full access except trash management
  chartOfAccounts: ["read", "create", "update", "soft_delete", "activate", "deactivate"],
  journal: ["read", "create", "update", "soft_delete", "post", "void"],
  ledger: ["read", "export"],
  trialBalance: ["read", "export"],
  profitLoss: ["read", "export"],
  financialStatements: ["read", "export"],

  // HRM - Full access except trash management
  employee: ["read", "create", "update", "soft_delete"],

  // User Management - Can only list users (read-only)
  user: ["list"],
});

/**
 * Admin Role - Full operational access
 * Can manage trash, limited user role management (user and manager only)
 */
export const admin = ac.newRole({
  // General
  dashboard: ["read"],
  bill: ["create"],
  settings: ["read"],
  account: ["read"],
  help: ["read"],
  notification: ["read"],

  // Inventory - Full access
  product: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  material: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  stockAdjustment: ["read", "create", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // People - Full access
  customer: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  supplier: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  payee: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // Documents - Full access
  quotation: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_invoice"],
  invoice: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_receipt", "create_delivery"],
  voucher: ["read", "create", "soft_delete", "view_trash", "restore", "permanent_delete"],
  deliveryNote: ["read", "create", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // Financial - Full access
  purchase: ["read", "create", "update", "update_inventory_status", "update_purchase_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_payment"],
  expense: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // Reports - Full access
  report: ["read", "export"],

  // Accounting - Full access
  chartOfAccounts: ["read", "create", "update", "soft_delete", "activate", "deactivate", "view_trash", "restore", "permanent_delete"],
  journal: ["read", "create", "update", "soft_delete", "post", "void", "view_trash", "restore", "permanent_delete"],
  ledger: ["read", "export"],
  trialBalance: ["read", "export"],
  profitLoss: ["read", "export"],
  financialStatements: ["read", "export"],

  // HRM - Full access
  employee: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // User Management - Can manage user and manager roles only (not owner)
  user: ["list", "create", "update", "delete", "set-role", "ban", "impersonate", "set-password"],

  // Settings - Full access
  companyDetails: ["read", "update"],
});

/**
 * Owner Role - Complete system access
 * Can manage all users including admins, full system control
 */
export const owner = ac.newRole({
  ...adminAc.statements, // Include all default admin permissions

  // General
  dashboard: ["read"],
  bill: ["create"],
  settings: ["read"],
  account: ["read"],
  help: ["read"],
  notification: ["read"],

  // Inventory - Full access
  product: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  material: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  stockAdjustment: ["read", "create", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // People - Full access
  customer: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  supplier: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  payee: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // Documents - Full access
  quotation: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_invoice"],
  invoice: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_receipt", "create_delivery"],
  voucher: ["read", "create", "soft_delete", "view_trash", "restore", "permanent_delete"],
  deliveryNote: ["read", "create", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // Financial - Full access
  purchase: ["read", "create", "update", "update_inventory_status", "update_purchase_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_payment"],
  expense: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // Reports - Full access
  report: ["read", "export"],

  // Accounting - Full access
  chartOfAccounts: ["read", "create", "update", "soft_delete", "activate", "deactivate", "view_trash", "restore", "permanent_delete"],
  journal: ["read", "create", "update", "soft_delete", "post", "void", "view_trash", "restore", "permanent_delete"],
  ledger: ["read", "export"],
  trialBalance: ["read", "export"],
  profitLoss: ["read", "export"],
  financialStatements: ["read", "export"],

  // HRM - Full access
  employee: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // User Management - Complete access to all roles
  user: ["list", "create", "update", "delete", "set-role", "ban", "impersonate", "set-password"],
  session: ["list", "revoke", "delete"],

  // Settings - Full access
  companyDetails: ["read", "update"],
});

// Export all roles
export const roles = {
  user,
  manager,
  admin,
  owner
} as const;

// Type helper for role names
export type RoleName = keyof typeof roles;