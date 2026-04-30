// app/settings/account/password-modal.tsx
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Lock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PasswordModal({ isOpen, onClose }: PasswordModalProps) {
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const { register, handleSubmit, reset, watch, formState: { errors, isDirty } } = useForm<PasswordFormData>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }
  });

  const newPassword = watch("newPassword");
  const confirmPassword = watch("confirmPassword");

  const getPasswordStrength = (password: string) => {
    if (!password) return null;
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    const percentage = (strength / 5) * 100;

    if (strength <= 2) return { 
      level: "weak", 
      color: "text-red-600", 
      label: "Weak",
      percentage,
    };
    if (strength <= 3) return { 
      level: "medium", 
      color: "text-yellow-600", 
      label: "Medium",
      percentage,
    };
    return { 
      level: "strong", 
      color: "text-green-600", 
      label: "Strong",
      percentage,
    };
  };

  const passwordStrength = getPasswordStrength(newPassword);
  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const passwordsDontMatch = newPassword && confirmPassword && newPassword !== confirmPassword;

  const onSubmit = async (data: PasswordFormData) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (data.newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }
    
    setIsUpdating(true);
    setShowSuccess(false);
    
    try {
      const { error } = await authClient.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        revokeOtherSessions: true,
      });

      if (error) {
        if (error.message?.includes("Invalid password") || error.message?.includes("password")) {
          toast.error("Current password is incorrect. Please try again.");
        } else {
          toast.error(error.message || "Failed to update password. Please try again.");
        }
        return;
      }

      setShowSuccess(true);
      toast.success("Password updated successfully!");
      reset();
      
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
      
    } catch (error: any) {
      console.error("Password update error:", error);
      toast.error("Failed to update password. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto sidebar-scroll">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </DialogTitle>
          <DialogDescription>
            Update your password to keep your account secure
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          {/* Success Alert */}
          {showSuccess && (
            <Alert className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Your password has been updated successfully.
              </AlertDescription>
            </Alert>
          )}

          {/* Current Password */}
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              {...register("currentPassword", { required: "Current password is required" })}
              placeholder="Enter your current password"
            />
            {errors.currentPassword && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {errors.currentPassword.message}
              </p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              {...register("newPassword", {
                required: "New password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters"
                }
              })}
              placeholder="Enter new password"
            />
            {errors.newPassword && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {errors.newPassword.message}
              </p>
            )}
            {passwordStrength && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className={`text-xs font-medium ${passwordStrength.color}`}>
                    Strength: {passwordStrength.label}
                  </p>
                </div>
                <Progress 
                  value={passwordStrength.percentage} 
                  className={cn(
                    "h-2",
                    passwordStrength.level === "weak" && "[&>[data-slot=progress-indicator]]:bg-red-600",
                    passwordStrength.level === "medium" && "[&>[data-slot=progress-indicator]]:bg-yellow-600",
                    passwordStrength.level === "strong" && "[&>[data-slot=progress-indicator]]:bg-green-600"
                  )}
                />
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword", { required: "Please confirm your new password" })}
              placeholder="Confirm new password"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {errors.confirmPassword.message}
              </p>
            )}
            {passwordsMatch && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                Passwords match
              </p>
            )}
            {passwordsDontMatch && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                Passwords do not match
              </p>
            )}
          </div>

          {/* Password Requirements */}
          <div className="bg-muted/30 p-3 rounded-lg space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              Requirements
            </p>
            <ul className="text-xs text-muted-foreground space-y-1 ml-6">
              <li className="flex items-center gap-2">
                <span className={newPassword?.length >= 8 ? "text-green-600" : ""}>
                  {newPassword?.length >= 8 ? "✓" : "•"}
                </span>
                At least 8 characters
              </li>
              <li className="flex items-center gap-2">
                <span className={/[A-Z]/.test(newPassword || "") ? "text-green-600" : ""}>
                  {/[A-Z]/.test(newPassword || "") ? "✓" : "•"}
                </span>
                Uppercase letter
              </li>
              <li className="flex items-center gap-2">
                <span className={/[a-z]/.test(newPassword || "") ? "text-green-600" : ""}>
                  {/[a-z]/.test(newPassword || "") ? "✓" : "•"}
                </span>
                Lowercase letter
              </li>
              <li className="flex items-center gap-2">
                <span className={/\d/.test(newPassword || "") ? "text-green-600" : ""}>
                  {/\d/.test(newPassword || "") ? "✓" : "•"}
                </span>
                Number
              </li>
              <li className="flex items-center gap-2">
                <span className={/[^a-zA-Z0-9]/.test(newPassword || "") ? "text-green-600" : ""}>
                  {/[^a-zA-Z0-9]/.test(newPassword || "") ? "✓" : "•"}
                </span>
                Special character
              </li>
            </ul>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating || !isDirty || !!passwordsDontMatch}>
              {isUpdating ? (
                <>
                  <Spinner/>
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}