// app/billing/pos/pos-types.ts

import { Banknote, CreditCard, Smartphone, Building } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Domain types
// ─────────────────────────────────────────────────────────────────────────────

export interface POSProduct {
    _id: string;
    name: string;
    sellingPrice: number;
    taxRate: number;
    category: string;
    barcode?: string;
    unit?: string;
    types: string[];
}

export interface POSCartItem {
    itemId: string;
    description: string;
    quantity: number;
    rate: number;
    total: number;
    taxRate: number;
    taxAmount: number;
    category: string;
}

export interface POSParty {
    _id: string;
    name?: string;
    company?: string;
}

export interface POSTotals {
    grossTotal: number;
    vatAmount: number;
    subTotal: number;
    grandTotal: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const POS_PAYMENT_METHODS = [
    { value: "Cash", label: "Cash", icon: Banknote },
    { value: "Credit Card", label: "Credit Card", icon: CreditCard },
    { value: "Debit Card", label: "Debit Card", icon: CreditCard },
    { value: "UPI", label: "UPI", icon: Smartphone },
    { value: "Bank Transfer", label: "Bank", icon: Building },
] as const;

export const CATEGORY_PASTEL_COLORS: string[] = [
    "bg-blue-100 text-blue-800 border-blue-200",
    "bg-emerald-100 text-emerald-800 border-emerald-200",
    "bg-purple-100 text-purple-800 border-purple-200",
    "bg-amber-100 text-amber-800 border-amber-200",
    "bg-rose-100 text-rose-800 border-rose-200",
    "bg-cyan-100 text-cyan-800 border-cyan-200",
    "bg-orange-100 text-orange-800 border-orange-200",
    "bg-lime-100 text-lime-800 border-lime-200",
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns the display name for a party: company preferred, then name. */
export function getPartyDisplayName(party: POSParty): string {
    return party.company || party.name || "Unknown";
}

/** Returns a Tailwind class string for the category badge based on its index. */
export function getCategoryColor(category: string, categories: string[]): string {
    if (category === "All") return "bg-primary text-primary-foreground border-primary";
    const idx = categories.indexOf(category) - 1; // -1 because "All" is at index 0
    return CATEGORY_PASTEL_COLORS[idx % CATEGORY_PASTEL_COLORS.length];
}