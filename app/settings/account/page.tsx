// app/settings/account/page.tsx
"use client";

import { redirect } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { getUserInfo } from "@/lib/auth-helpers";
import { ProfileSection } from "./profile-section";
import { PasswordModal } from "./password-modal";
import { SessionsModal } from "./sessions-modal";
import { DeleteAccountModal } from "./delete-account-modal";
import { Settings, Lock, Monitor, Trash2, UserCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAccountPermissions } from "@/hooks/use-permissions";
import { Spinner } from "@/components/ui/spinner";
import { AccessDenied } from "@/components/access-denied";

export default function AccountPage() {
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSessionsModalOpen, setIsSessionsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();

  const {
    permissions: { canRead },
    isPending,
    session
  } = useAccountPermissions();

  useState(() => {
    setIsMounted(true);
  });

  if (!isMounted || isPending) {
    return (
      <div className="flex flex-1 items-center justify-center min-h-screen">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!session) {
    redirect('/login');
  }

  if (!canRead) {
    return <AccessDenied />;
  }

  return (
    <div className="container mx-auto max-w-[95vw] lg:max-w-6xl p-4 md:p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <UserCog className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage your account information and security preferences
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <ProfileSection />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Change Password Card */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setIsPasswordModalOpen(true)}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Change Password</h3>
                  <p className="text-sm text-muted-foreground">Update your password</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Sessions Card */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setIsSessionsModalOpen(true)}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Monitor className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Active Sessions</h3>
                  <p className="text-sm text-muted-foreground">Manage your devices</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Delete Account Card */}
          <Card className="cursor-pointer hover:shadow-md transition-shadow md:col-span-2"
            onClick={() => setIsDeleteModalOpen(true)}>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-600 dark:text-red-400">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">Permanently delete your account</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <PasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
      <SessionsModal isOpen={isSessionsModalOpen} onClose={() => setIsSessionsModalOpen(false)} />
      <DeleteAccountModal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} />
    </div>
  );
}