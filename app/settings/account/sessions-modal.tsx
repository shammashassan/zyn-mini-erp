// app/settings/account/sessions-modal.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  LogOut, 
  MapPin, 
  Calendar,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { formatDateTime } from "@/utils/formatters/date";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import type { SessionWithDevice } from "@/lib/types";
import { Spinner } from "@/components/ui/spinner";

interface SessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SessionsModal({ isOpen, onClose }: SessionsModalProps) {
  const [sessions, setSessions] = React.useState<SessionWithDevice[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isRevoking, setIsRevoking] = React.useState<string | null>(null);
  const [showRevokeAll, setShowRevokeAll] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      fetchSessions();
    }
  }, [isOpen]);

  const fetchSessions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sessions');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch sessions');
      }

      setSessions(data.sessions || []);
    } catch (error: any) {
      console.error('Error fetching sessions:', error);
      toast.error('Failed to load sessions', {
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionToken: string) => {
    try {
      setIsRevoking(sessionToken);
      const response = await fetch(`/api/sessions?token=${sessionToken}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke session');
      }

      toast.success('Session revoked successfully');
      await fetchSessions();
    } catch (error: any) {
      console.error('Error revoking session:', error);
      toast.error('Failed to revoke session', {
        description: error.message
      });
    } finally {
      setIsRevoking(null);
    }
  };

  const handleRevokeAllOther = async () => {
    try {
      setIsRevoking('all');
      const response = await fetch('/api/sessions?all=true', {
        method: 'DELETE',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke sessions');
      }

      toast.success('All other sessions revoked successfully');
      setShowRevokeAll(false);
      await fetchSessions();
    } catch (error: any) {
      console.error('Error revoking sessions:', error);
      toast.error('Failed to revoke sessions', {
        description: error.message
      });
    } finally {
      setIsRevoking(null);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const activeSessions = sessions.filter(s => !s.isCurrent);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5" />
              Active Sessions
            </DialogTitle>
            <DialogDescription>
              Manage devices where you're signed in
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {isLoading ? (
              <>
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-3 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                  </div>
                ))}
              </>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Monitor className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No active sessions found</p>
              </div>
            ) : (
              <>
                {/* Current Session */}
                {sessions.filter(s => s.isCurrent).map((session) => (
                  <div 
                    key={session.id}
                    className="flex items-start gap-3 p-3 border-2 border-primary rounded-lg bg-primary/5"
                  >
                    <div className="p-2 bg-primary/10 rounded-lg">
                      {getDeviceIcon(session.deviceType || 'desktop')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm">
                          {session.deviceName || 'This Device'}
                        </h4>
                        <Badge variant="success" appearance="outline" className="text-xs">
                          Current
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.ipAddress || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(session.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Other Sessions */}
                {activeSessions.map((session) => (
                  <div 
                    key={session.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="p-2 bg-muted rounded-lg">
                      {getDeviceIcon(session.deviceType || 'desktop')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1">
                        {session.deviceName || 'Unknown Device'}
                      </h4>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {session.ipAddress || 'Unknown'}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDateTime(session.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRevokeSession(session.token)}
                      disabled={isRevoking === session.token}
                    >
                      {isRevoking === session.token ? (
                        <Spinner/>
                      ) : (
                        <LogOut className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </>
            )}
          </div>

          <DialogFooter>
            {!isLoading && activeSessions.length > 0 && (
              <div className="w-full">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowRevokeAll(true)}
                  disabled={isRevoking === 'all'}
                  className="w-full"
                >
                  {isRevoking === 'all' ? (
                    <>
                      <Spinner/>
                      Revoking...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Sign Out All Other Devices
                    </>
                  )}
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRevokeAll} onOpenChange={setShowRevokeAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out all other devices?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign you out from all devices except this one. You'll need to sign in again on those devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAllOther}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sign Out All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}