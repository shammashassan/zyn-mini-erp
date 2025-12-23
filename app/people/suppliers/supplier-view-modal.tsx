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
import type { ISupplier } from "@/models/Supplier";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Building2,
  FileText,
} from "lucide-react";
import { CopyButton } from "@/components/copy-button";

interface SupplierViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: ISupplier | null;
}

export function SupplierViewModal({ 
  isOpen, 
  onClose, 
  supplier,
}: SupplierViewModalProps) {

  if (!supplier) return null;

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Format address from supplier data
  const formatAddress = () => {
    const buildingInfo = supplier.buildingNo ? `Bldg ${supplier.buildingNo}` : null;
    const parts = [
      buildingInfo,
      supplier.street,
      supplier.city,
      supplier.district,
      supplier.postalCode
    ].filter(Boolean);
    return parts.join(', ');
  };

  const fullAddress = formatAddress();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Supplier Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
            {/* Header Card with Avatar and Contact Info */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <Avatar className="h-32 w-32 border-4 border-muted">
                    <AvatarFallback className="text-4xl bg-primary/10 text-primary">
                      {getInitials(supplier.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-center md:text-left space-y-3">
                    <div>
                      {/* Name with Hover-only Copy Button */}
                      <div className="flex items-center justify-center md:justify-start gap-2 group">
                        <h2 className="text-2xl font-bold">{supplier.name}</h2>
                        <CopyButton 
                          textToCopy={supplier.name} 
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                        />
                      </div>
                      <Badge variant="primary" appearance="outline" className="mt-2">
                        Supplier
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm pt-2">
                      {/* Email Section */}
                      <div className="flex items-center gap-2 justify-center md:justify-start">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {supplier.email ? (
                          <div className="flex items-center group">
                            <a 
                              href={`mailto:${supplier.email}`} 
                              className="break-all hover:text-primary hover:underline transition-colors"
                            >
                              {supplier.email}
                            </a>
                            <CopyButton 
                              textToCopy={supplier.email} 
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
                        {supplier.contactNumbers && supplier.contactNumbers.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {supplier.contactNumbers.map((phone, idx) => (
                              <div key={idx} className="flex items-center group">
                                <a 
                                  href={`tel:${phone}`}
                                  className="hover:text-primary hover:underline transition-colors"
                                >
                                  {phone}
                                </a>
                                <CopyButton 
                                  textToCopy={phone} 
                                  className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground h-5 w-5" 
                                />
                              </div>
                            ))}
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
                                <div className={`break-words whitespace-pre-wrap ${!fullAddress ? "italic text-muted-foreground" : "font-medium"}`}>
                                  {fullAddress || "Not provided"}
                                </div>
                                {fullAddress && (
                                  <CopyButton 
                                    textToCopy={fullAddress} 
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground shrink-0 mt-0.5"
                                  />
                                )}
                              </div>
                          </div>
                      </div>
                   </div>

                   {/* VAT Section */}
                   <div className="space-y-3">
                      <div className="flex items-start gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                           <div>
                              <div className="text-sm text-muted-foreground">VAT Number</div>
                              <div className="flex items-center gap-2 group">
                                <div className={`font-mono ${!supplier.vatNumber ? "italic text-muted-foreground font-sans" : "font-medium"}`}>
                                    {supplier.vatNumber || "Not provided"}
                                </div>
                                {supplier.vatNumber && (
                                    <CopyButton 
                                        textToCopy={supplier.vatNumber} 
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