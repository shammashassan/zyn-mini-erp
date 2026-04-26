"use client";

import * as React from "react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Loader2,
} from "lucide-react";
import {
  Item,
  ItemContent,
  ItemActions,
  ItemGroup,
  ItemTitle,
  ItemDescription,
} from "@/components/ui/item";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate } from "@/utils/formatters/date";
import { toast } from "sonner";
import { useSalaryDisbursementPermissions } from "@/hooks/use-permissions";
import type { IEmployee } from "@/models/Employee";
import { DisbursementForm } from "./disbursement-form";
import { Skeleton } from "@/components/ui/skeleton";

interface Disbursement {
  _id: string;
  periodStart: string;
  periodEnd: string;
  paymentFrequency: string;
  baseSalary: number;
  workingDays: number;
  presentDays: number;
  calculatedAmount: number;
  finalAmount: number;
  notes?: string;
  createdAt: string;
  expenseId?: {
    _id: string;
    referenceNumber: string;
    status: string;
    paymentStatus: string;
    amount: number;
  };
}

export function SalaryTab({ employee }: { employee: IEmployee }) {
  const { permissions } = useSalaryDisbursementPermissions();
  const [disbursements, setDisbursements] = React.useState<Disbursement[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [processing, setProcessing] = React.useState<string | null>(null);

  const employeeId = (employee._id as any).toString();

  const fetchDisbursements = React.useCallback(async () => {
    if (!permissions.canRead) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/salary-disbursements?employeeId=${employeeId}&pageSize=50`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDisbursements(data.data || []);
    } catch {
      toast.error("Could not load salary history");
    } finally {
      setLoading(false);
    }
  }, [employeeId, permissions.canRead]);

  React.useEffect(() => {
    fetchDisbursements();
  }, [fetchDisbursements]);

  const handleDelete = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/salary-disbursements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Disbursement deleted");
      await fetchDisbursements();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    } finally {
      setProcessing(null);
    }
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch(`/api/salary-disbursements/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Salary disbursement approved");
      await fetchDisbursements();
    } catch (e: any) {
      toast.error(e.message || "Approval failed");
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "approved":
        return <Badge variant="success" appearance="outline" className="gap-1"><CheckCircle2 className="size-3" /> Approved</Badge>;
      case "cancelled":
        return <Badge variant="destructive" appearance="outline" className="gap-1"><AlertCircle className="size-3" /> Cancelled</Badge>;
      default:
        return <Badge variant="warning" appearance="outline" className="gap-1"><Clock className="size-3" /> Pending</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Salary History</h3>
          <p className="text-sm text-muted-foreground">Manage and approve disbursement records.</p>
        </div>
        {permissions.canCreate && (
          <Button size="sm" className="gap-2 shadow-sm rounded-lg" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            New Disbursement
          </Button>
        )}
      </div>

      {showForm && (
        <DisbursementForm
          employee={employee}
          onClose={() => setShowForm(false)}
          onCreated={async () => { setShowForm(false); await fetchDisbursements(); }}
        />
      )}

      {loading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      ) : disbursements.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-2xl bg-muted/20">
          <Wallet className="size-12 mx-auto mb-4 opacity-20" />
          <p className="text-muted-foreground font-medium">No salary disbursements recorded yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {disbursements.map((d) => (
            <Item key={d._id} variant="outline" className="relative group transition-all hover:shadow-md flex-col items-stretch p-0 overflow-hidden bg-background">
              {/* Header: Period & Delete */}
              <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                <div className="flex items-center gap-3 flex-wrap">
                  <ItemTitle className="text-sm sm:text-base font-bold">
                    {formatDisplayDate(new Date(d.periodStart))} – {formatDisplayDate(new Date(d.periodEnd))}
                  </ItemTitle>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(d.expenseId?.status)}
                    <Badge variant="secondary" appearance="outline" className="capitalize font-mono text-[10px] hidden xs:inline-flex">
                      {d.paymentFrequency}
                    </Badge>
                  </div>
                </div>

                {permissions.canDelete && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        disabled={processing === d._id}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete disbursement?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will also soft-delete the linked Expense ({d.expenseId?.referenceNumber}) and void associated journal entries.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => handleDelete(d._id)}
                        >
                          Delete Permanent
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>

              {/* Body: Details & Actions */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 gap-6">
                <ItemContent className="gap-4">
                  <ItemDescription className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-3 text-xs">
                    <span className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Working Days</span>
                      <span className="font-semibold text-foreground text-sm">{d.workingDays}</span>
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Present</span>
                      <span className="font-semibold text-primary text-sm">{d.presentDays}</span>
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Reference</span>
                      <span className="font-mono text-primary/70 text-sm">{d.expenseId?.referenceNumber || "N/A"}</span>
                    </span>
                    <span className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Payment</span>
                      <span className="pt-0.5">
                        <Badge 
                          variant={d.expenseId?.paymentStatus === 'paid' ? 'success' : 'warning'} 
                          appearance="outline" 
                          className="capitalize text-[10px] px-2 h-5"
                        >
                          {d.expenseId?.paymentStatus || "Pending"}
                        </Badge>
                      </span>
                    </span>
                  </ItemDescription>
                </ItemContent>

                <ItemActions className="flex-row items-center justify-between lg:justify-end gap-6 pt-4 lg:pt-0 border-t lg:border-t-0">
                  <div className="text-left lg:text-right">
                    <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest leading-none mb-1">Final Amount</div>
                    <div className="text-2xl font-black tracking-tight">{formatCurrency(d.finalAmount)}</div>
                  </div>

                  {permissions.canApprove && d.expenseId?.status === 'pending' && (
                    <Button
                      size="lg"
                      variant="default"
                      className="shadow-md rounded-xl px-6"
                      onClick={() => handleApprove(d._id)}
                      disabled={processing === d._id}
                    >
                      {processing === d._id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CheckCircle2 data-icon="inline-start" />
                      )}
                      Approve
                    </Button>
                  )}
                </ItemActions>
              </div>
            </Item>
          ))}
        </div>
      )}
    </div>
  );
}
