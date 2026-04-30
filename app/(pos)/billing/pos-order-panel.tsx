// app/billing/pos/pos-order-panel.tsx
"use client";

import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters/currency";
import { POSCart } from "./pos-cart";
import { POS_PAYMENT_METHODS, type POSCartItem, type POSTotals } from "./pos-types";

interface POSOrderPanelProps {
    // Cart
    cart: POSCartItem[];
    onUpdateQty: (itemId: string, qty: number) => void;
    onRemoveFromCart: (itemId: string) => void;
    onClearCart: () => void;

    // Payment
    paymentMethod: string;
    onPaymentMethodChange: (method: string) => void;

    // Discount
    discount: number;
    onDiscountChange: (value: number) => void;

    // Computed totals
    totals: POSTotals;

    // Actions
    onProcessSale: () => void;
    isProcessing: boolean;
}

export function POSOrderPanel({
    cart,
    onUpdateQty,
    onRemoveFromCart,
    onClearCart,
    paymentMethod,
    onPaymentMethodChange,
    discount,
    onDiscountChange,
    totals,
    onProcessSale,
    isProcessing,
}: POSOrderPanelProps) {
    const { grossTotal, vatAmount, grandTotal } = totals;

    return (
        <div className="flex flex-col gap-4">

            {/* Cart */}
            <POSCart
                cart={cart}
                onUpdateQty={onUpdateQty}
                onRemove={onRemoveFromCart}
                onClear={onClearCart}
            />

            {/* Payment + Summary card */}
            <div className="rounded-xl border bg-card px-4 py-4 flex flex-col gap-4">

                {/* Payment method selector */}
                <div>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground mb-2 tracking-wide">
                        Payment Method
                    </p>
                    <div className="grid grid-cols-4 gap-1.5">
                        {POS_PAYMENT_METHODS.map(({ value, label, icon: Icon }) => (
                            <button
                                key={value}
                                onClick={() => onPaymentMethodChange(value)}
                                className={cn(
                                    "flex flex-col items-center gap-1 rounded-lg border py-2 text-[10px] font-medium transition-all",
                                    paymentMethod === value
                                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                                        : "border-border bg-background text-muted-foreground hover:border-primary/40"
                                )}
                            >
                                <Icon className="size-3.5" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                <Separator />

                {/* Discount */}
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground flex-1">Discount</span>
                    <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discount || ""}
                        placeholder="0.00"
                        onChange={e => onDiscountChange(parseFloat(e.target.value) || 0)}
                        className="h-8 w-28 text-sm text-left"
                    />
                </div>

                {/* Totals breakdown */}
                <div className="flex flex-col gap-1.5 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium tabular-nums">{formatCurrency(grossTotal)}</span>
                    </div>

                    {discount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Discount</span>
                            <span className="font-medium text-destructive tabular-nums">
                                − {formatCurrency(discount)}
                            </span>
                        </div>
                    )}

                    {vatAmount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">VAT</span>
                            <span className="font-medium tabular-nums">{formatCurrency(vatAmount)}</span>
                        </div>
                    )}

                    <Separator />

                    <div className="flex justify-between font-semibold text-base">
                        <span>Total</span>
                        <span className="text-primary tabular-nums">{formatCurrency(grandTotal)}</span>
                    </div>
                </div>

                {/* Process sale button */}
                <Button
                    size="lg"
                    className="w-full"
                    disabled={cart.length === 0 || isProcessing}
                    onClick={onProcessSale}
                >
                    {isProcessing ? (
                        <>
                            <Spinner />
                            Processing…
                        </>
                    ) : (
                        <>
                            <Receipt className="size-4 mr-2" />
                            Process Sale
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}