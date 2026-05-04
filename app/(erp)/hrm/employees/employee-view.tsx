"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, CalendarDays, Wallet, User } from "lucide-react";
import type { IEmployee } from "@/models/Employee";

import { EmployeeProfileTab } from "./employee-profile";
import { AttendanceTab } from "./attendance-tab";
import { SalaryHistoryTab } from "./salary-history-tab";

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmployeeViewProps {
  isOpen: boolean;
  onClose: () => void;
  employee: IEmployee | null;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function EmployeeViewModal({ isOpen, onClose, employee }: EmployeeViewProps) {
  // Track how many times each tab has been (re-)activated so child tabs can
  // silently refetch whenever the user switches back to them.
  const [attendanceKey, setAttendanceKey] = React.useState(0);
  const [salaryKey, setSalaryKey] = React.useState(0);
  const prevTab = React.useRef<string>("profile");

  const handleTabChange = (tab: string) => {
    // Increment the key for the tab being switched INTO (silent background fetch)
    if (tab === "attendance" && prevTab.current !== "attendance") {
      setAttendanceKey((k) => k + 1);
    }
    if (tab === "salary" && prevTab.current !== "salary") {
      setSalaryKey((k) => k + 1);
    }
    prevTab.current = tab;
  };

  if (!employee) return null;

  const displayName = employee.firstName
    ? `${employee.firstName} ${employee.lastName}`
    : (employee as any).name || "Employee";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-4xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="size-4 text-muted-foreground" />
            <span>{displayName}</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile" className="gap-1.5 text-xs sm:text-sm">
              <User data-icon="inline-start" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-1.5 text-xs sm:text-sm">
              <CalendarDays data-icon="inline-start" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="salary" className="gap-1.5 text-xs sm:text-sm">
              <Wallet data-icon="inline-start" />
              Salary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <EmployeeProfileTab employee={employee} />
          </TabsContent>

          <TabsContent value="attendance" className="mt-4">
            <AttendanceTab employee={employee} refreshKey={attendanceKey} />
          </TabsContent>

          <TabsContent value="salary" className="mt-4">
            <SalaryHistoryTab employee={employee} refreshKey={salaryKey} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}