"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Trash2, 
  AlertTriangle, 
  ShieldAlert
} from "lucide-react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
// CHANGE 1: Import 'signOut' wrapper alongside 'authClient'
import { authClient, signOut } from "@/lib/auth-client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [password, setPassword] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleDeleteAccount = async () => {
    if (!password) {
      toast.error("Password is required to delete your account");
      return;
    }

    try {
      setIsDeleting(true);

      const { error } = await authClient.deleteUser({
        password: password,
      });

      if (error) {
        throw new Error(error.message || "Failed to delete account");
      }

      toast.success("Account deleted successfully", {
        description: "You will be redirected to the home page"
      });

      // CHANGE 2: Use the wrapper to ensure proxy cookie is cleared
      await signOut();
      
      setTimeout(() => {
        router.push('/');
      }, 1500);

    } catch (error: any) {
      console.error("Delete account error:", error);
      toast.error("Failed to delete account", {
        description: error.message
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
      setPassword("");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Account
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                <strong>Warning:</strong> This will permanently delete your account and remove all associated data.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold">Before you delete:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>All your data will be permanently deleted</li>
                <li>You will be logged out immediately</li>
                <li>This action cannot be reversed</li>
                <li>You'll need a new account to use the service again</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account and all associated data. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="delete-password">
                Enter your password to confirm
              </Label>
              <Input
                id="delete-password"
                type="password"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Type your password and click "Delete Account" to permanently delete your account.
              </AlertDescription>
            </Alert>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setPassword("");
              setShowDeleteDialog(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={!password || isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Spinner/>
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}