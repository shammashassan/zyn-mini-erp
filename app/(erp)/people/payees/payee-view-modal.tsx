"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { IPayee } from "@/models/Payee";
import {
  Mail,
  Phone,
  MapPin,
  User,
  FileText,
  Home,
  UserCheck,
  Utensils,
  Briefcase,
  Boxes
} from "lucide-react";
import { CopyButton } from "@/components/shared/copy-button";

interface PayeeViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  payee: IPayee | null;
}

export function PayeeViewModal({
  isOpen,
  onClose,
  payee,
}: PayeeViewModalProps) {

  if (!payee) return null;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const formatType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      employee: 'blue',
      landlord: 'purple',
      consultant: 'cyan',
      restaurant: 'orange',
      vendor: 'green',
      contractor: 'pink',
      utility_company: 'yellow',
      service_provider: 'indigo',
      government: 'red',
      individual: 'secondary',
      miscellaneous: 'gray'
    };
    return colors[type] || 'secondary';
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, any> = {
      employee: User,
      landlord: Home,
      consultant: UserCheck,
      restaurant: Utensils,
      vendor: Briefcase,
      contractor: UserCheck,
      utility_company: Boxes,
      service_provider: Briefcase,
      government: Briefcase,
      individual: User,
      miscellaneous: Boxes
    };
    return icons[type] || User;
  };

  const TypeIcon = getTypeIcon(payee.type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Payee Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Card with Avatar and Contact Info */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                <Avatar className="h-32 w-32 border-4 border-muted">
                  <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                    {getInitials(payee.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-center md:text-left space-y-3">
                  <div>
                    {/* Name with Hover-only Copy Button */}
                    <div className="flex items-center justify-center md:justify-start gap-2 group">
                      <h2 className="text-2xl font-bold">{payee.name}</h2>
                      <CopyButton
                        textToCopy={payee.name}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      />
                    </div>
                    <Badge
                      variant={getTypeColor(payee.type) as any}
                      appearance="outline"
                      className="mt-2 gap-1"
                    >
                      <TypeIcon className="h-3 w-3" />
                      {formatType(payee.type)}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
                    {/* Email Section */}
                    <div className="flex items-center gap-2 justify-center md:justify-start">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      {payee.email ? (
                        <div className="flex items-center group">
                          <a
                            href={`mailto:${payee.email}`}
                            className="break-all hover:text-primary hover:underline transition-colors"
                          >
                            {payee.email}
                          </a>
                          <CopyButton
                            textToCopy={payee.email}
                            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Not provided</span>
                      )}
                    </div>

                    {/* Phone Section */}
                    <div className="flex items-start gap-2 justify-center md:justify-start">
                      <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                      {payee.phone ? (
                        <div className="flex items-center group">
                          <a
                            href={`tel:${payee.phone}`}
                            className="hover:text-primary hover:underline transition-colors"
                          >
                            {payee.phone}
                          </a>
                          <CopyButton
                            textToCopy={payee.phone}
                            className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-5 w-5"
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic mt-0.5">Not provided</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address & Legal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Address & Legal Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Address Section */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 group">
                      <div className="text-sm text-muted-foreground">Address</div>
                      <div className="flex items-start gap-2">
                        <div className={`wrap-break-word whitespace-pre-wrap ${!payee.address ? "italic text-muted-foreground" : "font-medium"}`}>
                          {payee.address || "Not provided"}
                        </div>
                        {payee.address && (
                          <CopyButton
                            textToCopy={payee.address}
                            className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* VAT/Tax ID Section */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <div className="text-sm text-muted-foreground">Tax ID / Business Reg.</div>
                      <div className="flex items-center gap-2 group">
                        <div className={`font-mono ${!payee.taxId ? "italic text-muted-foreground font-sans" : "font-medium"}`}>
                          {payee.taxId || "Not provided"}
                        </div>
                        {payee.taxId && (
                          <CopyButton
                            textToCopy={payee.taxId}
                            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}