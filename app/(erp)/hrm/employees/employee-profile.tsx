"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { IEmployee } from "@/models/Employee";
import {
  Mail,
  Phone,
  Calendar,
  MapPin,
  Briefcase,
  CreditCard,
  FileText,
  Heart,
  CircleDollarSign,
  UserRound,
  Hash,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatLongDate } from "@/utils/formatters/date";

interface EmployeeProfileTabProps {
  employee: IEmployee;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType;
  label: string;
  value?: React.ReactNode;
  mono?: boolean;
}) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0 text-muted-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium wrap-break-word ${mono ? "font-mono" : ""}`}>
          {value}
        </p>
      </div>
    </div>
  );
}

export function EmployeeProfileTab({ employee }: EmployeeProfileTabProps) {
  const displayName = employee.firstName
    ? `${employee.firstName} ${employee.lastName}`
    : (employee as any).name || "Unknown";
  const fallback = employee.firstName
    ? `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase()
    : "??";

  const salaryFrequency = (employee as any).salaryFrequency as string | undefined;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <Avatar className="h-24 w-24 shrink-0 border-4 border-muted">
              <AvatarImage src={employee.avatar} alt={displayName} />
              <AvatarFallback className="text-2xl font-semibold bg-linear-to-br from-blue-500 to-purple-600 text-white">
                {fallback}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-xl font-bold">{displayName}</h2>
              <Badge variant="primary" appearance="outline" className="mt-1">
                <Briefcase className="h-3 w-3 mr-1" />
                {employee.role}
              </Badge>

              <div className="mt-3 flex flex-col sm:flex-row gap-3 text-sm text-muted-foreground justify-center sm:justify-start">
                {employee.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate max-w-[200px]">{employee.email}</span>
                  </div>
                )}
                {employee.mobiles && employee.mobiles.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    <span>{employee.mobiles[0]}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Salary highlight */}
            {employee.salary ? (
              <div className="shrink-0 text-center sm:text-right px-4 py-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                <p className="text-xs text-muted-foreground mb-0.5">Salary</p>
                <p className="text-lg font-bold text-green-600">
                  {formatCurrency(employee.salary)}
                </p>
                {salaryFrequency && (
                  <p className="text-xs text-muted-foreground capitalize">per {salaryFrequency}</p>
                )}
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* ── Grid: Personal + Employment ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Personal */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={Calendar} label="Date of Birth" value={formatLongDate(employee.dob)} />
            <InfoRow icon={Heart} label="Civil Status" value={employee.civilStatus || "—"} />
            <InfoRow icon={CreditCard} label="Passport No." value={employee.passport || "—"} mono />
            {employee.mobiles && employee.mobiles.length > 1 && (
              <InfoRow
                icon={Phone}
                label="Additional Contacts"
                value={employee.mobiles.slice(1).join(", ")}
              />
            )}
          </CardContent>
        </Card>

        {/* Employment */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={Calendar} label="Joined Date" value={formatLongDate(employee.joinedDate)} />
            {employee.salary && (
              <InfoRow
                icon={CircleDollarSign}
                label="Salary Rate"
                value={
                  <span className="text-green-600">
                    {formatCurrency(employee.salary)}
                    {salaryFrequency && (
                      <span className="text-muted-foreground text-xs ml-1">/ {salaryFrequency}</span>
                    )}
                  </span>
                }
              />
            )}
            <InfoRow icon={Hash} label="Role" value={employee.role} />
          </CardContent>
        </Card>
      </div>

      {/* ── Address ── */}
      {(employee.address1 || employee.address2) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {employee.address1 && (
              <div>
                <p className="text-xs text-muted-foreground">Line 1</p>
                <p className="text-sm font-medium">{employee.address1}</p>
              </div>
            )}
            {employee.address2 && (
              <div>
                <p className="text-xs text-muted-foreground">Line 2</p>
                <p className="text-sm font-medium">{employee.address2}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Notes ── */}
      {employee.description && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
              {employee.description}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}