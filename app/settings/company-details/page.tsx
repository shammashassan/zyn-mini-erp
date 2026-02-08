// app/settings/company-details/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Settings, Building2, Globe, Mail,
  Phone, MapPin, FileText, Camera, Wallet
} from "lucide-react";
import { useCompanyDetailsPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageUploader } from "@/components/image-uploader";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";
import { redirect, usePathname } from "next/navigation";


type CompanyDetailsFormData = {
  companyName: string;
  logoUrl?: string;
  website?: string;
  email?: string;
  contactNumber?: string;
  telephone?: string;
  address?: string;
  bankDetails?: string;
};

export default function CompanyDetailsPage() {
  const pathname = usePathname();
  const { register, handleSubmit, reset, watch, formState: { isSubmitting, isDirty } } = useForm<CompanyDetailsFormData>();
  const [isLoading, setIsLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Image Upload State
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [logoBlob, setLogoBlob] = useState<Blob | null>(null);
  const [wasLogoRemoved, setWasLogoRemoved] = useState(false);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null);

  // Safely destructure permissions with defaults to prevent undefined errors
  const {
    permissions: { canRead, canUpdate },
    session,
    isPending
  } = useCompanyDetailsPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchDetails = async () => {
      // Don't run if permissions aren't loaded or user can't read
      if (!isMounted || !canRead) return;

      try {
        const res = await fetch('/api/company-details');
        if (res.ok) {
          const data = await res.json();
          reset(data);
          if (data.logoUrl) {
            setCurrentLogoUrl(data.logoUrl);
          }
        } else {
          toast.error("Failed to load company details.");
        }
      } catch (error) {
        toast.error("An error occurred while loading details.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [isMounted, canRead, reset]);

  const handleImageCropped = (blob: Blob | null) => {
    setLogoBlob(blob);
    if (blob === null && currentLogoUrl) {
      setWasLogoRemoved(true);
    }
  };

  // Helper to convert Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error("Failed to convert blob to string"));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const onSubmit: SubmitHandler<CompanyDetailsFormData> = async (data) => {
    if (!canUpdate) {
      toast.error("You don't have permission to update company details");
      return;
    }

    let finalData = { ...data };

    try {
      if (logoBlob) {
        const base64Logo = await blobToBase64(logoBlob);
        finalData.logoUrl = base64Logo;
        setCurrentLogoUrl(base64Logo);
      } else if (wasLogoRemoved) {
        finalData.logoUrl = "";
        setCurrentLogoUrl(null);
      }
    } catch (error) {
      console.error("Image processing error:", error);
      toast.error("Failed to process image");
      return;
    }

    await toast.promise(
      fetch('/api/company-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalData),
      }).then(async (res) => {
        if (!res.ok) throw new Error("Failed");
        // Cleanup upload state on success
        setLogoBlob(null);
        setWasLogoRemoved(false);
        // Important: Reset form state so isDirty becomes false with new values
        reset(finalData);
        return res;
      }),
      {
        loading: 'Saving details...',
        success: 'Company details saved successfully!',
        error: 'Failed to save details.',
      }
    );
  };

  if (isPending || !isMounted) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!session) {
    redirect(`/login?callbackURL=${encodeURIComponent(pathname)}`);
  }

  if (!canRead) {
    return <AccessDenied />;
  }

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-5xl p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-lg" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="pb-4 border-b bg-muted/20">
            <CardTitle className="text-lg flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-6 w-48" />
            </CardTitle>
            <div className="space-y-1 pt-1">
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="flex flex-col lg:flex-row border-b">
              {/* --- LEFT COLUMN: Visual Identity Skeleton --- */}
              <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r bg-muted/10 p-8 flex flex-col items-center justify-start gap-6">
                <Skeleton className="h-48 w-48 rounded-xl" />
                <div className="text-center w-full px-4 space-y-2 flex flex-col items-center">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>

              {/* --- RIGHT COLUMN: Edit Form Skeleton --- */}
              <div className="flex-1 p-8 space-y-8">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <Skeleton className="h-5 w-40" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* --- BOTTOM SECTION: Address & Legal Skeleton --- */}
            <div className="p-8 space-y-8">
              <Skeleton className="h-5 w-40" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-[100px] w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-[100px] w-full" />
                </div>
              </div>
            </div>
          </CardContent>
          <div className="border-t px-6 py-4 flex justify-between items-center bg-muted/30">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-10 w-32" />
          </div>
        </Card>
      </div>
    );
  }

  // Define hasChanges here to use in the disabled logic
  const hasChanges = isDirty || logoBlob !== null || wasLogoRemoved;

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Settings className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Company Details</h1>
            <p className="text-muted-foreground text-sm">Manage your company branding and invoicing details.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="overflow-hidden">
          <CardHeader className="pb-4 border-b bg-muted/20">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              General Information
            </CardTitle>
            <CardDescription>
              This information will appear on your invoices and documents.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {/* Changed flex-row breakpoint from md (768px) to lg (1024px) to handle tablet sizing better */}
            <div className="flex flex-col lg:flex-row border-b">

              {/* --- LEFT COLUMN: Visual Identity --- */}
              {/* Changed widths and borders to lg breakpoint */}
              <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r bg-muted/10 p-8 flex flex-col items-center justify-start gap-6">
                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => canUpdate && setIsImageModalOpen(true)}
                    disabled={!canUpdate}
                    className={cn(
                      "relative h-48 w-48 rounded-xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 ring-4 ring-background bg-muted/20 flex items-center justify-center", // Removed bg-white
                      !canUpdate && "cursor-not-allowed opacity-80"
                    )}
                  >
                    {currentLogoUrl ? (
                      <img
                        src={currentLogoUrl}
                        alt="Company Logo"
                        // Changed object-contain and removed p-2. Use object-cover to fill frame.
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Building2 className="h-16 w-16 text-muted-foreground/50" />
                    )}

                    {canUpdate && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                        <Camera className="h-8 w-8 mb-2" />
                        <span className="text-xs font-medium">Update Logo</span>
                      </div>
                    )}
                  </button>
                </div>

                <div className="text-center w-full px-4">
                  <h3 className="font-semibold text-lg truncate">
                    {watch("companyName") || "Company Name"}
                  </h3>
                  {watch("website") && (
                    <a
                      href={watch("website")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1 mt-1"
                    >
                      <Globe className="h-3 w-3" />
                      {watch("website")?.replace(/^https?:\/\//, '') ?? ''}
                    </a>
                  )}
                </div>
              </div>

              {/* --- RIGHT COLUMN: Edit Form --- */}
              <div className="flex-1 p-8 space-y-8">

                {/* Identity & Online */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="companyName"
                        className="pl-9"
                        {...register("companyName", { required: true })}
                        disabled={!canUpdate}
                        placeholder="Acme Corp, Inc."
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="website"
                          className="pl-9"
                          placeholder="https://example.com"
                          {...register("website")}
                          disabled={!canUpdate}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          className="pl-9"
                          placeholder="contact@example.com"
                          {...register("email")}
                          disabled={!canUpdate}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <Phone className="h-4 w-4" /> Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactNumber">Contact Number</Label>
                      <Input id="contactNumber" {...register("contactNumber")} disabled={!canUpdate} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telephone">Telephone</Label>
                      <Input id="telephone" {...register("telephone")} disabled={!canUpdate} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* --- BOTTOM SECTION: Address & Legal (Full Width) --- */}
            <div className="p-8 space-y-8">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" /> Location & Legal
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="bankDetails" className="flex items-center gap-2">
                    <Wallet className="h-3 w-3" /> Bank Details
                  </Label>
                  <Textarea
                    id="bankDetails"
                    placeholder="Bank Name, Account No, IFSC..."
                    className="min-h-[100px]"
                    {...register("bankDetails")}
                    disabled={!canUpdate}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    className="min-h-[100px] resize-y"
                    {...register("address")}
                    disabled={!canUpdate}
                  />
                </div>

              </div>
            </div>
          </CardContent>

          {/* Footer */}
          {canUpdate && (
            <div className="border-t px-6 py-4 flex justify-between items-center bg-muted/30">
              <p className="text-xs text-muted-foreground">
                {hasChanges ? "You have unsaved changes" : "All details are up to date"}
              </p>
              <Button type="submit" disabled={isSubmitting || !hasChanges}>
                {isSubmitting ? (
                  <>
                    <Spinner />
                    Saving...
                  </>
                ) : (
                  "Save Details"
                )}
              </Button>
            </div>
          )}
        </Card>
      </form>

      {/* Image Upload Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Update Company Logo
            </DialogTitle>
            <DialogDescription>
              Upload and crop your company logo (Square format recommended)
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <ImageUploader
              initialImageUrl={currentLogoUrl ?? undefined}
              onImageCropped={handleImageCropped}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImageModalOpen(false);
              setLogoBlob(null);
              setWasLogoRemoved(false);
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setIsImageModalOpen(false);
                handleSubmit(onSubmit)();
              }}
              disabled={(!logoBlob && !wasLogoRemoved) || isSubmitting}
            >
              Apply & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}