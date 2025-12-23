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
import type { ICustomer } from "@/models/Customer";
import { 
  Mail, 
  Phone, 
  MapPin, 
  User
} from "lucide-react";
import { CopyButton } from "@/components/copy-button";

interface CustomerViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: ICustomer | null;
}

export function CustomerViewModal({ 
  isOpen, 
  onClose, 
  customer,
}: CustomerViewModalProps) {

  if (!customer) return null;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Customer Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
            {/* Header Card with Avatar and Contact Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <Avatar className="h-32 w-32 border-4 border-muted">
                    <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                      {getInitials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center md:text-left space-y-3">
                    <div>
                      <div className="flex items-center justify-center md:justify-start gap-2 group">
                        <h2 className="text-2xl font-bold">{customer.name}</h2>
                        <CopyButton 
                          textToCopy={customer.name} 
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                        />
                      </div>
                      <Badge variant="primary" appearance="outline" className="mt-2">
                        Customer
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
                      {/* Email Section */}
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {customer.email ? (
                          <div className="flex items-center group">
                            <a 
                              href={`mailto:${customer.email}`}
                              className="break-all hover:text-primary hover:underline transition-colors"
                            >
                              {customer.email}
                            </a>
                            <CopyButton 
                              textToCopy={customer.email} 
                              className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" 
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Not provided</span>
                        )}
                      </div>

                      {/* Phone Section */}
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {customer.phone ? (
                          <div className="flex items-center group">
                            <a 
                              href={`tel:${customer.phone}`}
                              className="hover:text-primary hover:underline transition-colors"
                            >
                              {customer.phone}
                            </a>
                            <CopyButton 
                              textToCopy={customer.phone} 
                              className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" 
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground italic">Not provided</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Address Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 group">
                    <div className="text-sm text-muted-foreground">Address</div>
                    <div className="flex items-start gap-2">
                      <div className={`break-words whitespace-pre-wrap ${!customer.address ? "italic text-muted-foreground" : "font-medium"}`}>
                        {customer.address || "Not provided"}
                      </div>
                      {customer.address && (
                        <CopyButton 
                          textToCopy={customer.address} 
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                        />
                      )}
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