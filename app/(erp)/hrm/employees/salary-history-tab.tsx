"use client";

import * as React from "react";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemMedia,
  ItemActions,
  ItemGroup,
  ItemSeparator,
} from "@/components/ui/item";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import {
  Wallet,
  Trash2,
  Plus,
  Loader2,
  TrendingUp,
  CalendarDays,
  UserCheck,
  Calculator,
  ThumbsUp,
  CalendarIcon,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate } from "@/utils/formatters/date";
import { useSalaryDisbursementPermissions } from "@/hooks/use-permissions";
import type { IEmployee } from "@/models/Employee";

// ─── Types ───────────────────────────────────────────────────────────────────

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
    _id?: string;
    referenceNumber: string;
    status: string;
    paymentStatus: string;
    amount: number;
    paidAmount?: number;
  };
}

interface CalcPreview {
  workingDays: number;
  presentDays: number;
  dailyRate: number;
  calculatedAmount: number;
  frequency: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(d: Date) {
  return d.toISOString().split("T")[0];
}

function expenseStatusVariant(status?: string): any {
  if (status === "approved") return "success";
  if (status === "cancelled") return "destructive";
  return "warning";
}

function StatusIcon({ status }: { status?: string }) {
  if (status === "approved") return <CheckCircle className="text-green-600" />;
  if (status === "cancelled") return <XCircle className="text-destructive" />;
  return <Clock className="text-yellow-500" />;
}

// ─── Date Picker ─────────────────────────────────────────────────────────────

function DatePickerField({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const parsed = value ? new Date(value + "T12:00:00") : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("w-full justify-start font-normal", !parsed && "text-muted-foreground")}
          >
            <CalendarIcon data-icon="inline-start" />
            {parsed ? format(parsed, "PPP") : "Pick a date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={parsed}
            onSelect={(date) => { if (date) { onChange(fmt(date)); setOpen(false); } }}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// ─── Calc Preview ─────────────────────────────────────────────────────────────

function CalcPreviewRow({ preview, loading }: { preview: CalcPreview | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
        <Loader2 className="size-3 animate-spin" />
        Calculating…
      </div>
    );
  }
  if (!preview) return null;

  const stats = [
    { icon: CalendarDays, label: "Working", value: String(preview.workingDays) },
    { icon: UserCheck, label: "Present", value: String(preview.presentDays) },
    { icon: TrendingUp, label: "Daily rate", value: formatCurrency(preview.dailyRate) },
    { icon: Calculator, label: "Calculated", value: formatCurrency(preview.calculatedAmount), primary: true },
  ];

  return (
    <div className="overflow-x-auto">
      <ItemGroup className="flex flex-row min-w-max">
        {stats.map(({ icon: Icon, label, value, primary }, i) => (
          <React.Fragment key={label}>
            <Item className="flex-1" size="sm">
              <ItemMedia variant="icon"><Icon /></ItemMedia>
              <ItemContent>
                <ItemTitle className={cn(primary && "text-primary")}>{value}</ItemTitle>
                <ItemDescription>{label}</ItemDescription>
              </ItemContent>
            </Item>
            {i < stats.length - 1 && <ItemSeparator orientation="vertical" />}
          </React.Fragment>
        ))}
      </ItemGroup>
    </div>
  );
}

// ─── Disbursement Form ────────────────────────────────────────────────────────

function DisbursementForm({ employee, onClose, onCreated }: {
  employee: IEmployee;
  onClose: () => void;
  onCreated: () => void;
}) {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const [periodStart, setPeriodStart] = React.useState(fmt(firstOfMonth));
  const [periodEnd, setPeriodEnd] = React.useState(fmt(lastOfMonth));
  const [showOverride, setShowOverride] = React.useState(false);
  const [override, setOverride] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [calcPreview, setCalcPreview] = React.useState<CalcPreview | null>(null);
  const [calcLoading, setCalcLoading] = React.useState(false);
  const calcDebounceRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const employeeId = (employee._id as any).toString();
  const salary = employee.salary;
  const frequency = (employee as any).salaryFrequency as string | undefined;

  React.useEffect(() => {
    if (!salary || !frequency || !periodStart || !periodEnd) { setCalcPreview(null); return; }
    const start = new Date(periodStart + "T00:00:00");
    const end = new Date(periodEnd + "T00:00:00");
    if (start >= end) { setCalcPreview(null); return; }

    clearTimeout(calcDebounceRef.current);
    calcDebounceRef.current = setTimeout(async () => {
      setCalcLoading(true);
      try {
        // Collect every YYYY-MM in the period (periods rarely span more than 2 months)
        const months: string[] = [];
        const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
        while (cursor <= endMonth) {
          months.push(
            `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`
          );
          cursor.setMonth(cursor.getMonth() + 1);
        }

        // Fetch all months in parallel, then merge and filter to period window
        const weights: Record<string, number> = {
          Present: 1, "Paid Leave": 1, "Half-Day": 0.5, Absent: 0, "Unpaid Leave": 0,
        };

        const fetches = await Promise.all(
          months.map((m) =>
            fetch(`/api/attendance?employeeId=${employeeId}&month=${m}`).then((r) =>
              r.ok ? r.json() : []
            )
          )
        );

        const allRecords: { status: string; date: string }[] = fetches.flat();

        // Only count records that fall within [periodStart, periodEnd]
        let presentDays = 0;
        for (const r of allRecords) {
          const d = new Date(r.date + (r.date.includes("T") ? "" : "T00:00:00"));
          if (d >= start && d <= end) {
            presentDays += weights[r.status] ?? 0;
          }
        }

        // Count working days (Mon–Sat) in the period
        let workingDays = 0;
        const d = new Date(start);
        while (d <= end) { if (d.getDay() !== 0) workingDays++; d.setDate(d.getDate() + 1); }

        const dailyRate =
          frequency === "monthly" ? salary / 26 :
            frequency === "weekly" ? salary / 6 : salary;
        const calculatedAmount = parseFloat((dailyRate * presentDays).toFixed(2));

        setCalcPreview({
          workingDays,
          presentDays,
          dailyRate: parseFloat(dailyRate.toFixed(4)),
          calculatedAmount,
          frequency,
        });
      } catch {
        setCalcPreview(null);
      } finally {
        setCalcLoading(false);
      }
    }, 600);
    return () => clearTimeout(calcDebounceRef.current);
  }, [employeeId, periodStart, periodEnd, salary, frequency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = { employeeId, periodStart, periodEnd, notes };
      if (showOverride && override && !isNaN(parseFloat(override))) {
        payload.finalAmountOverride = parseFloat(override);
      }
      const res = await fetch("/api/salary-disbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create");
      toast.success("Salary disbursement created");
      onCreated();
    } catch (e: any) {
      toast.error(e.message || "Failed to create disbursement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-primary/30 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Wallet className="size-4 text-primary" />
          New Salary Disbursement
        </CardTitle>
        {salary && (
          <CardDescription>
            Base salary: {formatCurrency(salary)} / {frequency || "month"}
          </CardDescription>
        )}
      </CardHeader>
      <Separator />
      <CardContent className="pt-4">
        <form id="disbursement-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <DatePickerField label="Period Start" value={periodStart} onChange={setPeriodStart} />
            <DatePickerField label="Period End" value={periodEnd} onChange={setPeriodEnd} />
          </div>

          <CalcPreviewRow preview={calcPreview} loading={calcLoading} />

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Override Amount</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{showOverride ? "Custom" : "Auto"}</span>
                <Switch
                  checked={showOverride}
                  onCheckedChange={(v) => { setShowOverride(v); if (!v) setOverride(""); }}
                />
              </div>
            </div>
            {showOverride && (
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder={calcPreview ? `Calculated: ${formatCurrency(calcPreview.calculatedAmount)}` : "0.00"}
                value={override}
                onChange={(e) => setOverride(e.target.value)}
                autoFocus
                className="h-9 text-sm"
              />
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes…"
              className="resize-none text-sm"
            />
          </div>
        </form>
      </CardContent>
      <Separator />
      <CardFooter className="pt-3 flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" form="disbursement-form" size="sm" disabled={submitting || calcLoading}>
          {submitting && <Loader2 data-icon="inline-start" className="animate-spin" />}
          Create Disbursement
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Main Tab ─────────────────────────────────────────────────────────────────

interface SalaryHistoryTabProps {
  employee: IEmployee;
  refreshKey?: number;
}

export function SalaryHistoryTab({ employee, refreshKey }: SalaryHistoryTabProps) {
  const { permissions } = useSalaryDisbursementPermissions();
  const [disbursements, setDisbursements] = React.useState<Disbursement[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showForm, setShowForm] = React.useState(false);
  const [deleting, setDeleting] = React.useState<string | null>(null);
  const [approving, setApproving] = React.useState<string | null>(null);

  const employeeId = (employee._id as any).toString();

  const fetchDisbursements = React.useCallback(async (silent = false) => {
    if (!permissions.canRead) return;
    if (!silent) setLoading(true);
    try {
      const res = await fetch(`/api/salary-disbursements?employeeId=${employeeId}&pageSize=50`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setDisbursements(data.data || []);
    } catch {
      if (!silent) toast.error("Could not load salary history");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [employeeId, permissions.canRead]);

  // Initial + refreshKey-triggered fetch
  React.useEffect(() => { fetchDisbursements(); }, [fetchDisbursements, refreshKey]);

  // Silent refetch when browser tab regains focus
  React.useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") fetchDisbursements(true); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchDisbursements]);

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/salary-disbursements/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Disbursement deleted");
      setDisbursements((prev) => prev.filter((d) => d._id !== id));
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    } finally {
      setDeleting(null);
    }
  };

  const handleApprove = async (disbursement: Disbursement) => {
    if (!disbursement.expenseId) return;
    const expenseId = (disbursement.expenseId as any)._id || disbursement.expenseId;
    setApproving(disbursement._id);
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed");
      toast.success("Disbursement approved");
      setDisbursements((prev) =>
        prev.map((d) =>
          d._id === disbursement._id && d.expenseId
            ? { ...d, expenseId: { ...d.expenseId, status: "approved" } }
            : d
        )
      );
    } catch (e: any) {
      toast.error(e.message || "Failed to approve");
    } finally {
      setApproving(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Disbursement history</p>
        {permissions.canCreate && (
          <Button
            size="sm"
            variant={showForm ? "outline" : "default"}
            onClick={() => setShowForm((v) => !v)}
          >
            {showForm ? "Cancel" : <><Plus data-icon="inline-start" />New Disbursement</>}
          </Button>
        )}
      </div>

      {/* ── Form ── */}
      {showForm && (
        <DisbursementForm
          employee={employee}
          onClose={() => setShowForm(false)}
          onCreated={async () => { setShowForm(false); await fetchDisbursements(); }}
        />
      )}

      {/* ── List ── */}
      {loading ? (
        <div className="flex flex-col gap-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 py-3 border-b last:border-b-0">
              <Skeleton className="size-9 rounded-md shrink-0" />
              <div className="flex flex-col gap-1.5 flex-1">
                <Skeleton className="h-3.5 w-44" />
                <Skeleton className="h-3 w-60" />
              </div>
              <Skeleton className="h-5 w-16 shrink-0" />
            </div>
          ))}
        </div>
      ) : disbursements.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
          <Wallet className="size-8 opacity-20" />
          <p className="text-sm">No disbursements yet</p>
          {permissions.canCreate && (
            <p className="text-xs">Click "New Disbursement" above to create one</p>
          )}
        </div>
      ) : (
        <ItemGroup>
          {disbursements.map((d, i) => {
            const isOverridden = d.finalAmount !== d.calculatedAmount;
            const period = `${formatDisplayDate(new Date(d.periodStart))} – ${formatDisplayDate(new Date(d.periodEnd))}`;
            const meta = [
              `${d.presentDays}/${d.workingDays} days`,
              d.expenseId?.referenceNumber,
              d.notes,
            ].filter(Boolean).join(" · ");

            return (
              <React.Fragment key={d._id}>
                <Item>
                  <ItemMedia variant="icon">
                    <StatusIcon status={d.expenseId?.status} />
                  </ItemMedia>

                  <ItemContent>
                    <ItemTitle className="flex items-center gap-1.5 flex-wrap text-sm">
                      {period}
                      <Badge
                        variant={expenseStatusVariant(d.expenseId?.status)}
                        appearance="outline"
                        className="text-[10px] capitalize py-0 leading-none"
                      >
                        {d.expenseId?.status ?? "—"}
                      </Badge>
                      {isOverridden && (
                        <Badge variant="warning" appearance="outline" className="text-[10px] py-0 leading-none">
                          Override
                        </Badge>
                      )}
                      {d.expenseId?.paymentStatus && (
                        <Badge
                          variant={
                            d.expenseId.paymentStatus === "Paid"
                              ? "success"
                              : d.expenseId.paymentStatus === "Partially Paid"
                                ? "primary"
                                : "warning"
                          }
                          appearance="outline"
                          className="text-[10px] py-0 leading-none"
                        >
                          {d.expenseId.paymentStatus}
                        </Badge>
                      )}
                    </ItemTitle>
                    <ItemDescription className="truncate max-w-xs text-xs">{meta}</ItemDescription>
                  </ItemContent>

                  <ItemActions className="gap-1">
                    {/* Amount */}
                    <div className="text-right mr-1">
                      <p className="text-sm font-semibold tabular-nums">{formatCurrency(d.finalAmount)}</p>
                      {isOverridden && (
                        <p className="text-[10px] text-muted-foreground line-through tabular-nums">
                          {formatCurrency(d.calculatedAmount)}
                        </p>
                      )}
                    </div>

                    {/* Approve */}
                    {permissions.canUpdate && d.expenseId?.status === "pending" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/30"
                            disabled={approving === d._id}
                            title="Approve"
                          >
                            {approving === d._id
                              ? <Loader2 className="animate-spin" />
                              : <ThumbsUp />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Approve disbursement?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This approves the linked expense
                              {d.expenseId?.referenceNumber ? ` (${d.expenseId.referenceNumber})` : ""} and
                              creates the journal entry.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleApprove(d)}>Approve</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}

                    {/* Delete */}
                    {permissions.canDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-muted-foreground hover:text-destructive"
                            disabled={deleting === d._id}
                            title="Delete"
                          >
                            {deleting === d._id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete disbursement?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This voids the linked expense and any journal entries. Cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction variant="destructive" onClick={() => handleDelete(d._id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </ItemActions>
                </Item>
                {i < disbursements.length - 1 && <ItemSeparator />}
              </React.Fragment>
            );
          })}
        </ItemGroup>
      )}
    </div>
  );
}