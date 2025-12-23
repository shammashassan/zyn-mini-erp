// app/settings/account/profile-section.tsx
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { 
  User, Mail, AtSign, Calendar, 
  CheckCircle2, XCircle, Loader2, Camera, 
  Hash, Clock, Shield, Crown, Briefcase // Added missing icons
} from "lucide-react";
import { formatDateTime, formatLongDate } from "@/utils/formatters/date";
import { ImageUploader } from "@/components/image-uploader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";

interface ProfileFormData {
  name: string;
  email: string;
  username?: string;
}

export function ProfileSection() {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [avatarBlob, setAvatarBlob] = React.useState<Blob | null>(null);
  const [wasAvatarRemoved, setWasAvatarRemoved] = React.useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = React.useState(false);
  const [usernameAvailable, setUsernameAvailable] = React.useState<boolean | null>(null);
  const [isImageModalOpen, setIsImageModalOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  const { data: session } = authClient.useSession();

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<ProfileFormData>();

  const watchedUsername = watch("username");

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  React.useEffect(() => {
    if (session?.user) {
      reset({
        name: session.user.name || "",
        email: session.user.email || "",
        username: session.user.username || "",
      });
    }
  }, [session?.user, reset]);

  React.useEffect(() => {
    const checkUsername = async () => {
      if (!watchedUsername || watchedUsername.length < 3) {
        setUsernameAvailable(null);
        return;
      }

      if (watchedUsername === session?.user?.username) {
        setUsernameAvailable(true);
        return;
      }

      setIsCheckingUsername(true);
      try {
        const response = await authClient.isUsernameAvailable({
          username: watchedUsername
        });
        setUsernameAvailable(response.data?.available || false);
      } catch (error) {
        console.error("Error checking username availability:", error);
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedUsername, session?.user?.username]);

  const handleImageCropped = (blob: Blob | null) => {
    setAvatarBlob(blob);
    if (blob === null && session?.user?.image) {
      setWasAvatarRemoved(true);
    }
  };

  const getUsernameStatus = () => {
    if (!watchedUsername || watchedUsername.length < 3) {
      return null;
    }
    if (watchedUsername === session?.user?.username) {
      return { type: "current", message: "Current username", icon: CheckCircle2 };
    }
    if (isCheckingUsername) {
      return { type: "checking", message: "Checking...", icon: Loader2 };
    }
    if (usernameAvailable === true) {
      return { type: "available", message: "Available", icon: CheckCircle2 };
    }
    if (usernameAvailable === false) {
      return { type: "unavailable", message: "Not available", icon: XCircle };
    }
    return null;
  };
  
  // Helper for Role Badge Variant & Icon
  const getRoleConfig = (role: string | null | undefined) => {
    const r = (role || "user").toLowerCase();
    switch (r) {
      case "owner":
        return { variant: "info", icon: Crown };
      case "admin":
        return { variant: "primary", icon: Shield };
      case "manager":
        return { variant: "warning", icon: Briefcase };
      case "user":
      default:
        return { variant: "success", icon: User };
    }
  };

  const onSubmit = async (data: ProfileFormData) => {
    if (data.username && data.username !== session?.user?.username && usernameAvailable === false) {
      toast.error("Username is not available.");
      return;
    }

    setIsUpdating(true);

    try {
      // --- PART A: Handle Image Upload ---
      let imageUrl: string | null = session?.user?.image || null;

      if (avatarBlob) {
        const formData = new FormData();
        const filename = `${Date.now()}-avatar.jpeg`;
        formData.append('file', avatarBlob, filename);

        try {
          const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok || !uploadData.success) throw new Error(uploadData.error || 'Image upload failed.');
          imageUrl = uploadData.url;
        } catch (error: any) {
          toast.error("Image Upload Failed", { description: error.message });
          setIsUpdating(false);
          return;
        }
      } else if (wasAvatarRemoved) {
        imageUrl = null;
      }

      // --- PART B: Update Basic Profile ---
      const updateData: any = {
        name: data.name,
        username: data.username?.trim() || undefined,
      };

      if (avatarBlob || wasAvatarRemoved) {
        updateData.image = imageUrl;
      }

      const { error: updateError } = await authClient.updateUser(updateData);
      if (updateError) throw new Error(updateError.message || "Failed to update profile.");

      // --- PART C: Handle Email Change ---
      if (data.email && data.email !== session?.user?.email) {
        const { error: emailError } = await authClient.changeEmail({
          newEmail: data.email,
          callbackURL: "/settings/account",
        });
        if (emailError) {
          toast.warning("Profile updated, but email change failed: " + emailError.message);
        } else {
          toast.success("Profile and Email updated successfully!");
        }
      } else {
        toast.success("Profile updated successfully!");
      }

      setAvatarBlob(null);
      setWasAvatarRemoved(false);
      setIsImageModalOpen(false);
      router.refresh();

    } catch (error: any) {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  const usernameStatus = getUsernameStatus();
  const hasChanges = isDirty || avatarBlob !== null || wasAvatarRemoved;
  const canSubmit = hasChanges && (!watchedUsername || usernameAvailable !== false);
  const displayName = isMounted && session?.user?.name ? session.user.name.substring(0, 2).toUpperCase() : "U";

  // Get configuration for role badge
  const roleConfig = getRoleConfig(session?.user?.role);
  const RoleIcon = roleConfig.icon;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)}>
        <Card className="overflow-hidden">
          <CardHeader className="pb-4 border-b bg-muted/20">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Details
            </CardTitle>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="flex flex-col md:flex-row">
              
              {/* --- LEFT COLUMN: Visual Identity --- */}
              <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r bg-muted/10 p-8 flex flex-col items-center justify-start gap-6">
                {isMounted && (
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => setIsImageModalOpen(true)}
                      className="relative rounded-full overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 ring-4 ring-background"
                    >
                      <Avatar className="h-40 w-40 cursor-pointer">
                        <AvatarImage src={session?.user?.image || undefined} className="object-cover" />
                        <AvatarFallback className="text-4xl font-bold bg-gradient-to-br from-blue-600 to-purple-600 text-white">
                          {displayName}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                        <Camera className="h-8 w-8 mb-2" />
                        <span className="text-xs font-medium">Change Photo</span>
                      </div>
                    </button>
                  </div>
                )}

                <div className="text-center space-y-2 w-full">
                  <div className="flex flex-col items-center gap-2">
                     {/* Role Badge with Icons */}
                     <Badge 
                        variant={roleConfig.variant as any} 
                        appearance="outline"
                        className="uppercase tracking-wider text-[10px] flex items-center gap-1.5 px-2.5 py-0.5"
                     >
                        <RoleIcon className="h-3 w-3" />
                        {session?.user?.role || "USER"}
                     </Badge>

                     {session?.user?.createdAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          Joined {formatLongDate(session.user.createdAt)}
                        </p>
                      )}
                  </div>
                </div>
              </div>

              {/* --- RIGHT COLUMN: Edit Form --- */}
              <div className="flex-1 p-8 space-y-6">
                <div className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        className="pl-9 bg-background"
                        {...register("name", {
                          required: "Name is required",
                          validate: value => value.trim() !== "" || "Name cannot be empty"
                        })}
                        placeholder="Your full name"
                      />
                    </div>
                    {errors.name && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-9 bg-background"
                        {...register("email", {
                          required: "Email is required",
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: "Please enter a valid email address"
                          }
                        })}
                        placeholder="your@email.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  {/* Username */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="username">Username</Label>
                      {usernameStatus && (
                        <span className={cn(
                          "text-xs flex items-center gap-1",
                          usernameStatus.type === "available" && "text-green-600 font-medium",
                          usernameStatus.type === "unavailable" && "text-destructive font-medium",
                          usernameStatus.type === "checking" && "text-muted-foreground",
                          usernameStatus.type === "current" && "text-muted-foreground"
                        )}>
                          <usernameStatus.icon className={cn("h-3 w-3", usernameStatus.type === "checking" && "animate-spin")} />
                          {usernameStatus.message}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <AtSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="username"
                        className="pl-9 bg-background"
                        {...register("username", {
                          minLength: { value: 3, message: "Min 3 chars" },
                          maxLength: { value: 30, message: "Max 30 chars" },
                          pattern: {
                            value: /^[a-zA-Z0-9_.]+$/,
                            message: "Letters, numbers, dots, and underscores only"
                          }
                        })}
                        placeholder="username"
                      />
                    </div>
                    {errors.username && (
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <XCircle className="h-3 w-3" />
                        {errors.username.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Technical Footnotes */}
                {isMounted && session?.user && (
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-6 border-t mt-6">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Hash className="h-3.5 w-3.5" />
                        <span className="font-mono truncate max-w-[150px]" title={session.user.id}>ID: {session.user.id}</span>
                      </div>
                      {session.user.updatedAt && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5" />
                          <span>Updated: {formatDateTime(session.user.updatedAt)}</span>
                        </div>
                      )}
                   </div>
                )}
              </div>
            </div>
          </CardContent>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex justify-between items-center bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {hasChanges ? "You have unsaved changes" : "Your profile is up to date"}
            </p>
            <Button type="submit" disabled={isUpdating || !canSubmit}>
              {isUpdating ? (
                <>
                  <Spinner/>
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </Card>
      </form>

      {/* Image Upload Modal */}
      <Dialog open={isImageModalOpen} onOpenChange={setIsImageModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Update Profile Picture
            </DialogTitle>
            <DialogDescription>
              Upload and crop your profile picture
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <ImageUploader
              initialImageUrl={session?.user?.image || null}
              onImageCropped={handleImageCropped}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsImageModalOpen(false);
              setAvatarBlob(null);
              setWasAvatarRemoved(false);
            }}>
              Cancel
            </Button>
            <Button onClick={() => {
              setIsImageModalOpen(false);
              handleSubmit(onSubmit)();
            }} disabled={(!avatarBlob && !wasAvatarRemoved) || isUpdating}>
               {isUpdating ? (
                <>
                  <Spinner/>
                  Saving...
                </>
              ) : (
                "Apply & Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}