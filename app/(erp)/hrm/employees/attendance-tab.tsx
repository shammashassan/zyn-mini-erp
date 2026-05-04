"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemMedia,
  ItemGroup,
  ItemSeparator,
} from "@/components/ui/item";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Calendar,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAttendancePermissions } from "@/hooks/use-permissions";
import type { AttendanceStatus } from "@/models/Attendance";
import { formatDisplayDate } from "@/utils/formatters/date";
import type { IEmployee } from "@/models/Employee";

// ─── Constants ───────────────────────────────────────────────────────────────

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "Present",
  "Absent",
  "Half-Day",
  "Paid Leave",
  "Unpaid Leave",
];

export const STATUS_CONFIG: Record<
  AttendanceStatus,
  { short: string; bg: string; text: string; icon: React.ElementType }
> = {
  Present: { short: "P", bg: "bg-green-500", text: "text-white", icon: CheckCircle },
  Absent: { short: "A", bg: "bg-red-500", text: "text-white", icon: XCircle },
  "Half-Day": { short: "½", bg: "bg-yellow-400", text: "text-black", icon: Clock },
  "Paid Leave": { short: "PL", bg: "bg-blue-400", text: "text-white", icon: Calendar },
  "Unpaid Leave": { short: "UL", bg: "bg-muted-foreground", text: "text-white", icon: AlertCircle },
};

const CYCLE: (AttendanceStatus | null)[] = [
  "Present", "Half-Day", "Absent", "Paid Leave", "Unpaid Leave", null,
];

const DAY_LABELS: { full: string; short: string }[] = [
  { full: "Mon", short: "M" },
  { full: "Tue", short: "T" },
  { full: "Wed", short: "W" },
  { full: "Thu", short: "T" },
  { full: "Fri", short: "F" },
  { full: "Sat", short: "S" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWorkingDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    if (d.getDay() !== 0) days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isSameDay(a: Date, b: Date) {
  return dateKey(a) === dateKey(b);
}

export interface AttendanceRecord {
  _id: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface AttendanceTabProps {
  employee: IEmployee;
  refreshKey?: number;
}

export function AttendanceTab({ employee, refreshKey }: AttendanceTabProps) {
  const { permissions } = useAttendancePermissions();
  const today = new Date();

  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth());
  const [recordMap, setRecordMap] = React.useState<Record<string, AttendanceRecord>>({});
  const [pendingKeys, setPendingKeys] = React.useState<Set<string>>(new Set());
  const [initialLoading, setInitialLoading] = React.useState(false);
  const [bulkSaving, setBulkSaving] = React.useState(false);

  const employeeId = (employee._id as any).toString();

  const fetchMonth = React.useCallback(async (y: number, m: number, silent = false) => {
    if (!silent) setInitialLoading(true);
    try {
      const res = await fetch(
        `/api/attendance?employeeId=${employeeId}&month=${y}-${String(m + 1).padStart(2, "0")}`
      );
      if (!res.ok) throw new Error();
      const records: AttendanceRecord[] = await res.json();
      const map: Record<string, AttendanceRecord> = {};
      records.forEach((r) => { map[dateKey(new Date(r.date))] = r; });
      setRecordMap(map);
    } catch {
      if (!silent) toast.error("Could not load attendance");
    } finally {
      if (!silent) setInitialLoading(false);
    }
  }, [employeeId]);

  // Fetch on month change or refreshKey change
  React.useEffect(() => { fetchMonth(year, month); }, [fetchMonth, year, month, refreshKey]);

  // Silent refetch when browser tab regains focus
  React.useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchMonth(year, month, true);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchMonth, year, month]);

  const workingDays = React.useMemo(() => getWorkingDaysInMonth(year, month), [year, month]);

  const handleDayClick = async (date: Date) => {
    if (!permissions.canCreate) return;
    const key = dateKey(date);
    if (pendingKeys.has(key)) return;

    const existing = recordMap[key];
    const currentIdx = existing ? CYCLE.indexOf(existing.status) : -1;
    const nextStatus = CYCLE[(currentIdx + 1) % CYCLE.length];

    setRecordMap((prev) => {
      const next = { ...prev };
      if (nextStatus === null) delete next[key];
      else next[key] = { _id: existing?._id || "__optimistic__", date: date.toISOString(), status: nextStatus };
      return next;
    });
    setPendingKeys((prev) => new Set(prev).add(key));

    try {
      if (nextStatus === null && existing) {
        const res = await fetch(`/api/attendance/${existing._id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
      } else if (nextStatus !== null) {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeId, date: date.toISOString(), status: nextStatus }),
        });
        if (!res.ok) throw new Error();
        const saved: AttendanceRecord = await res.json();
        setRecordMap((prev) => ({ ...prev, [key]: saved }));
      }
    } catch {
      toast.error("Failed to update attendance");
      setRecordMap((prev) => {
        const next = { ...prev };
        if (existing) next[key] = existing;
        else delete next[key];
        return next;
      });
    } finally {
      setPendingKeys((prev) => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  const handleFillPresent = async () => {
    if (!permissions.canBulkCreate) return;
    const unmarked = workingDays.filter((d) => !recordMap[dateKey(d)]);
    if (unmarked.length === 0) { toast.info("All working days already marked"); return; }

    setRecordMap((prev) => {
      const next = { ...prev };
      unmarked.forEach((d) => {
        next[dateKey(d)] = { _id: "__optimistic__", date: d.toISOString(), status: "Present" };
      });
      return next;
    });
    setBulkSaving(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          entries: unmarked.map((d) => ({ date: d.toISOString(), status: "Present" })),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Marked ${unmarked.length} day(s) as Present`);
      await fetchMonth(year, month);
    } catch {
      toast.error("Failed to bulk-mark attendance");
      await fetchMonth(year, month);
    } finally {
      setBulkSaving(false);
    }
  };

  const prevMonth = () => {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  };

  const monthLabel = new Date(year, month).toLocaleString("default", { month: "long", year: "numeric" });

  const summary = React.useMemo(() => {
    const counts: Record<AttendanceStatus, number> = {
      Present: 0, Absent: 0, "Half-Day": 0, "Paid Leave": 0, "Unpaid Leave": 0,
    };
    Object.values(recordMap).forEach((r) => { if (r.status in counts) counts[r.status]++; });
    return { counts, total: workingDays.length };
  }, [recordMap, workingDays]);

  const firstColOffset = workingDays[0] ? (workingDays[0].getDay() + 6) % 7 : 0;

  return (
    <div className="flex flex-col gap-4">

      {/* ── Header: nav + working days + fill button ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="size-8" onClick={prevMonth} disabled={initialLoading}>
            <ChevronLeft />
          </Button>
          <span className="text-sm font-semibold w-44 text-center tabular-nums select-none">
            {monthLabel}
          </span>
          <Button variant="outline" size="icon" className="size-8" onClick={nextMonth} disabled={initialLoading}>
            <ChevronRight />
          </Button>
          {/* Working days pill next to nav */}
          {!initialLoading && (
            <span className="text-xs text-muted-foreground ml-1 tabular-nums">
              {summary.total} working days
            </span>
          )}
        </div>

        {permissions.canBulkCreate && (
          <Button variant="outline" size="sm" onClick={handleFillPresent} disabled={bulkSaving || initialLoading}>
            {bulkSaving
              ? <Loader2 data-icon="inline-start" className="animate-spin" />
              : <CheckCircle data-icon="inline-start" />}
            Fill Present
          </Button>
        )}
      </div>

      {/* ── Calendar grid ── */}
      {initialLoading ? (
        <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
          {DAY_LABELS.map((d) => (
            <div key={d.full} className="text-center text-xs font-medium text-muted-foreground py-1">
              <span className="sm:hidden">{d.short}</span>
              <span className="hidden sm:inline">{d.full}</span>
            </div>
          ))}
          {Array.from({ length: 26 }).map((_, i) => <Skeleton key={i} className="h-8 sm:h-11 rounded-md" />)}
        </div>
      ) : (
        <div className="grid grid-cols-6 gap-0.5 sm:gap-1">
          {DAY_LABELS.map((d) => (
            <div key={d.full} className="text-center text-xs font-medium text-muted-foreground py-1">
              <span className="sm:hidden">{d.short}</span>
              <span className="hidden sm:inline">{d.full}</span>
            </div>
          ))}
          {Array.from({ length: firstColOffset }).map((_, i) => <div key={`off-${i}`} />)}
          {workingDays.map((date) => {
            const key = dateKey(date);
            const record = recordMap[key];
            const cfg = record ? STATUS_CONFIG[record.status] : null;
            const isPending = pendingKeys.has(key);
            const isToday = isSameDay(date, today);

            return (
              <TooltipProvider key={key} delayDuration={400}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleDayClick(date)}
                      disabled={!permissions.canCreate || bulkSaving}
                      className={cn(
                        "relative flex flex-col items-center justify-center rounded-md border",
                        "h-8 sm:h-11 text-[10px] sm:text-xs font-medium transition-all select-none",
                        permissions.canCreate && !bulkSaving ? "cursor-pointer" : "cursor-default",
                        isToday && "ring-2 ring-primary ring-offset-1",
                        cfg
                          ? `${cfg.bg} ${cfg.text} border-transparent`
                          : "hover:bg-muted border-dashed border-muted-foreground/30"
                      )}
                    >
                      <span>{date.getDate()}</span>
                      {cfg && <span className="hidden sm:block text-[9px] opacity-80 leading-none mt-0.5">{cfg.short}</span>}
                      {isPending && (
                        <span className="absolute top-0.5 right-0.5">
                          <Loader2 className="size-2.5 animate-spin opacity-60" />
                        </span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    <p className="font-medium">{formatDisplayDate(date)}</p>
                    <p className="text-muted-foreground">
                      {record ? record.status : permissions.canCreate ? "Click to mark" : "No record"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      )}

      {/* ── Summary row — all 5 statuses in one horizontal ItemGroup ── */}
      {!initialLoading && (
        <>
          <Separator />
          {/* overflow-x-auto so it scrolls on very small screens instead of wrapping */}
          <div className="overflow-x-auto">
            <ItemGroup className="flex flex-row min-w-max">
              {(ATTENDANCE_STATUSES as AttendanceStatus[]).map((s, i) => {
                const cfg = STATUS_CONFIG[s];
                const Icon = cfg.icon;
                return (
                  <React.Fragment key={s}>
                    <Item className="flex-1">
                      <ItemMedia variant="icon">
                        <span className={cn("flex items-center justify-center size-full rounded", cfg.bg)}>
                          <Icon className={cfg.text} />
                        </span>
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{summary.counts[s]}</ItemTitle>
                        <ItemDescription>{s}</ItemDescription>
                      </ItemContent>
                    </Item>
                    {i < ATTENDANCE_STATUSES.length - 1 && <ItemSeparator orientation="vertical" />}
                  </React.Fragment>
                );
              })}
            </ItemGroup>
          </div>
        </>
      )}
    </div>
  );
}