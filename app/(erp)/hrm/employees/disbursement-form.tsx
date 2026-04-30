"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Calculator, Info, Loader2 } from "lucide-react";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemGroup,
} from "@/components/ui/item";
import { formatCurrency } from "@/utils/formatters/currency";
import { toast } from "sonner";
import type { IEmployee } from "@/models/Employee";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface SalaryPreview {
  workingDays: number;
  presentDays: number;
  dailyRate: number;
  calculatedAmount: number;
}

export function DisbursementForm({
  employee,
  onClose,
  onCreated,
}: {
  employee: IEmployee;
  onClose: () => void;
  onCreated: () => void;
}) {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const [periodStart, setPeriodStart] = React.useState(fmt(firstOfMonth));
  const [periodEnd, setPeriodEnd] = React.useState(fmt(lastOfMonth));
  const [override, setOverride] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [preview, setPreview] = React.useState<SalaryPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = React.useState(false);
  const [showOverride, setShowOverride] = React.useState(false);

  const fetchPreview = async () => {
    setLoadingPreview(true);
    try {
      const res = await fetch(
        `/api/salary-disbursements/preview?employeeId=${employee._id}&start=${periodStart}&end=${periodEnd}`
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPreview(data);
    } catch {
      toast.error("Failed to load calculation preview");
    } finally {
      setLoadingPreview(false);
    }
  };

  React.useEffect(() => {
    if (periodStart && periodEnd) {
      fetchPreview();
    }
  }, [periodStart, periodEnd]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        employeeId: (employee._id as any).toString(),
        periodStart,
        periodEnd,
        notes,
      };
      if (override) payload.finalAmountOverride = parseFloat(override);

      const res = await fetch("/api/salary-disbursements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success("Salary disbursement created");
      onCreated();
    } catch (e: any) {
      toast.error(e.message || "Failed to create disbursement");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border shadow-lg animate-in fade-in slide-in-from-top-2">
      <CardHeader className="pb-3 border-b mb-4">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Calculator className="size-4" />
          Salary Calculation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Period Start</label>
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                required
                className="w-full h-10 text-sm rounded-lg border border-input bg-background px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Period End</label>
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                required
                className="w-full h-10 text-sm rounded-lg border border-input bg-background px-3 py-1 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* PREVIEW SECTION */}
          {preview ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Item variant="outline" size="sm" className="flex-col items-center text-center rounded-xl p-3 bg-muted/20 w-[calc(50%-4px)] sm:w-[calc(25%-6px)] min-w-[120px]">
                <ItemTitle className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Working Days</ItemTitle>
                <div className="text-lg font-bold">{preview.workingDays}</div>
              </Item>
              <Item variant="outline" size="sm" className="flex-col items-center text-center rounded-xl p-3 bg-muted/20 w-[calc(50%-4px)] sm:w-[calc(25%-6px)] min-w-[120px]">
                <ItemTitle className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Present Days</ItemTitle>
                <div className="text-lg font-bold text-primary">{preview.presentDays}</div>
              </Item>
              <Item variant="outline" size="sm" className="flex-col items-center text-center rounded-xl p-3 bg-muted/20 w-[calc(50%-4px)] sm:w-[calc(25%-6px)] min-w-[120px]">
                <ItemTitle className="text-[10px] font-bold text-muted-foreground uppercase leading-none mb-1">Daily Rate</ItemTitle>
                <div className="text-lg font-bold font-mono">{formatCurrency(preview.dailyRate)}</div>
              </Item>
              {!showOverride && (
                <Item variant="outline" size="sm" className="flex-col items-center text-center rounded-xl p-3 border-primary/20 bg-primary/5 w-[calc(100%-8px)] sm:w-[calc(25%-6px)] min-w-[120px]">
                  <ItemTitle className="text-[10px] font-bold text-primary uppercase leading-none mb-1">Calculated</ItemTitle>
                  <div className="text-lg font-bold text-primary">{formatCurrency(preview.calculatedAmount)}</div>
                </Item>
              )}
            </div>
          ) : loadingPreview ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
              <Skeleton className="h-16 rounded-xl" />
            </div>
          ) : null}

          <div className="space-y-4 pt-2">
            <Label
              htmlFor="manual-override"
              className={cn(
                "hover:bg-accent/50 flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-colors",
                showOverride && "border-primary bg-primary/5 dark:border-primary/40 dark:bg-primary/10"
              )}
            >
              <div className="grid gap-1.5 font-normal flex-1">
                <p className="text-sm leading-none font-medium">
                  Manual Override
                </p>
                <p className="text-muted-foreground text-sm">
                  {showOverride 
                    ? "Manual amount is being used instead of system calculation" 
                    : "Use system calculation based on attendance and salary rate"}
                </p>
              </div>
              <Switch 
                id="manual-override"
                checked={showOverride} 
                onCheckedChange={(checked) => {
                  setShowOverride(checked);
                  if (!checked) setOverride("");
                }} 
              />
            </Label>

            {showOverride && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-1">
                <label className="text-xs font-bold uppercase tracking-tight text-muted-foreground">
                  Custom Final Amount
                </label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={override}
                    onChange={(e) => setOverride(e.target.value)}
                    required
                    autoFocus
                    className="w-full h-11 pl-8 text-lg font-mono rounded-xl border border-primary/30 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-tight text-muted-foreground">Internal Notes</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Details about adjustments, bonuses, etc."
                className="w-full text-sm rounded-xl border border-input bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" size="lg" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" size="lg" disabled={submitting || loadingPreview} className="px-8 rounded-xl shadow-md">
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wallet data-icon="inline-start" />
              )}
              Generate Disbursement
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
