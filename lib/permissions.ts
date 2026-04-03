// lib/permissions.ts - UPDATED: item replaces product and material
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

export const statement = {
  ...defaultStatements,

  // General
  dashboard: ["read"],
  bill: ["create"],
  settings: ["read"],
  account: ["read"],
  help: ["read"],
  notification: ["read"],

  // Inventory — unified "item" resource (replaces product + material)
  item: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  stockAdjustment: ["read", "create", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // People
  party: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  contact: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  payee: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // Documents
  quotation: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_invoice"],
  invoice: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_receipt", "create_delivery"],
  voucher: ["read", "create", "soft_delete", "view_trash", "restore", "permanent_delete"],
  debitNote: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_receipt"],
  creditNote: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_payment"],
  deliveryNote: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // Financial
  purchase: ["read", "create", "update", "update_purchase_status", "update_inventory_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_payment"],
  expense: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  returnNote: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // Reports
  report: ["read", "export"],

  // Accounting
  chartOfAccounts: ["read", "create", "update", "soft_delete", "activate", "deactivate", "view_trash", "restore", "permanent_delete"],
  journal: ["read", "create", "update", "soft_delete", "post", "void", "view_trash", "restore", "permanent_delete"],
  ledger: ["read", "export"],
  trialBalance: ["read", "export"],
  profitLoss: ["read", "export"],
  financialStatements: ["read", "export"],

  // HRM
  employee: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],

  // Settings
  companyDetails: ["read", "update"],
} as const;

export const ac = createAccessControl(statement);

export const user = ac.newRole({
  dashboard: ["read"],
  bill: ["create"],
  settings: ["read"],
  account: ["read"],
  help: ["read"],
  notification: ["read"],

  item: ["read", "create", "update"],
  stockAdjustment: ["read", "create"],

  party: ["read", "create", "update"],
  contact: ["read", "create", "update"],
  payee: ["read", "create", "update"],

  quotation: ["read", "create", "update", "update_status", "create_invoice"],
  invoice: ["read", "create", "update", "update_status", "create_receipt", "create_delivery"],
  voucher: ["read", "create"],
  debitNote: ["read", "create", "update"],
  creditNote: ["read", "create", "update"],
  deliveryNote: ["read", "create", "update", "update_status"],

  purchase: ["read", "create", "update", "update_inventory_status", "update_purchase_status"],
  expense: ["read", "create", "update"],
  returnNote: ["read", "create", "update"],
});

export const manager = ac.newRole({
  dashboard: ["read"],
  bill: ["create"],
  settings: ["read"],
  account: ["read"],
  help: ["read"],
  notification: ["read"],

  item: ["read", "create", "update", "soft_delete"],
  stockAdjustment: ["read", "create", "soft_delete"],

  party: ["read", "create", "update", "soft_delete"],
  contact: ["read", "create", "update", "soft_delete"],
  payee: ["read", "create", "update", "soft_delete"],

  quotation: ["read", "create", "update", "update_status", "soft_delete", "create_invoice"],
  invoice: ["read", "create", "update", "update_status", "soft_delete", "create_receipt", "create_delivery"],
  voucher: ["read", "create", "soft_delete"],
  debitNote: ["read", "create", "update", "update_status", "soft_delete", "create_receipt"],
  creditNote: ["read", "create", "update", "update_status", "soft_delete", "create_payment"],
  deliveryNote: ["read", "create", "update", "update_status", "soft_delete"],

  purchase: ["read", "create", "update", "update_inventory_status", "update_purchase_status", "soft_delete", "create_payment"],
  expense: ["read", "create", "update", "soft_delete"],
  returnNote: ["read", "create", "update", "update_status", "soft_delete"],

  report: ["read", "export"],

  chartOfAccounts: ["read", "create", "update", "soft_delete", "activate", "deactivate"],
  journal: ["read", "create", "update", "soft_delete", "post", "void"],
  ledger: ["read", "export"],
  trialBalance: ["read", "export"],
  profitLoss: ["read", "export"],
  financialStatements: ["read", "export"],

  employee: ["read", "create", "update", "soft_delete"],
  user: ["list"],
});

export const admin = ac.newRole({
  dashboard: ["read"],
  bill: ["create"],
  settings: ["read"],
  account: ["read"],
  help: ["read"],
  notification: ["read"],

  item: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  stockAdjustment: ["read", "create", "soft_delete", "view_trash", "restore", "permanent_delete"],

  party: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  contact: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  payee: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],

  quotation: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_invoice"],
  invoice: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_receipt", "create_delivery"],
  voucher: ["read", "create", "soft_delete", "view_trash", "restore", "permanent_delete"],
  debitNote: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_receipt"],
  creditNote: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_payment"],
  deliveryNote: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete"],

  purchase: ["read", "create", "update", "update_inventory_status", "update_purchase_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_payment"],
  expense: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  returnNote: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete"],

  report: ["read", "export"],

  chartOfAccounts: ["read", "create", "update", "soft_delete", "activate", "deactivate", "view_trash", "restore", "permanent_delete"],
  journal: ["read", "create", "update", "soft_delete", "post", "void", "view_trash", "restore", "permanent_delete"],
  ledger: ["read", "export"],
  trialBalance: ["read", "export"],
  profitLoss: ["read", "export"],
  financialStatements: ["read", "export"],

  employee: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  user: ["list", "create", "update", "delete", "set-role", "ban", "impersonate", "set-password"],
  companyDetails: ["read", "update"],
});

export const owner = ac.newRole({
  ...adminAc.statements,

  dashboard: ["read"],
  bill: ["create"],
  settings: ["read"],
  account: ["read"],
  help: ["read"],
  notification: ["read"],

  item: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  stockAdjustment: ["read", "create", "soft_delete", "view_trash", "restore", "permanent_delete"],

  party: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  contact: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  payee: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],

  quotation: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_invoice"],
  invoice: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_receipt", "create_delivery"],
  voucher: ["read", "create", "soft_delete", "view_trash", "restore", "permanent_delete"],
  debitNote: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_receipt"],
  creditNote: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_payment"],
  deliveryNote: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete"],

  purchase: ["read", "create", "update", "update_inventory_status", "update_purchase_status", "soft_delete", "view_trash", "restore", "permanent_delete", "create_payment"],
  expense: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  returnNote: ["read", "create", "update", "update_status", "soft_delete", "view_trash", "restore", "permanent_delete"],

  report: ["read", "export"],

  chartOfAccounts: ["read", "create", "update", "soft_delete", "activate", "deactivate", "view_trash", "restore", "permanent_delete"],
  journal: ["read", "create", "update", "soft_delete", "post", "void", "view_trash", "restore", "permanent_delete"],
  ledger: ["read", "export"],
  trialBalance: ["read", "export"],
  profitLoss: ["read", "export"],
  financialStatements: ["read", "export"],

  employee: ["read", "create", "update", "soft_delete", "view_trash", "restore", "permanent_delete"],
  user: ["list", "create", "update", "delete", "set-role", "ban", "impersonate", "set-password"],
  session: ["list", "revoke", "delete"],
  companyDetails: ["read", "update"],
});

export const roles = { user, manager, admin, owner } as const;
export type RoleName = keyof typeof roles;