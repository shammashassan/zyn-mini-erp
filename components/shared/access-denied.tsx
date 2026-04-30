// components/access-denied.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface AccessDeniedProps {
  /**
   * The title to display
   * @default "Access Denied"
   */
  title?: string;

  /**
   * The description to display
   * @default "You don't have permission to access this page."
   */
  description?: string;

  /**
   * The icon to display
   * @default ShieldAlert
   */
  icon?: React.ComponentType<{ className?: string }>;

  /**
   * Whether to show the go back button
   * @default true
   */
  showBackButton?: boolean;

  /**
   * Custom action button
   */
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function AccessDenied({
  title = "Access Denied",
  description = "You don't have permission to access this page.",
  icon: Icon = ShieldAlert,
  showBackButton = true,
  action,
}: AccessDeniedProps) {
  const router = useRouter();

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 relative">
            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center max-w-2xl">
              {/* Animated icon container */}
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-destructive/20 rounded-full blur-2xl animate-pulse" />
                <div className="relative p-8 bg-linear-to-br from-destructive/10 to-destructive/5 rounded-full border-2 border-destructive/20">
                  <Icon className="h-12 w-12 text-destructive" />
                </div>
              </div>

              {/* Text content */}
              <div className="space-y-4 mb-10">
                <h2 className="text-4xl font-bold tracking-tight bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {title}
                </h2>
                <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
                  {description}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                {showBackButton && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => router.push("/")}
                    className="gap-2 min-w-[140px]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Go back Home
                  </Button>
                )}
                {action && (
                  <Button
                    size="lg"
                    onClick={action.onClick}
                    className="min-w-[140px]"
                  >
                    {action.label}
                  </Button>
                )}
              </div>

              {/* Helper text */}
              <p className="text-xs text-muted-foreground mt-8 max-w-md">
                If you believe this is an error, please contact your system administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}