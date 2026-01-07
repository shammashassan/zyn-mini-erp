// hooks/use-permissions.ts
import { useSession } from "@/lib/auth-client";
import { authClient } from "@/lib/auth-client";
import { useMemo } from "react";

type RoleType = "user" | "admin" | "manager" | "owner";

interface PermissionCheck {
  [resource: string]: string[];
}

export function usePermissions(permissionChecks: Record<string, PermissionCheck>) {
  const { data: session, isPending } = useSession();

  const userRole = session?.user?.role as RoleType | undefined;

  const permissions = useMemo(() => {
    const result: Record<string, boolean> = {};

    for (const [key, permissionCheck] of Object.entries(permissionChecks)) {

      if (!session || !userRole) {
        result[key] = false;
        continue;
      }

      try {
        result[key] = authClient.admin.checkRolePermission({
          role: userRole,
          permissions: permissionCheck,
        });
      } catch (error) {
        console.error("Permission check failed:", error);
        result[key] = false;
      }
    }

    return result;
  }, [userRole, permissionChecks, session]);

  return {
    permissions,
    userRole,
    session,
    isPending,
    isAuthenticated: !!session?.user,
  };
}

// Specific hook for dashboard permissions
export function useDashboardPermissions() {
  return usePermissions({
    canRead: { dashboard: ["read"] },
  });
}

// Specific hook for general billing page access
export function useBillPermissions() {
  return usePermissions({
    canCreate: { bill: ["create"] },
  });
}

// Specific hook for settings permissions
export function useSettingsPermissions() {
  return usePermissions({
    canRead: { settings: ["read"] },
  });
}

// Specific hook for account permissions
export function useAccountPermissions() {
  return usePermissions({
    canRead: { account: ["read"] },
  });
}

// Specific hook for help permissions
export function useHelpPermissions() {
  return usePermissions({
    canRead: { help: ["read"] },
  });
}

// Specific hook for notification permissions
export function useNotificationPermissions() {
  return usePermissions({
    canRead: { notification: ["read"] },
  });
}

// Specific hook for product permissions
export function useProductPermissions() {
  return usePermissions({
    canRead: { product: ["read"] },
    canCreate: { product: ["create"] },
    canUpdate: { product: ["update"] },
    canDelete: { product: ["soft_delete"] },
    canViewTrash: { product: ["view_trash"] },
    canRestore: { product: ["restore"] },
    canPermanentDelete: { product: ["permanent_delete"] },
  });
}

// Specific hook for material permissions
export function useMaterialPermissions() {
  return usePermissions({
    canRead: { material: ["read"] },
    canCreate: { material: ["create"] },
    canUpdate: { material: ["update"] },
    canDelete: { material: ["soft_delete"] },
    canViewTrash: { material: ["view_trash"] },
    canRestore: { material: ["restore"] },
    canPermanentDelete: { material: ["permanent_delete"] },
  });
}

// Specific hook for stock adjustment permissions
export function useStockAdjustmentPermissions() {
  return usePermissions({
    canRead: { stockAdjustment: ["read"] },
    canCreate: { stockAdjustment: ["create"] },
    canDelete: { stockAdjustment: ["soft_delete"] },
    canViewTrash: { stockAdjustment: ["view_trash"] },
    canRestore: { stockAdjustment: ["restore"] },
    canPermanentDelete: { stockAdjustment: ["permanent_delete"] },
  });
}

// Specific hook for customer permissions
export function useCustomerPermissions() {
  return usePermissions({
    canRead: { customer: ["read"] },
    canCreate: { customer: ["create"] },
    canUpdate: { customer: ["update"] },
    canDelete: { customer: ["soft_delete"] },
    canViewTrash: { customer: ["view_trash"] },
    canRestore: { customer: ["restore"] },
    canPermanentDelete: { customer: ["permanent_delete"] },
  });
}

// Specific hook for supplier permissions
export function useSupplierPermissions() {
  return usePermissions({
    canRead: { supplier: ["read"] },
    canCreate: { supplier: ["create"] },
    canUpdate: { supplier: ["update"] },
    canDelete: { supplier: ["soft_delete"] },
    canViewTrash: { supplier: ["view_trash"] },
    canRestore: { supplier: ["restore"] },
    canPermanentDelete: { supplier: ["permanent_delete"] },
  });
}

// Specific hook for payee permissions
export function usePayeePermissions() {
  return usePermissions({
    canRead: { payee: ["read"] },
    canCreate: { payee: ["create"] },
    canUpdate: { payee: ["update"] },
    canDelete: { payee: ["soft_delete"] },
    canViewTrash: { payee: ["view_trash"] },
    canRestore: { payee: ["restore"] },
    canPermanentDelete: { payee: ["permanent_delete"] },
  });
}

// Specific hook for quotation permissions
export function useQuotationPermissions() {
  return usePermissions({
    canRead: { quotation: ["read"] },
    canCreate: { quotation: ["create"] },
    canUpdate: { quotation: ["update"] },
    canUpdateStatus: { quotation: ["update_status"] },
    canDelete: { quotation: ["soft_delete"] },
    canViewTrash: { quotation: ["view_trash"] },
    canRestore: { quotation: ["restore"] },
    canPermanentDelete: { quotation: ["permanent_delete"] },
    canCreateInvoice: { quotation: ["create_invoice"] },
  });
}

// Specific hook for invoice permissions
export function useInvoicePermissions() {
  return usePermissions({
    canRead: { invoice: ["read"] },
    canCreate: { invoice: ["create"] },
    canUpdate: { invoice: ["update"] },
    canUpdateStatus: { invoice: ["update_status"] },
    canDelete: { invoice: ["soft_delete"] },
    canViewTrash: { invoice: ["view_trash"] },
    canRestore: { invoice: ["restore"] },
    canPermanentDelete: { invoice: ["permanent_delete"] },
    canCreateReceipt: { invoice: ["create_receipt"] },
    canCreateDelivery: { invoice: ["create_delivery"] },
  });
}

// Specific hook for voucher permissions
export function useVoucherPermissions() {
  return usePermissions({
    canRead: { voucher: ["read"] },
    canCreate: { voucher: ["create"] },
    canDelete: { voucher: ["soft_delete"] },
    canViewTrash: { voucher: ["view_trash"] },
    canRestore: { voucher: ["restore"] },
    canPermanentDelete: { voucher: ["permanent_delete"] },
  });
}

// Specific hook for delivery notes
export function useDeliveryNotePermissions() {
  return usePermissions({
    canRead: { deliveryNote: ["read"] },
    canCreate: { deliveryNote: ["create"] },
    canUpdate: { deliveryNote: ["update_status"] },
    canDelete: { deliveryNote: ["soft_delete"] },
    canViewTrash: { deliveryNote: ["view_trash"] },
    canRestore: { deliveryNote: ["restore"] },
    canPermanentDelete: { deliveryNote: ["permanent_delete"] },
  });
}

// Specific hook for expense permissions
export function useExpensePermissions() {
  return usePermissions({
    canRead: { expense: ["read"] },
    canCreate: { expense: ["create"] },
    canUpdate: { expense: ["update"] },
    canDelete: { expense: ["soft_delete"] },
    canViewTrash: { expense: ["view_trash"] },
    canRestore: { expense: ["restore"] },
    canPermanentDelete: { expense: ["permanent_delete"] },
  });
}

// Specific hook for purchase permissions
export function usePurchasePermissions() {
  return usePermissions({
    canRead: { purchase: ["read"] },
    canCreate: { purchase: ["create"] },
    canUpdate: { purchase: ["update"] },
    canUpdatePurchaseStatus: { purchase: ["update_purchase_status"] },
    canUpdateInventoryStatus: { purchase: ["update_inventory_status"] },
    canDelete: { purchase: ["soft_delete"] },
    canViewTrash: { purchase: ["view_trash"] },
    canRestore: { purchase: ["restore"] },
    canPermanentDelete: { purchase: ["permanent_delete"] },
    canCreatePayment: { purchase: ["create_payment"] },
  });
}

// Specific hook for return note permissions
export function useReturnNotePermissions() {
  return usePermissions({
    canRead: { returnNote: ["read"] },
    canCreate: { returnNote: ["create"] },
    canUpdate: { returnNote: ["update"] },
    canUpdateStatus: { returnNote: ["update_status"] },
    canDelete: { returnNote: ["soft_delete"] },
    canViewTrash: { returnNote: ["view_trash"] },
    canRestore: { returnNote: ["restore"] },
    canPermanentDelete: { returnNote: ["permanent_delete"] },
  });
}

// Report permissions hook (for all reports)
export function useReportPermissions() {
  return usePermissions({
    canRead: { report: ["read"] },
    canExport: { report: ["export"] },
  });
}

// Chart of Accounts permissions
export function useChartOfAccountsPermissions() {
  return usePermissions({
    canRead: { chartOfAccounts: ["read"] },
    canCreate: { chartOfAccounts: ["create"] },
    canUpdate: { chartOfAccounts: ["update"] },
    canDelete: { chartOfAccounts: ["soft_delete"] },
    canActivate: { chartOfAccounts: ["activate"] },
    canDeactivate: { chartOfAccounts: ["deactivate"] },
    canViewTrash: { chartOfAccounts: ["view_trash"] },
    canRestore: { chartOfAccounts: ["restore"] },
    canPermanentDelete: { chartOfAccounts: ["permanent_delete"] },
  });
}

// Journal permissions
export function useJournalPermissions() {
  return usePermissions({
    canRead: { journal: ["read"] },
    canCreate: { journal: ["create"] },
    canUpdate: { journal: ["update"] },
    canDelete: { journal: ["soft_delete"] },
    canPost: { journal: ["post"] },
    canVoid: { journal: ["void"] },
    canViewTrash: { journal: ["view_trash"] },
    canRestore: { journal: ["restore"] },
    canPermanentDelete: { journal: ["permanent_delete"] },
  });
}

// Ledger permissions (uses COA read + Journal read)
export function useLedgerPermissions() {
  return usePermissions({
    canRead: { ledger: ["read"] },
    canExport: { ledger: ["export"] },
  });
}

// Trial Balance permissions
export function useTrialBalancePermissions() {
  return usePermissions({
    canRead: { trialBalance: ["read"] },
    canExport: { trialBalance: ["export"] },
  });
}

// Profit & Loss permissions
export function useProfitLossPermissions() {
  return usePermissions({
    canRead: { profitLoss: ["read"] },
    canExport: { profitLoss: ["export"] },
  });
}

// Financial Statements permissions
export function useFinancialStatementsPermissions() {
  return usePermissions({
    canRead: { financialStatements: ["read"] },
    canExport: { financialStatements: ["export"] },
  });
}

// Specific hook for employee permissions
export function useEmployeePermissions() {
  return usePermissions({
    canRead: { employee: ["read"] },
    canCreate: { employee: ["create"] },
    canUpdate: { employee: ["update"] },
    canDelete: { employee: ["soft_delete"] },
    canViewTrash: { employee: ["view_trash"] },
    canRestore: { employee: ["restore"] },
    canPermanentDelete: { employee: ["permanent_delete"] },
  });
}

// Specific hook for user management permissions
export function useUserManagementPermissions() {
  return usePermissions({
    canList: { user: ["list"] },
    canCreate: { user: ["create"] },
    canUpdate: { user: ["update"] },
    canDelete: { user: ["delete"] },
    canSetRole: { user: ["set-role"] },
    canBan: { user: ["ban"] },
    canImpersonate: { user: ["impersonate"] },
    canListSessions: { session: ["list"] },
    canRevokeSession: { session: ["revoke"] },
  });
}

// Specific hook for company settings permissions
export function useCompanyDetailsPermissions() {
  return usePermissions({
    canRead: { companyDetails: ["read"] },
    canUpdate: { companyDetails: ["update"] },
  });
}