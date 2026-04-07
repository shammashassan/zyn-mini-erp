// app/billing/pos/pos-cart.tsx
"use client";

import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters/currency";
import type { POSCartItem } from "./pos-types";

interface POSCartProps {
    cart: POSCartItem[];
    onUpdateQty: (itemId: string, qty: number) => void;
    onRemove: (itemId: string) => void;
    onClear: () => void;
}

export function POSCart({ cart, onUpdateQty, onRemove, onClear }: POSCartProps) {
    return (
        <div className="rounded-xl border bg-card">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b">
                <div className="flex items-center gap-2">
                    <ShoppingBag className="size-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">
                        Order
                        {cart.length > 0 && (
                            <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">
                                {cart.length}
                            </Badge>
                        )}
                    </span>
                </div>
                {cart.length > 0 && (
                    <button
                        onClick={onClear}
                        className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                    >
                        <Trash2 className="size-3" />
                        Clear
                    </button>
                )}
            </div>

            {/* Items */}
            <div className="p-2 max-h-56 overflow-y-auto">
                {cart.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                        <ShoppingBag className="size-7 mb-2 opacity-20" />
                        <p className="text-xs">Click products to add</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {cart.map(item => (
                            <div
                                key={item.itemId}
                                className="flex items-center gap-1.5 rounded-lg border bg-muted/30 px-2 py-1.5"
                            >
                                {/* Name + rate */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium truncate">{item.description}</p>
                                    <p className="text-[10px] text-muted-foreground">{formatCurrency(item.rate)}</p>
                                </div>

                                {/* Qty stepper */}
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => onUpdateQty(item.itemId, item.quantity - 1)}
                                        className="size-5 rounded border bg-background hover:bg-muted flex items-center justify-center transition-colors"
                                        aria-label={`Decrease quantity of ${item.description}`}
                                    >
                                        <Minus className="size-2.5" />
                                    </button>
                                    <span className="w-5 text-center text-xs font-bold tabular-nums">
                                        {item.quantity}
                                    </span>
                                    <button
                                        onClick={() => onUpdateQty(item.itemId, item.quantity + 1)}
                                        className="size-5 rounded border bg-background hover:bg-muted flex items-center justify-center transition-colors"
                                        aria-label={`Increase quantity of ${item.description}`}
                                    >
                                        <Plus className="size-2.5" />
                                    </button>
                                </div>

                                {/* Line total */}
                                <span className="text-xs font-semibold w-14 text-right shrink-0 tabular-nums">
                                    {formatCurrency(item.total)}
                                </span>

                                {/* Remove */}
                                <button
                                    onClick={() => onRemove(item.itemId)}
                                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                                    aria-label={`Remove ${item.description}`}
                                >
                                    <X className="size-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}