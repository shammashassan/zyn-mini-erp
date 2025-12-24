// app/billing/summary-actions.tsx - UPDATED: Detailed breakdown

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/utils/formatters/currency";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spinner } from "@/components/ui/spinner";

interface SummaryActionsProps {
  discount: number;
  handleSubmit: () => void;
  isLoading: boolean;
  isFormValid: boolean;
  grossTotal: number;
  subTotal: number;
  vatAmount: number;
  grandTotal: number;
  vatPercentage: number;
}

export function SummaryActions({
    discount,
    handleSubmit,
    isLoading,
    isFormValid,
    grossTotal,
    subTotal,
    vatAmount,
    grandTotal,
    vatPercentage,
}: SummaryActionsProps) {
  const hasNegativeTotal = grandTotal < 0;

  return (
    <div className="flex flex-col items-end space-y-4">
      <Card className={cn(
        "w-full max-w-sm",
        hasNegativeTotal && "border-destructive"
      )}>
        <CardContent className="p-4 space-y-2">
          {/* Gross Total = Sum of line items (before discount, before VAT) */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gross Total:</span>
            <span className="font-medium">{formatCurrency(grossTotal)}</span>
          </div>
          
          {/* Discount */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount:</span>
            <span className={cn(
              "font-medium",
              hasNegativeTotal ? "text-destructive" : "text-destructive"
            )}>- {formatCurrency(discount)}</span>
          </div>
          
          {/* Subtotal = Gross Total - Discount (this is the amount VAT is calculated on) */}
          <div className="flex justify-between border-t pt-2">
            <span className="text-muted-foreground">Subtotal (after discount):</span>
            <span className="font-medium">{formatCurrency(subTotal)}</span>
          </div>
          
          {/* VAT = Subtotal × VAT% */}
          <div className="flex justify-between">
            <span className="text-muted-foreground">VAT ({vatPercentage}%):</span>
            <span className="font-medium">{formatCurrency(vatAmount)}</span>
          </div>
          
          {/* Grand Total = Subtotal + VAT */}
          <div className={cn(
            "flex justify-between border-t pt-2 mt-2",
            hasNegativeTotal && "border-destructive"
          )}>
            <span className="text-lg font-bold">Grand Total:</span>
            <span className={cn(
              "text-lg font-bold",
              hasNegativeTotal && "text-destructive"
            )}>{formatCurrency(grandTotal)}</span>
          </div>
          
          {hasNegativeTotal && (
            <div className="flex items-center gap-2 text-sm text-destructive pt-2">
              <AlertCircle className="h-4 w-4" />
              <span>Discount exceeds gross total</span>
            </div>
          )}
        </CardContent>
      </Card>
      <Button 
        onClick={handleSubmit} 
        disabled={isLoading || !isFormValid} 
        size="lg"
      >
        {isLoading && <Spinner/>}
        Create Document
      </Button>
    </div>
  );
}