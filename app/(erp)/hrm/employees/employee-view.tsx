"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, User, CalendarDays, WalletCards } from "lucide-react";
import type { IEmployee } from "@/models/Employee";

// Import modular components
import { ProfileTab } from "./profile-tab";
import { AttendanceTab } from "./attendance-tab";
import { SalaryTab } from "./salary-tab";

interface EmployeeViewProps {
  isOpen: boolean;
  onClose: () => void;
  employee: IEmployee | null;
}

export function EmployeeViewModal({ isOpen, onClose, employee }: EmployeeViewProps) {
  if (!employee) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-5xl max-h-[95vh] overflow-hidden flex flex-col p-0 gap-0 border-none shadow-2xl">
        {/* Modern Header */}
        <DialogHeader className="p-6 bg-muted/30 border-b">
          <DialogTitle className="flex items-center gap-3 text-xl font-bold tracking-tight">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Briefcase className="h-5 w-5" />
            </div>
            Employee Management
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="profile" className="flex-1 flex flex-col overflow-hidden">
          {/* Navigation Bar */}
          <div className="px-6 py-2 bg-background border-b flex justify-center">
            <TabsList className="bg-transparent h-auto p-0 gap-4 w-full justify-center">
              <TabsTrigger
                value="profile"
                className="gap-2"
              >
                <User data-icon="inline-start" />
                Profile
              </TabsTrigger>
              <TabsTrigger
                value="attendance"
                className="gap-2"
              >
                <CalendarDays data-icon="inline-start" />
                Attendance
              </TabsTrigger>
              <TabsTrigger
                value="salary"
                className="gap-2"
              >
                <WalletCards data-icon="inline-start" />
                Salary & Payroll
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto p-6 sidebar-scroll bg-muted/5">
            <TabsContent value="profile" className="mt-0 focus-visible:ring-0">
              <ProfileTab employee={employee} />
            </TabsContent>

            <TabsContent value="attendance" className="mt-0 focus-visible:ring-0">
              <AttendanceTab employee={employee} />
            </TabsContent>

            <TabsContent value="salary" className="mt-0 focus-visible:ring-0">
              <SalaryTab employee={employee} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}