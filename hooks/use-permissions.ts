// hooks/use-permissions.ts — UPDATED: added attendance + salaryDisbursement hooks
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
      if (!session || !userRole) { result[key] = false; continue; }
      try {
        result[key] = authClient.admin.checkRolePermission({ role: userRole, permissions: permissionCheck });
      } catch (error) {
        result[key] = false;
      }
    }
    return result;
  }, [userRole, permissionChecks, session]);

  return { permissions, userRole, session, isPending, isAuthenticated: !!session?.user };
}

// ── Existing hooks (kept intact) ────────────────────────────────────────────

export function useDashboardPermissions() {
  return usePermissions({ canRead: { dashboard: ["read"] } });
}
export function useBillPermissions() {
  return usePermissions({ canCreate: { bill: ["create"] } });
}
export function usePOSPermissions() {
  return usePermissions({
    canRead: { posSale: ["read"] },
    canCreate: { posSale: ["create"] },
    canDelete: { posSale: ["soft_delete"] },
    canViewTrash: { posSale: ["view_trash"] },
    canRestore: { posSale: ["restore"] },
    canPermanentDelete: { posSale: ["permanent_delete"] },
  });
}
export function useSettingsPermissions() {
  return usePermissions({ canRead: { settings: ["read"] } });
}
export function useAccountPermissions() {
  return usePermissions({ canRead: { account: ["read"] } });
}
export function useHelpPermissions() {
  return usePermissions({ canRead: { help: ["read"] } });
}
export function useNotificationPermissions() {
  return usePermissions({ canRead: { notification: ["read"] } });
}
export function useItemPermissions() {
  return usePermissions({
    canRead: { item: ["read"] },
    canCreate: { item: ["create"] },
    canUpdate: { item: ["update"] },
    canDelete: { item: ["soft_delete"] },
    canViewTrash: { item: ["view_trash"] },
    canRestore: { item: ["restore"] },
    canPermanentDelete: { item: ["permanent_delete"] },
  });
}
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
export function usePartyPermissions() {
  return usePermissions({
    canRead: { party: ["read"] },
    canCreate: { party: ["create"] },
    canUpdate: { party: ["update"] },
    canDelete: { party: ["soft_delete"] },
    canViewTrash: { party: ["view_trash"] },
    canRestore: { party: ["restore"] },
    canPermanentDelete: { party: ["permanent_delete"] },
  });
}
export function useContactPermissions() {
  return usePermissions({
    canRead: { contact: ["read"] },
    canCreate: { contact: ["create"] },
    canUpdate: { contact: ["update"] },
    canDelete: { contact: ["soft_delete"] },
    canViewTrash: { contact: ["view_trash"] },
    canRestore: { contact: ["restore"] },
    canPermanentDelete: { contact: ["permanent_delete"] },
  });
}
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
export function useReportPermissions() {
  return usePermissions({ canRead: { report: ["read"] }, canExport: { report: ["export"] } });
}
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
export function useLedgerPermissions() {
  return usePermissions({ canRead: { ledger: ["read"] }, canExport: { ledger: ["export"] } });
}
export function useTrialBalancePermissions() {
  return usePermissions({ canRead: { trialBalance: ["read"] }, canExport: { trialBalance: ["export"] } });
}
export function useProfitLossPermissions() {
  return usePermissions({ canRead: { profitLoss: ["read"] }, canExport: { profitLoss: ["export"] } });
}
export function useFinancialStatementsPermissions() {
  return usePermissions({ canRead: { financialStatements: ["read"] }, canExport: { financialStatements: ["export"] } });
}
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
export function useCompanyDetailsPermissions() {
  return usePermissions({ canRead: { companyDetails: ["read"] }, canUpdate: { companyDetails: ["update"] } });
}

// ── NEW hooks ────────────────────────────────────────────────────────────────

/** Attendance management */
export function useAttendancePermissions() {
  return usePermissions({
    canRead: { attendance: ["read"] },
    canCreate: { attendance: ["create"] },
    canUpdate: { attendance: ["update"] },
    canDelete: { attendance: ["delete"] },
    canBulkCreate: { attendance: ["bulk_create"] },
  });
}

/** Salary disbursement management */
export function useSalaryDisbursementPermissions() {
  return usePermissions({
    canRead: { salaryDisbursement: ["read"] },
    canCreate: { salaryDisbursement: ["create"] },
    canUpdate: { salaryDisbursement: ["update"] },
    canDelete: { salaryDisbursement: ["delete"] },
    canApprove: { salaryDisbursement: ["approve"] },
  });
}