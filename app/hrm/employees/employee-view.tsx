"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  IndianRupee,
  FileText,
  Heart,
  CircleDollarSign,
} from "lucide-react";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatLongDate } from "@/utils/formatters/date";

/**
 * Interface for the props of the EmployeeViewModal component.
 */
interface EmployeeViewProps {
  isOpen: boolean;
  onClose: () => void;
  employee: IEmployee | null;
}

/**
 * A modal component to display employee details.
 * @param {EmployeeViewProps} props - The props for the component.
 * @returns {JSX.Element | null} The rendered component.
 */
export function EmployeeViewModal({ isOpen, onClose, employee }: EmployeeViewProps) {
  if (!employee) return null;

  // Determine the display name and avatar fallback text
  const displayName = employee.firstName 
    ? `${employee.firstName} ${employee.lastName}` 
    : (employee as any).name || "Unknown";
  const fallback = employee.firstName 
    ? `${employee.firstName[0]}${employee.lastName[0]}`.toUpperCase() 
    : "??";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Employee Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Card with Avatar */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <Avatar className="h-32 w-32 border-4 border-muted">
                  <AvatarImage src={employee.avatar} alt={displayName} />
                  <AvatarFallback className="text-4xl">{fallback}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center md:text-left space-y-3">
                  <div>
                    <h2 className="text-2xl font-bold">{displayName}</h2>
                    <Badge variant="primary" appearance="outline" className="mt-2">
                      {employee.role}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
                    {employee.email && (
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="break-all">{employee.email}</span>
                      </div>
                    )}
                    {employee.mobiles && employee.mobiles.length > 0 && (
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{employee.mobiles[0]}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">Date of Birth</div>
                    <div className="font-medium">{formatLongDate(employee.dob)}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Heart className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">Civil Status</div>
                    <div className="font-medium">{employee.civilStatus || 'N/A'}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">Passport</div>
                    <div className="font-medium font-mono">{employee.passport || 'N/A'}</div>
                  </div>
                </div>

                {employee.mobiles && employee.mobiles.length > 1 && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">Additional Contacts</div>
                      <div className="font-medium">{employee.mobiles.slice(1).join(', ')}</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Address Information */}
          {(employee.address1 || employee.address2) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {employee.address1 && (
                  <div>
                    <div className="text-sm text-muted-foreground">Address Line 1</div>
                    <div className="font-medium">{employee.address1}</div>
                  </div>
                )}
                {employee.address2 && (
                  <div>
                    <div className="text-sm text-muted-foreground">Address Line 2</div>
                    <div className="font-medium">{employee.address2}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Employment Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="text-sm text-muted-foreground">Joined Date</div>
                    <div>{formatLongDate(employee.joinedDate)}</div>
                  </div>
                </div>

                {employee.salary && (
                  <div className="flex items-start gap-3">
                    <CircleDollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">Salary</div>
                      <div className=" text-green-600">
                        {formatCurrency(employee.salary)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {employee.description && (
                <div className="pt-4 border-t mt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">Description</div>
                  </div>
                  <p className="text-sm">{employee.description}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}