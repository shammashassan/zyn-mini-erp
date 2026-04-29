"use client";

import * as React from "react";
import { useForm, SubmitHandler, FieldErrors } from "react-hook-form";
import { EyeIcon, EyeOffIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// Removed Switch import as it is no longer used
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { ImageUploader } from "@/components/image-uploader";
import { authClient } from "@/lib/auth-client";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

// Better Auth User type
interface BetterAuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
  username?: string;
  role?: string;
  banned?: boolean;
  banReason?: string | null;
  banExpires?: Date | null;
}

type UserFormData = {
  name: string;
  email: string;
  password?: string;
  username?: string;
  role: string;
  emailVerified: boolean;
};

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any, avatarBlob: Blob | null, wasAvatarRemoved: boolean) => Promise<void>;
  defaultValues?: BetterAuthUser | null;
  currentUserRole?: string;
}

export function UserForm({ isOpen, onClose, onSubmit, defaultValues, currentUserRole }: UserFormProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { isSubmitting, errors, isDirty } } = useForm<UserFormData>();

  const [avatarBlob, setAvatarBlob] = React.useState<Blob | null>(null);
  const [wasAvatarRemoved, setWasAvatarRemoved] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = React.useState(false);
  const [usernameAvailable, setUsernameAvailable] = React.useState<boolean | null>(null);

  const watchedRole = watch("role");
  const watchedUsername = watch("username");

  const isEditing = !!defaultValues?.id;

  React.useEffect(() => {
    if (isOpen) {
      if (defaultValues) { // Editing mode
        reset({
          name: defaultValues.name || "",
          email: defaultValues.email || "",
          password: "", // Always start with an empty password field
          username: defaultValues.username || "",
          role: defaultValues.role || "user",
          emailVerified: defaultValues.emailVerified || false,
        });
      } else { // Creating mode
        reset({
          name: "",
          email: "",
          password: "",
          username: "",
          role: "user",
          emailVerified: false,
        });
      }

      setAvatarBlob(null);
      setWasAvatarRemoved(false);
      setShowPassword(false);
      setUsernameAvailable(null);
    }
  }, [isOpen, defaultValues, reset]);

  React.useEffect(() => {
    const checkUsername = async () => {
      if (!watchedUsername || watchedUsername.length < 3) {
        setUsernameAvailable(null);
        return;
      }
      if (isEditing && watchedUsername === defaultValues?.username) {
        setUsernameAvailable(true);
        return;
      }
      setIsCheckingUsername(true);
      try {
        const response = await authClient.isUsernameAvailable({ username: watchedUsername });
        setUsernameAvailable(response.data?.available || false);
      } catch (error) {
        setUsernameAvailable(null);
      } finally {
        setIsCheckingUsername(false);
      }
    };
    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedUsername, isEditing, defaultValues?.username]);

  const handleImageCropped = (blob: Blob | null) => {
    setAvatarBlob(blob);
    if (blob === null && defaultValues?.image) {
      setWasAvatarRemoved(true);
    }
  };

  const handleFormSubmit: SubmitHandler<UserFormData> = async (data) => {
    if (data.username && (isEditing ? data.username !== defaultValues?.username : true) && !usernameAvailable) {
      toast.error("Username is not available.");
      return;
    }

    const submissionData = {
      ...data,
      ...(isEditing && data.password && { newPassword: data.password }),
    };

    await onSubmit(submissionData, avatarBlob, wasAvatarRemoved);
  };

  const onInvalid = (errors: FieldErrors<UserFormData>) => {
    if (errors.name) {
      toast.error(errors.name.message || "Name is required");
    } else if (errors.email) {
      toast.error(errors.email.message || "Email is required");
    } else if (errors.password && !isEditing) {
      toast.error(errors.password.message || "Password is required");
    } else if (errors.username) {
      toast.error(errors.username.message || "Username is invalid");
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const getUsernameStatus = () => {
    if (!watchedUsername || watchedUsername.length < 3) return null;
    if (isEditing && watchedUsername === defaultValues?.username) return { type: "current", message: "Current username" };
    if (isCheckingUsername) return { type: "checking", message: "Checking..." };
    if (usernameAvailable === true) return { type: "available", message: "Available" };
    if (usernameAvailable === false) return { type: "unavailable", message: "Not available" };
    return null;
  };

  const usernameStatus = getUsernameStatus();
  const hasChanges = isDirty || avatarBlob !== null || wasAvatarRemoved;

  // Check if current user can assign a specific role
  const canAssignRole = (role: string) => {
    // Owner can assign any role
    if (currentUserRole === "owner") return true;

    // Admin cannot assign owner or admin roles
    if (currentUserRole === "admin") {
      return role !== "owner" && role !== "admin";
    }

    // Others can't assign any roles
    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] lg:max-w-3xl max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isEditing ? "Edit User" : "Add New User"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update the user details below." : "Fill in the details for the new user."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-1">
          <form onSubmit={handleSubmit(handleFormSubmit, onInvalid)} className="space-y-4 py-2" autoComplete="off">
            <div className="flex justify-center">
              <ImageUploader
                initialImageUrl={defaultValues?.image}
                onImageCropped={handleImageCropped}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  autoComplete="off"
                  {...register("name", { required: "Name is required" })}
                  className={cn(errors.name && "border-destructive")}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="off"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Please enter a valid email address"
                    }
                  })}
                  className={cn(errors.email && "border-destructive")}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                {isEditing && (
                  <p className="text-xs text-muted-foreground">
                    Email can be changed for existing users
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  autoComplete="off"
                  {...register("username", {
                    minLength: { value: 3, message: "Username must be at least 3 characters" },
                    maxLength: { value: 30, message: "Username must be less than 30 characters" },
                    pattern: {
                      value: /^[a-zA-Z0-9_.]+$/,
                      message: "Username can only contain letters, numbers, dots, and underscores"
                    }
                  })}
                  className={cn(errors.username && "border-destructive")}
                />
                {errors.username && <p className="text-xs text-destructive">{errors.username.message}</p>}
                {usernameStatus && (
                  <p className={cn("text-xs", {
                    "text-green-600": usernameStatus.type === "available",
                    "text-destructive": usernameStatus.type === "unavailable",
                    "text-muted-foreground": usernameStatus.type === "checking" || usernameStatus.type === "current"
                  })}>
                    {usernameStatus.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={watchedRole} onValueChange={(value) => setValue("role", value, { shouldDirty: true })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem
                      value="admin"
                      disabled={!canAssignRole("admin")}
                    >
                      Admin {!canAssignRole("admin") && "(Owner only)"}
                    </SelectItem>
                    <SelectItem
                      value="owner"
                      disabled={!canAssignRole("owner")}
                    >
                      Owner {!canAssignRole("owner") && "(Owner only)"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                {isEditing ? "Set New Password" : "Password *"}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  data-form-type="other"
                  {...register("password", {
                    required: !isEditing ? "Password is required" : false,
                    minLength: { value: 8, message: "Password must be at least 8 characters" }
                  })}
                  placeholder={isEditing ? "Leave blank to keep current password" : "Enter password (min 8 characters)"}
                  className={cn(errors.password && "border-destructive")}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </Button>
              </div>
              {errors.password && !isEditing && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <DialogFooter className="pt-4 sticky bottom-0 bg-background/95 backdrop-blur-sm border-t mt-6">
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={isSubmitting || (!!watchedUsername && usernameAvailable === false) || (isEditing && !hasChanges)}
              >
                {isSubmitting ? (
                  <>
                    <Spinner />
                    Saving...
                  </>
                ) : isEditing ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}