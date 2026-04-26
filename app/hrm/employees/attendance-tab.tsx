"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
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
  Calendar,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { formatDisplayDate } from "@/utils/formatters/date";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAttendancePermissions } from "@/hooks/use-permissions";
import { Skeleton } from "@/components/ui/skeleton";
import type { IEmployee } from "@/models/Employee";

// ─── Constants ───────────────────────────────────────────────────────────────

export type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Half-Day"
  | "Paid Leave"
  | "Unpaid Leave";

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
  "Present",
  "Absent",
  "Half-Day",
  "Paid Leave",
  "Unpaid Leave",
];

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { label: string; color: string; badgeVariant: any; icon: React.ElementType }
> = {
  Present: { label: "Present", color: "bg-green-500", badgeVariant: "success", icon: CheckCircle },
  Absent: { label: "Absent", color: "bg-red-500", badgeVariant: "destructive", icon: XCircle },
  "Half-Day": { label: "Half", color: "bg-yellow-400", badgeVariant: "warning", icon: Clock },
  "Paid Leave": { label: "P.Leave", color: "bg-blue-400", badgeVariant: "info", icon: Calendar },
  "Unpaid Leave": { label: "U.Leave", color: "bg-gray-400", badgeVariant: "secondary", icon: AlertCircle },
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface AttendanceRecord {
  _id: string;
  date: string;
  status: AttendanceStatus;
  notes?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days: Date[] = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    if (d.getDay() !== 0) {
      days.push(new Date(d));
    }
  }
  return days;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AttendanceTab({ employee }: { employee: IEmployee }) {
  const { permissions } = useAttendancePermissions();
  const today = new Date();
  const [year, setYear] = React.useState(today.getFullYear());
  const [month, setMonth] = React.useState(today.getMonth());
  const [records, setRecords] = React.useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = React.useState(true); // Initial loading
  const [syncing, setSyncing] = React.useState(false); // Background sync

  const employeeId = (employee._id as any).toString();

  const fetchRecords = React.useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch(
        `/api/attendance?employeeId=${employeeId}&month=${year}-${String(month + 1).padStart(2, "0")}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRecords(data);
    } catch {
      toast.error("Could not load attendance");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [employeeId, year, month]);

  React.useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const workingDays = getMonthDays(year, month);

  const recordByDate = React.useMemo(() => {
    const map: Record<string, AttendanceRecord> = {};
    records.forEach((r) => {
      const d = new Date(r.date);
      map[`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`] = r;
    });
    return map;
  }, [records]);

  const getRecord = (date: Date) =>
    recordByDate[`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`];

  const handleDayClick = async (date: Date) => {
    if (!permissions.canCreate) return;
    const existing = getRecord(date);

    // Cycle logic
    const CYCLE: (AttendanceStatus | null)[] = [
      "Present",
      "Half-Day",
      "Absent",
      "Paid Leave",
      "Unpaid Leave",
      null,
    ];
    const currentIdx = existing
      ? CYCLE.indexOf(existing.status as AttendanceStatus)
      : -1;
    const status = CYCLE[(currentIdx + 1) % CYCLE.length];

    // --- OPTIMISTIC UPDATE ---
    const previousRecords = [...records];
    if (status === null && existing) {
      setRecords(records.filter((r) => r._id !== existing._id));
    } else if (status !== null) {
      const tempId = Math.random().toString();
      const newRecord: AttendanceRecord = {
        _id: tempId,
        date: date.toISOString(),
        status,
      };
      if (existing) {
        setRecords(records.map((r) => (r._id === existing._id ? newRecord : r)));
      } else {
        setRecords([...records, newRecord]);
      }
    }

    setSyncing(true);
    try {
      if (status === null && existing) {
        const res = await fetch(`/api/attendance/${existing._id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
      } else if (status !== null) {
        const res = await fetch("/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            employeeId,
            date: date.toISOString(),
            status,
          }),
        });
        if (!res.ok) throw new Error();
      }
      // Re-fetch to get real IDs and sync
      await fetchRecords(true);
    } catch {
      toast.error("Failed to update attendance");
      setRecords(previousRecords); // ROLLBACK
    } finally {
      setSyncing(false);
    }
  };

  const handleFillPresent = async () => {
    if (!permissions.canBulkCreate) return;
    const unmarked = workingDays.filter((d) => !getRecord(d));
    if (unmarked.length === 0) {
      toast.info("All working days are already marked");
      return;
    }

    // Optimistic bulk mark
    const previousRecords = [...records];
    const tempRecords: AttendanceRecord[] = unmarked.map((d) => ({
      _id: Math.random().toString(),
      date: d.toISOString(),
      status: "Present",
    }));
    setRecords([...records, ...tempRecords]);

    setSyncing(true);
    try {
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          entries: unmarked.map((d) => ({
            date: d.toISOString(),
            status: "Present",
          })),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Marked ${unmarked.length} day(s) as Present`);
      await fetchRecords(true);
    } catch {
      toast.error("Failed to bulk-mark attendance");
      setRecords(previousRecords);
    } finally {
      setSyncing(false);
    }
  };

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const summary = React.useMemo(() => {
    const counts: Record<AttendanceStatus, number> = {
      Present: 0, Absent: 0, "Half-Day": 0, "Paid Leave": 0, "Unpaid Leave": 0,
    };
    records.forEach((r) => {
      if (r.status in counts) counts[r.status as AttendanceStatus]++;
    });
    return counts;
  }, [records]);

  const monthLabel = new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} disabled={syncing}>
            <ChevronLeft data-icon="inline-start" />
          </Button>
          <span className="font-semibold text-sm sm:text-base w-40 text-center">{monthLabel}</span>
          <Button variant="outline" size="icon" onClick={nextMonth} disabled={syncing}>
            <ChevronRight data-icon="inline-start" />
          </Button>
          {syncing && <Loader2 className="size-4 animate-spin ml-2" />}
        </div>
        {permissions.canBulkCreate && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleFillPresent}
            disabled={syncing}
          >
            <CheckCircle data-icon="inline-start" />
            Fill Present
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {ATTENDANCE_STATUSES.map((s) => {
          const cfg = STATUS_CONFIG[s as AttendanceStatus];
          return (
            <div key={s} className="flex items-center gap-1">
              <span className={cn("size-3 rounded-sm inline-block", cfg.color)} />
              <span className="text-muted-foreground">{cfg.label}</span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-6 gap-1">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
        {workingDays.map((date) => {
          const record = getRecord(date);
          const cfg = record ? STATUS_CONFIG[record.status] : null;
          const isToday = isSameDay(date, today);

          if (loading) {
            return <Skeleton key={date.toISOString()} className="h-10 w-full rounded-md" />;
          }

          return (
            <TooltipProvider key={date.toISOString()}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleDayClick(date)}
                    disabled={!permissions.canCreate}
                    className={cn(
                      "relative flex flex-col items-center justify-center rounded-md border transition-all",
                      "h-10 text-xs font-medium",
                      permissions.canCreate
                        ? "hover:ring-2 hover:ring-primary cursor-pointer"
                        : "cursor-default",
                      isToday && "ring-2 ring-primary",
                      cfg ? cfg.color + " text-white border-transparent shadow-sm" : "border-dashed"
                    )}
                  >
                    <span>{date.getDate()}</span>
                    {cfg && <span className="text-[9px] opacity-80 leading-none">{cfg.label}</span>}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  <p className="font-medium">{formatDisplayDate(date)}</p>
                  {record ? (
                    <>
                      <p>Status: {record.status}</p>
                      {permissions.canCreate && <p className="text-muted-foreground mt-1">Click to cycle</p>}
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      {permissions.canCreate ? "Click to mark Present" : "No record"}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 border-t">
        {(Object.keys(summary) as AttendanceStatus[]).map((s) => {
          return (
            <div key={s} className="text-center p-2 rounded-lg bg-muted/50">
              <div className="text-lg font-bold">{summary[s]}</div>
              <div className="text-xs text-muted-foreground">{s}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
