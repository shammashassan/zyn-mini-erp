"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatLongDate } from "@/utils/formatters/date";
import type { IEmployee } from "@/models/Employee";
import { cn } from "@/lib/utils";

export function ProfileTab({ employee }: { employee: IEmployee }) {
  const displayName = `${employee.firstName} ${employee.lastName}`;
  const fallback = `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase();

  return (
    <div className="space-y-6 mt-4">
      {/* Header Bento Section */}
      <Card className="overflow-hidden border-none shadow-md bg-linear-to-br from-background to-muted/50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                <AvatarImage src={employee.avatar} alt={displayName} />
                <AvatarFallback className="text-4xl bg-primary/10 text-primary">{fallback}</AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="flex-1 text-center md:text-left space-y-4">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">{displayName}</h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
                  <Badge variant="primary" appearance="outline" className="px-3 py-1 text-sm font-medium">
                    <Briefcase className="h-3.5 w-3.5 mr-1.5" />
                    {employee.role}
                  </Badge>
                  <Badge variant="secondary" appearance="outline" >
                    ID: {employee._id.toString().slice(-6).toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm pt-2">
                {employee.email && (
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-background/50 transition-colors">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      <Mail className="h-4 w-4" />
                    </div>
                    <span className="font-medium truncate">{employee.email}</span>
                  </div>
                )}
                {employee.mobiles && employee.mobiles.length > 0 && (
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-background/50 transition-colors">
                    <div className="p-2 rounded-full bg-primary/10 text-primary">
                      <Phone className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{employee.mobiles[0]}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <Card className="shadow-sm border-muted-foreground/10">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Heart className="h-4 w-4 text-rose-500" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date of Birth</div>
                <div className="flex items-center gap-2 font-medium text-sm">
                  <Calendar className="h-4 w-4 text-primary/60" />
                  {formatLongDate(employee.dob)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Civil Status</div>
                <div className="font-medium text-sm">{employee.civilStatus || "Not Specified"}</div>
              </div>
              <div className="space-y-1 col-span-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Passport / ID Number</div>
                <div className="flex items-center gap-2 font-mono text-sm bg-muted px-2 py-1 rounded w-fit">
                  <CreditCard className="h-3.5 w-3.5 text-primary/60" />
                  {employee.passport || "N/A"}
                </div>
              </div>
              {employee.mobiles && employee.mobiles.length > 1 && (
                <div className="space-y-1 col-span-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Additional Contacts</div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {employee.mobiles.slice(1).join(", ")}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Address Card */}
        <Card className="shadow-sm border-muted-foreground/10">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-blue-500" />
              Address Details
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {!employee.address1 && !employee.address2 ? (
              <p className="text-sm text-muted-foreground italic">No address provided.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {employee.address1 && (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Primary Address</div>
                    <p className="text-sm font-medium leading-relaxed">{employee.address1}</p>
                  </div>
                )}
                {employee.address2 && (
                  <div className="flex flex-col gap-1">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Secondary Address</div>
                    <p className="text-sm font-medium leading-relaxed">{employee.address2}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Employment Card */}
        <Card className="lg:col-span-2 shadow-sm border-muted-foreground/10">
          <CardHeader className="pb-3 border-b bg-muted/20">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-orange-500" />
              Employment & Financials
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2 p-4 rounded-xl border">
                <div className="text-xs font-bold text-primary/70 uppercase tracking-widest">Base Salary</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{formatCurrency(employee.salary || 0)}</span>
                  <span className="text-xs text-muted-foreground">/ {(employee as any).salaryFrequency || "month"}</span>
                </div>
              </div>

              <div className="space-y-1 flex flex-col justify-center">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined Date</div>
                <div className="flex items-center gap-2 font-medium">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {formatLongDate(employee.joinedDate)}
                </div>
              </div>

              <div className="space-y-1 flex flex-col justify-center">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tenure</div>
                <div className="font-medium">
                  {employee.joinedDate ? Math.floor((new Date().getTime() - new Date(employee.joinedDate).getTime()) / (1000 * 60 * 60 * 24 * 365)) : 0} Years
                </div>
              </div>
            </div>

            {employee.description && (
              <div className="mt-6 pt-6 border-t">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5" />
                  Employee Bio / Notes
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {employee.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
