"use client";

import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, ArrowUpDown, Edit, Trash2, Eye, XCircle, SendHorizonal } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { IJournal } from "@/models/Journal";
import { useState } from "react";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDisplayDate, formatTime } from "@/utils/formatters/date";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { JournalStatusUpdateModal } from "./JournalStatusUpdateModal";

// ✅ Export the interface
export type { IJournal } from "@/models/Journal";

// Copy to clipboard function
const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).then(() => {
    toast.success(`Copied: ${text}`);
  }).catch(() => {
    toast.error("Failed to copy");
  });
};

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'posted': return 'success';
    case 'draft': return 'warning';
    case 'void': return 'destructive';
    default: return 'secondary';
  }
};

const getReferenceTypeVariant = (type: string) => {
  switch (type) {
    case 'Invoice': return 'primary';
    case 'POSSale': return 'blue';
    case 'POSReturn': return 'indigo';
    case 'Receipt': return 'success';
    case 'Payment': return 'destructive';
    case 'Purchase': return 'warning';
    case 'Expense': return 'info';
    case 'SalesReturn': return 'orange';
    case 'PurchaseReturn': return 'cyan';
    case 'General': return 'neutral';
    case 'Contra': return 'amber';
    case 'Adjustment': return 'emerald';
    default: return 'secondary';
  }
};

// ✅ NEW: Clickable Status Badge Component
const StatusBadgeButton = ({
  journal,
  onRefresh,
  canPost
}: {
  journal: IJournal;
  onRefresh: () => void;
  canPost: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDraft = journal.status === 'draft';

  const handleClick = () => {
    if (!isDraft) {
      return; // Only draft entries can be clicked
    }
    if (canPost) {
      setIsOpen(true);
    } else {
      toast.error("You don't have permission to post journal entries");
    }
  };

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={getStatusVariant(journal.status) as any}
            className={cn(
              "capitalize",
              isDraft && canPost ? "cursor-pointer hover:opacity-80" : "cursor-default"
            )}
            appearance="outline"
            onClick={handleClick}
          >
            {journal.status}
          </Badge>
        </TooltipTrigger>
        {isDraft && canPost && (
          <TooltipContent>
            Click to post this entry
          </TooltipContent>
        )}
      </Tooltip>

      <JournalStatusUpdateModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        journal={journal}
        onRefresh={onRefresh}
      />
    </>
  );
};

// Delete Journal Dialog
const DeleteJournalDialog = ({
  journal,
  onDelete,
  trigger
}: {
  journal: IJournal;
  onDelete: (journal: IJournal) => void;
  trigger: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <div onClick={() => setIsOpen(true)}>{trigger}</div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Journal Entry</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete journal entry <strong>{journal.journalNumber}</strong>?
            <br /><br />
            {journal.status === 'posted' && (
              <span className="text-destructive font-medium">
                ⚠️ Posted entries cannot be deleted. Please void them instead.
              </span>
            )}
            {journal.status !== 'posted' && (
              <>This will move the entry to trash. You can restore it later if needed.</>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {journal.status !== 'posted' && (
            <AlertDialogAction
              onClick={() => {
                onDelete(journal);
                setIsOpen(false);
              }}
              variant="destructive"
            >
              Delete
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

// Void Journal Dialog
const VoidJournalDialog = ({
  journal,
  onVoid,
  trigger
}: {
  journal: IJournal;
  onVoid: (journal: IJournal) => void;
  trigger: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <div onClick={() => setIsOpen(true)}>{trigger}</div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Void Journal Entry</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to void journal entry <strong>{journal.journalNumber}</strong>?
            <br /><br />
            <span className="text-orange-600 font-medium">
              ⚠️ Voiding will mark this entry as cancelled but keep it in the records for audit purposes.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              onVoid(journal);
              setIsOpen(false);
            }}
            variant="destructive"
          >
            Void Entry
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

interface JournalPermissions {
  canUpdate: boolean;
  canDelete: boolean;
  canPost: boolean;
  canVoid: boolean;
}

export const getJournalColumns = (
  onView: (journal: IJournal) => void,
  onEdit: (journal: IJournal) => void,
  onDelete: (journal: IJournal) => void,
  onVoid: (journal: IJournal) => void,
  permissions: JournalPermissions,
  onRefresh?: () => void
): ColumnDef<IJournal>[] => [
    {
      accessorKey: "entryDate",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-left font-medium min-w-[100px]">
          <div>{formatDisplayDate(row.original.entryDate)}</div>
          <div className="text-xs text-muted-foreground">
            {formatTime(row.original.entryDate)}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "journalNumber",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          Journal #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          appearance="outline"
          className="font-mono cursor-pointer hover:opacity-70 transition-opacity"
          onClick={() => copyToClipboard(row.original.journalNumber)}
        >
          {row.original.journalNumber}
        </Badge>
      ),
      meta: {
        label: "Journal #",
        placeholder: "Search journal no...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "referenceNumber",
      header: "Reference",
      cell: ({ row }) => {
        const refNumber = row.original.referenceNumber;
        const refType = row.original.referenceType;

        return (
          <Badge
            variant={getReferenceTypeVariant(refType) as any}
            appearance="outline"
            className="font-mono cursor-pointer hover:opacity-70 transition-opacity"
            onClick={() => copyToClipboard(refNumber || refType)}
          >
            {refNumber || refType}
          </Badge>
        );
      },
      meta: {
        label: "Reference",
        placeholder: "Search reference...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      id: "partyReference",
      header: "Party",
      cell: ({ row }) => {
        const partyType = row.original.partyType;
        const partyName = row.original.partyName;

        if (!partyType || !partyName) {
          return (
            <Badge variant="secondary" appearance="outline" className="text-xs text-muted-foreground">
              N/A
            </Badge>
          );
        }

        const getPartyVariant = (type: string) => {
          switch (type) {
            case 'Customer': return 'primary';
            case 'Supplier': return 'warning';
            case 'Payee': return 'cyan';
            case 'Vendor': return 'secondary';
            default: return 'secondary';
          }
        };

        return (
          <div className="min-w-[120px]">
            <Badge
              variant={getPartyVariant(partyType) as any}
              appearance="outline"
              className="text-xs"
            >
              {partyName}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "narration",
      header: "Narration",
      cell: ({ row }) => (
        <div className="max-w-[250px]">
          <div className="text-sm font-medium line-clamp-1">
            {row.original.narration}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {row.original.entries.length} entries
          </div>
        </div>
      ),
      meta: {
        label: "Narration",
        placeholder: "Search narration...",
        variant: "text",
      },
      enableColumnFilter: true,
    },
    {
      accessorKey: "totalDebit",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 justify-end w-full"
        >
          Debit
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right text-green-600 min-w-[100px] font-medium">
          {formatCurrency(row.original.totalDebit)}
        </div>
      ),
    },
    {
      accessorKey: "totalCredit",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2 justify-end w-full"
        >
          Credit
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-right text-red-600 min-w-[100px] font-medium">
          {formatCurrency(row.original.totalCredit)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const journal = row.original;
        const refresh = onRefresh || (() => { });

        return (
          <StatusBadgeButton
            journal={journal}
            onRefresh={refresh}
            canPost={permissions.canPost}
          />
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const journal = row.original;
        const { canUpdate, canDelete, canVoid: hasVoidPermission } = permissions;
        const [isPostModalOpen, setIsPostModalOpen] = useState(false);
        const refresh = onRefresh || (() => { });

        const canEdit = journal.status === 'draft' && canUpdate;
        const canPostAction = journal.status === 'draft' && permissions.canPost;
        const canVoid = journal.status === 'posted' && hasVoidPermission;
        const canDeleteAction = journal.status !== 'posted' && canDelete;

        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Open menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>

                <DropdownMenuItem
                  onClick={() => onView(journal)}
                  className="cursor-pointer"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>

                {canEdit && (
                  <DropdownMenuItem
                    onClick={() => onEdit(journal)}
                    className="cursor-pointer"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Entry
                  </DropdownMenuItem>
                )}

                {canPostAction && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsPostModalOpen(true)}
                      className="cursor-pointer text-green-600"
                    >
                      <SendHorizonal className="mr-2 h-4 w-4" />
                      Post Entry
                    </DropdownMenuItem>
                  </>
                )}

                {canVoid && (
                  <>
                    <DropdownMenuSeparator />
                    <VoidJournalDialog
                      journal={journal}
                      onVoid={onVoid}
                      trigger={
                        <DropdownMenuItem
                          className="text-orange-600 cursor-pointer"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Void Entry
                        </DropdownMenuItem>
                      }
                    />
                  </>
                )}

                {canDeleteAction && (
                  <>
                    <DropdownMenuSeparator />
                    <DeleteJournalDialog
                      journal={journal}
                      onDelete={onDelete}
                      trigger={
                        <DropdownMenuItem
                          className="text-destructive cursor-pointer"
                          onSelect={(e) => e.preventDefault()}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      }
                    />
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <JournalStatusUpdateModal
              isOpen={isPostModalOpen}
              onClose={() => setIsPostModalOpen(false)}
              journal={journal}
              onRefresh={refresh}
            />
          </>
        );
      },
    },
  ];