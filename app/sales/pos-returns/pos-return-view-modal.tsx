"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/utils/formatters/currency";
import { formatDateTime } from "@/utils/formatters/date";
import {
  Undo2,
  Printer,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { POSReturn } from "./columns";

interface POSReturnViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  posReturn: POSReturn | null;
  onViewPdf?: (posReturn: POSReturn) => void;
}

export function POSReturnViewModal({
  isOpen,
  onClose,
  posReturn,
  onViewPdf,
}: POSReturnViewModalProps) {
  if (!posReturn) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl h-[85vh] p-0 flex flex-col gap-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl">
                <Undo2 className="h-6 w-6 text-indigo-500" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  {posReturn.returnNumber}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  POS Return Details
                </p>
              </div>
            </div>
            </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sidebar-scroll">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6 text-sm">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Original Sale</p>
                <div className="flex items-center gap-2">
                    <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                    <p className="font-medium text-base">
                        {posReturn.connectedDocuments?.posSaleId?.saleNumber || "—"}
                    </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Return Date</p>
                <p className="font-medium text-base">{formatDateTime(posReturn.returnDate || posReturn.createdAt)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Total Items</p>
                <p className="font-medium text-base">{posReturn.items?.length || 0} item(s)</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Refund Amount</p>
                <p className="font-bold text-base text-red-500">{formatCurrency(posReturn.grandTotal || 0)}</p>
              </div>
            </div>

            <Separator />

            {posReturn.reason && (
                <div className="space-y-2">
                    <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Reason</p>
                    <div className="p-3 bg-orange-50/50 dark:bg-orange-500/5 rounded-lg border border-orange-100 dark:border-orange-500/20 text-sm italic">
                        "{posReturn.reason}"
                    </div>
                </div>
            )}

            <div className="space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2">
                Returned Items
              </p>
              <div className="rounded-xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="py-2 px-3 text-left font-medium text-muted-foreground">Item</th>
                      <th className="py-2 px-3 text-center font-medium text-muted-foreground">Qty</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Rate</th>
                      <th className="py-2 px-3 text-right font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs sm:text-sm">
                    {posReturn.items?.map((item, index) => (
                      <tr key={index} className="hover:bg-muted/30 transition-colors">
                        <td className="py-2.5 px-3 font-medium">
                          {item.description || item.itemName || "Unknown Item"}
                        </td>
                        <td className="py-2.5 px-3 text-center tabular-nums font-bold text-red-500">
                          {item.returnQuantity}
                        </td>
                        <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums">
                          {formatCurrency(item.rate || 0)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold tabular-nums">
                          {formatCurrency(item.total || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl bg-muted/40 p-4 space-y-2 text-sm border border-border/50">
                <div className="flex justify-between items-center font-bold text-lg">
                    <span>Total Refund</span>
                    <span className="text-red-500">{formatCurrency(posReturn.grandTotal || 0)}</span>
                </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t bg-muted/20 flex gap-3">
          <Button 
            variant="outline" 
            className="flex-1 gap-2" 
            onClick={() => onViewPdf?.(posReturn)}
            disabled={!onViewPdf}
          >
            <Printer className="h-4 w-4" />
            Print Receipt
          </Button>
          <Button onClick={onClose} variant="ghost" className="flex-1">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
