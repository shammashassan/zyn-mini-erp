// app/billing/pos/pos-product-grid.tsx
"use client";

import { Package, Plus, ScanBarcode, Search, User, ChevronRight, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/utils/formatters/currency";
import {
    getCategoryColor, getPartyDisplayName,
    type POSProduct, type POSCartItem, type POSParty,
} from "./pos-types";

interface POSProductGridProps {
    // Product catalog
    products: POSProduct[];
    isLoadingProducts: boolean;
    cart: POSCartItem[];
    onAddToCart: (product: POSProduct) => void;

    // Search & filter
    search: string;
    onSearchChange: (v: string) => void;
    barcodeInput: string;
    onBarcodeInputChange: (v: string) => void;
    onBarcodeKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    categories: string[];
    selectedCategory: string;
    onCategoryChange: (cat: string) => void;
    filteredProducts: POSProduct[];

    // Customer selector
    selectedParty: POSParty | null;
    parties: POSParty[];
    partySearch: string;
    onPartySearchChange: (v: string) => void;
    filteredParties: POSParty[];
    partyPopoverOpen: boolean;
    onPartyPopoverOpenChange: (open: boolean) => void;
    onSelectParty: (party: POSParty | null) => void;
}

export function POSProductGrid({
    products,
    isLoadingProducts,
    cart,
    onAddToCart,
    search,
    onSearchChange,
    barcodeInput,
    onBarcodeInputChange,
    onBarcodeKeyDown,
    categories,
    selectedCategory,
    onCategoryChange,
    filteredProducts,
    selectedParty,
    parties,
    partySearch,
    onPartySearchChange,
    filteredParties,
    partyPopoverOpen,
    onPartyPopoverOpenChange,
    onSelectParty,
}: POSProductGridProps) {
    return (
        <div className="flex flex-col gap-3">

            {/* ── Compact customer selector row ── */}
            <div className="flex items-center gap-2">
                <Popover open={partyPopoverOpen} onOpenChange={onPartyPopoverOpenChange}>
                    <PopoverTrigger asChild>
                        <button className="flex items-center gap-2 text-sm rounded-lg border bg-background px-3 py-1.5 hover:bg-muted/50 transition-colors min-w-0 max-w-xs">
                            <User className="size-3.5 text-muted-foreground shrink-0" />
                            <span className={cn(
                                "truncate",
                                selectedParty ? "text-foreground font-medium" : "text-muted-foreground"
                            )}>
                                {selectedParty ? getPartyDisplayName(selectedParty) : "Walk-in Customer"}
                            </span>
                            <ChevronRight className="size-3 text-muted-foreground shrink-0 ml-auto" />
                        </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-0" align="start">
                        <Command>
                            <CommandInput
                                placeholder="Search customer…"
                                value={partySearch}
                                onValueChange={onPartySearchChange}
                            />
                            <CommandList className="max-h-48">
                                <CommandEmpty>No customers found.</CommandEmpty>
                                <CommandGroup heading="Quick">
                                    <CommandItem
                                        value="walk-in"
                                        onSelect={() => { onSelectParty(null); onPartyPopoverOpenChange(false); }}
                                    >
                                        <User className="size-3.5 mr-2 text-muted-foreground" />
                                        Walk-in Customer
                                        {!selectedParty && <span className="ml-auto text-xs text-primary">✓</span>}
                                    </CommandItem>
                                </CommandGroup>
                                {filteredParties.length > 0 && (
                                    <CommandGroup heading="Saved Customers">
                                        {filteredParties.map(p => (
                                            <CommandItem
                                                key={p._id}
                                                value={getPartyDisplayName(p)}
                                                onSelect={() => { onSelectParty(p); onPartyPopoverOpenChange(false); }}
                                            >
                                                {getPartyDisplayName(p)}
                                                {selectedParty?._id === p._id && (
                                                    <span className="ml-auto text-xs text-primary">✓</span>
                                                )}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>

                {/* Clear selected party */}
                {selectedParty && (
                    <button
                        onClick={() => onSelectParty(null)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Clear customer selection"
                    >
                        <X className="size-3.5" />
                    </button>
                )}
            </div>

            {/* ── Search + Barcode ── */}
            <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Search products…"
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="relative w-44 shrink-0">
                    <ScanBarcode className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                    <Input
                        placeholder="Scan barcode…"
                        value={barcodeInput}
                        onChange={e => onBarcodeInputChange(e.target.value)}
                        onKeyDown={onBarcodeKeyDown}
                        className="pl-8 font-mono"
                        title="Press Enter after scanning"
                    />
                </div>
            </div>

            {/* ── Category pills ── */}
            <div className="flex gap-1.5 flex-wrap">
                {categories.map(cat => (
                    <button
                        key={cat}
                        onClick={() => onCategoryChange(cat)}
                        className={cn(
                            "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                            selectedCategory === cat
                                ? cn(getCategoryColor(cat, categories), "ring-2 ring-primary/20 shadow-sm")
                                : "bg-background text-muted-foreground border-border hover:border-primary/40"
                        )}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* ── Product grid ── */}
            {isLoadingProducts ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
            ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground border rounded-xl bg-muted/20">
                    <Package className="size-10 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No products found</p>
                    <p className="text-xs mt-1 opacity-60">Try a different search or category</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredProducts.map(product => {
                        const inCart = cart.find(c => c.itemId === product._id);
                        return (
                            <button
                                key={product._id}
                                onClick={() => onAddToCart(product)}
                                className={cn(
                                    "group relative rounded-xl border bg-card p-3 text-left transition-all duration-150",
                                    "hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 active:scale-[0.97]",
                                    inCart && "border-primary/60 bg-primary/5 shadow-sm"
                                )}
                            >
                                {/* Category badge */}
                                <span className={cn(
                                    "inline-block text-[9px] px-1.5 py-0.5 rounded-full font-medium border mb-2 truncate max-w-full",
                                    getCategoryColor(product.category, categories)
                                )}>
                                    {product.category}
                                </span>

                                {/* Name */}
                                <p className="text-xs font-semibold leading-tight line-clamp-2 mb-2">
                                    {product.name}
                                </p>

                                {/* Price + cart indicator */}
                                <div className="flex items-center justify-between gap-1">
                                    <span className="text-sm font-bold text-primary">
                                        {formatCurrency(product.sellingPrice)}
                                    </span>
                                    {inCart ? (
                                        <span className="size-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
                                            {inCart.quantity}
                                        </span>
                                    ) : (
                                        <Plus className="size-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}