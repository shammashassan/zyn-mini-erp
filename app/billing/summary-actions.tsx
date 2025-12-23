// app/billing/summary-actions.tsx

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
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal:</span>
            <span className="font-medium">{formatCurrency(subTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount:</span>
            <span className={cn(
              "font-medium",
              hasNegativeTotal ? "text-destructive" : "text-destructive"
            )}>- {formatCurrency(discount)}</span>
          </div>
           <div className="flex justify-between">
            <span className="text-muted-foreground">UAE VAT ({vatPercentage}%):</span>
            <span className="font-medium">{formatCurrency(vatAmount)}</span>
          </div>
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
              <span>Discount exceeds subtotal</span>
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