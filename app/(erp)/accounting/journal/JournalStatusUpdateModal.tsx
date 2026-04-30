// app/accounting/journal/JournalStatusUpdateModal.tsx
// Status update modal for journal entries - only allows posting draft entries

"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { IJournal } from "./columns";
import { Spinner } from "@/components/ui/spinner";
import { FileCheck, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface JournalStatusUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal: IJournal;
  onRefresh: () => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'posted': return 'success';
    case 'draft': return 'warning';
    case 'void': return 'destructive';
    default: return 'secondary';
  }
};

export function JournalStatusUpdateModal({
  isOpen,
  onClose,
  journal,
  onRefresh
}: JournalStatusUpdateModalProps) {
  const [initialStatus, setInitialStatus] = useState(journal.status);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setInitialStatus(journal.status);
    }
  }, [isOpen, journal.status]);

  const handlePostEntry = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/journal/${journal._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'posted' }),
      });

      if (res.ok) {
        toast.success('Journal entry posted successfully', {
          description: 'The entry is now part of your financial records',
        });
        onClose();
        onRefresh();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to post journal entry');
      }
    } catch (error) {
      console.error('Status update error:', error);
      toast.error('An error occurred while posting the entry');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Post Journal Entry
          </DialogTitle>
          <DialogDescription>
            Post {journal.journalNumber} to finalize the transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Posting this entry will lock it from further editing. Once posted, the entry can only be voided, not deleted or modified.
            </AlertDescription>
          </Alert>

          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Current Status</p>
              <Badge
                variant={getStatusColor(journal.status)}
                className="capitalize"
                appearance="outline"
              >
                {journal.status}
              </Badge>
            </div>
            <div className="text-2xl text-muted-foreground">→</div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">New Status</p>
              <Badge
                variant="success"
                className="capitalize"
                appearance="outline"
              >
                Posted
              </Badge>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <p className="font-medium">This action will:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>Lock the entry from editing</li>
              <li>Update account balances</li>
              <li>Make the transaction part of official records</li>
              <li>Prevent deletion (can only be voided)</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handlePostEntry} disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner className="mr-2" />
                Posting...
              </>
            ) : (
              <>
                {/* <FileCheck className="h-4 w-4" /> */}
                Post Entry
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}