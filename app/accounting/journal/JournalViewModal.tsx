// app/accounting/journal/JournalViewModal.tsx - FULLY RESPONSIVE VERSION

"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Calendar, FileText, User, Package, Users } from "lucide-react";
import type { IJournal } from "@/models/Journal";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatLongDate } from "@/utils/formatters/date";

interface JournalViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  journal: IJournal | null;
}

const getStatusVariant = (status: string) => {
  switch (status) {
    case 'posted': return 'success';
    case 'draft': return 'warning';
    case 'void': return 'destructive';
    default: return 'gray';
  }
};

const getReferenceTypeVariant = (type: string) => {
  switch (type) {
    case 'Invoice': return 'primary';
    case 'Receipt': return 'success';
    case 'Payment': return 'destructive';
    case 'Purchase': return 'warning';
    case 'Expense': return 'info';
    case 'Refund': return 'pink';
    case 'Manual': return 'gray';
    default: return 'gray';
  }
};

const getCreatorUsername = (journal: IJournal): string | null => {
  const createAction = journal.actionHistory?.find(
    action => action.action === 'Created' ||
      action.action.startsWith('Auto-created from')
  );
  return createAction?.username || null;
};

const getPosterUsername = (journal: IJournal): string | null => {
  const postAction = journal.actionHistory?.find(
    action => action.action === 'Created' || action.action === 'Updated'
  );
  return postAction?.username || null;
};

function ItemsDisplay({ referenceType, referenceId }: { referenceType: string; referenceId: string }) {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        let endpoint = '';

        if (referenceType === 'Invoice') {
          endpoint = `/api/invoices/${referenceId}`;
        } else if (referenceType === 'Purchase') {
          endpoint = `/api/purchases/${referenceId}`;
        }

        if (!endpoint) {
          setLoading(false);
          return;
        }

        const res = await fetch(endpoint);
        if (res.ok) {
          const data = await res.json();
          setItems(data.items || []);
        } else {
          console.error("Failed to fetch items:", await res.text());
        }
      } catch (error) {
        console.error('Failed to fetch items:', error);
      } finally {
        setLoading(false);
      }
    };

    if (referenceId) {
      fetchItems();
    }
  }, [referenceType, referenceId]);

  if (loading) {
    return (
      <div className="text-xs sm:text-sm text-muted-foreground animate-pulse">
        Loading items...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-xs sm:text-sm text-muted-foreground">
        No items found or document unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item: any, index: number) => (
        <div
          key={index}
          className="flex items-start justify-between p-2 sm:p-3 rounded-lg bg-muted/50 border text-xs sm:text-sm gap-2"
        >
          <div className="flex-1 min-w-0">
            <div className="font-medium break-words">
              {referenceType === 'Invoice' ? item.description : item.materialName}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Quantity: {item.quantity} {referenceType === 'Purchase' && `× ${formatCurrency(item.unitCost)}`}
            </div>
          </div>
          <div className="font-semibold text-right shrink-0">
            {formatCurrency(item.total)}
          </div>
        </div>
      ))}
      <div className="flex justify-between items-center p-2 sm:p-3 rounded-lg bg-primary/5 border border-primary/20 font-semibold text-xs sm:text-sm">
        <span>Total ({items.length} items)</span>
        <span>{formatCurrency(items.reduce((sum: number, item: any) => sum + item.total, 0))}</span>
      </div>
    </div>
  );
}

export function JournalViewModal({ isOpen, onClose, journal }: JournalViewModalProps) {
  if (!journal) return null;

  const creatorUsername = getCreatorUsername(journal);
  const posterUsername = getPosterUsername(journal);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[98vw] sm:max-w-[95vw] lg:max-w-4xl max-h-[95vh] overflow-y-auto sidebar-scroll p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            Journal Entry Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base flex items-center justify-between flex-wrap gap-2">
                <span className="break-words">{journal.journalNumber}</span>
                <Badge variant={getStatusVariant(journal.status)} appearance="outline" className="capitalize text-xs">
                  {journal.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm text-muted-foreground">Entry Date</div>
                    <div className="font-medium text-xs sm:text-sm break-words">{formatLongDate(journal.entryDate)}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm text-muted-foreground">Reference Type</div>
                    <Badge variant={getReferenceTypeVariant(journal.referenceType)} appearance="outline" className="text-xs">
                      {journal.referenceType}
                    </Badge>
                  </div>
                </div>

                {journal.referenceNumber && (
                  <div className="flex items-start gap-3">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground">Reference Number</div>
                      <Badge
                        variant={getReferenceTypeVariant(journal.referenceType)}
                        appearance="outline"
                        className="font-mono text-xs break-all"
                      >
                        {journal.referenceNumber}
                      </Badge>
                    </div>
                  </div>
                )}

                {creatorUsername && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground">Created By</div>
                      <div className="font-medium text-xs sm:text-sm break-words">@{creatorUsername}</div>
                    </div>
                  </div>
                )}

                {journal.partyType && journal.partyName && (
                  <div className="flex items-start gap-3">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                        {journal.partyType}
                      </div>
                      <div className="text-xs sm:text-sm font-medium break-words">{journal.partyName}</div>
                    </div>
                  </div>
                )}

                {journal.itemType && journal.itemName && (
                  <div className="flex items-start gap-3">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm text-muted-foreground mb-1">
                        {journal.itemType}
                      </div>
                      <div className="text-xs sm:text-sm font-medium break-words">{journal.itemName}</div>
                    </div>
                  </div>
                )}
              </div>

              {journal.narration && (
                <div className="pt-3 sm:pt-4 border-t">
                  <div className="text-xs sm:text-sm text-muted-foreground mb-1">Narration</div>
                  <p className="text-xs sm:text-sm break-words">{journal.narration}</p>
                </div>
              )}

              {(journal.referenceType === 'Invoice' || journal.referenceType === 'Purchase') && journal.referenceId && (
                <div className="pt-3 sm:pt-4 border-t">
                  <div className="text-xs sm:text-sm font-medium mb-3 flex items-center gap-2">
                    <Package className="h-3 w-3 sm:h-4 sm:w-4" />
                    Items from {journal.referenceType}
                  </div>
                  <ItemsDisplay
                    referenceType={journal.referenceType}
                    referenceId={journal.referenceId}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Journal Entries</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-medium text-sm">#</th>
                      <th className="text-left p-3 font-medium text-sm">Account Code</th>
                      <th className="text-left p-3 font-medium text-sm">Account Name</th>
                      <th className="text-right p-3 font-medium text-sm text-green-600">Debit</th>
                      <th className="text-right p-3 font-medium text-sm text-red-600">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {journal.entries.map((entry, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-3 text-sm text-muted-foreground">{index + 1}</td>
                        <td className="p-3">
                          <span className="font-mono text-sm font-bold">{entry.accountCode}</span>
                        </td>
                        <td className="p-3 text-sm">{entry.accountName}</td>
                        <td className="p-3 text-right font-medium text-green-600">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                        </td>
                        <td className="p-3 text-right font-medium text-red-600">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold bg-muted/50">
                      <td colSpan={3} className="p-3 text-right">Total:</td>
                      <td className="p-3 text-right text-green-600">
                        {formatCurrency(journal.totalDebit)}
                      </td>
                      <td className="p-3 text-right text-red-600">
                        {formatCurrency(journal.totalCredit)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {journal.entries.map((entry, index) => (
                  <Card key={index} className="border">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs text-muted-foreground mb-1">Entry #{index + 1}</div>
                          <div className="font-mono text-xs font-bold break-all">{entry.accountCode}</div>
                          <div className="text-sm font-medium break-words mt-1">{entry.accountName}</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t text-sm">
                        <div>
                          <div className="text-xs text-green-600 mb-0.5">Debit</div>
                          <div className="font-medium text-green-600">
                            {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-red-600 mb-0.5">Credit</div>
                          <div className="font-medium text-red-600">
                            {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Mobile Totals */}
                <Card className="border-2 bg-muted/50">
                  <CardContent className="p-3 sm:p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Total Debit</div>
                        <div className="font-bold text-green-600 text-sm sm:text-base">{formatCurrency(journal.totalDebit)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground mb-1">Total Credit</div>
                        <div className="font-bold text-red-600 text-sm sm:text-base">{formatCurrency(journal.totalCredit)}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {journal.actionHistory && journal.actionHistory.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm sm:text-base">Audit Trail</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {journal.actionHistory.map((action, index) => (
                    <div key={index} className="flex items-start gap-3 text-xs sm:text-sm p-2 sm:p-3 rounded-lg bg-muted/50">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium break-words">{action.action}</div>
                        {action.username && (
                          <div className="text-xs text-muted-foreground">by @{action.username}</div>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">
                        {new Date(action.timestamp).toLocaleString('en-AE')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {journal.status === 'posted' && journal.postedAt && (
            <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs sm:text-sm">
                  <div>
                    <span className="text-muted-foreground">Posted on:</span>
                    <span className="ml-2 font-medium">{formatLongDate(journal.postedAt)}</span>
                  </div>
                  {posterUsername && (
                    <div>
                      <span className="text-muted-foreground">by</span>
                      <span className="ml-2 font-medium">@{posterUsername}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}