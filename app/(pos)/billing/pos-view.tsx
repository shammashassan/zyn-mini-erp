// app/billing/pos/pos-view.tsx
"use client";

import { useState } from "react";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { PDFViewerModal } from "@/components/shared/PDFViewerModal";
import { formatCurrency } from "@/utils/formatters/currency";
import { POSProductGrid } from "./pos-product-grid";
import { POSOrderPanel } from "./pos-order-panel";
import {
    getPartyDisplayName,
    type POSProduct, type POSCartItem, type POSParty, type POSTotals,
} from "./pos-types";

interface POSViewProps {
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

    // Customer
    selectedParty: POSParty | null;
    parties: POSParty[];
    partySearch: string;
    onPartySearchChange: (v: string) => void;
    filteredParties: POSParty[];
    partyPopoverOpen: boolean;
    onPartyPopoverOpenChange: (open: boolean) => void;
    onSelectParty: (party: POSParty | null) => void;

    // Cart
    onUpdateQty: (itemId: string, qty: number) => void;
    onRemoveFromCart: (itemId: string) => void;
    onClearCart: () => void;

    // Payment
    paymentMethod: string;
    onPaymentMethodChange: (method: string) => void;

    // Discount
    discount: number;
    onDiscountChange: (value: number) => void;

    // Totals
    totals: POSTotals;

    // Process sale — called when user confirms in the dialog
    onProcessSale: () => Promise<void>;
    isProcessing: boolean;

    // PDF receipt after sale
    pdfUrl: string;
    pdfTitle: string;
    pdfOpen: boolean;
    onPdfClose: () => void;
}

export function POSView({
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
    pdfUrl,
    pdfTitle,
    pdfOpen,
    onPdfClose,
}: POSViewProps) {
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleRequestProcess = () => {
        if (cart.length === 0) return;
        setConfirmOpen(true);
    };

    const handleConfirm = async () => {
        await onProcessSale();
        setConfirmOpen(false);
    };

    return (
        <>
            {/* ── Two-column layout: left catalog | right sticky order panel ── */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-4 lg:gap-6 items-start">

                {/* Left: product catalog (scrolls naturally with page) */}
                <POSProductGrid
                    products={products}
                    isLoadingProducts={isLoadingProducts}
                    cart={cart}
                    onAddToCart={onAddToCart}
                    search={search}
                    onSearchChange={onSearchChange}
                    barcodeInput={barcodeInput}
                    onBarcodeInputChange={onBarcodeInputChange}
                    onBarcodeKeyDown={onBarcodeKeyDown}
                    categories={categories}
                    selectedCategory={selectedCategory}
                    onCategoryChange={onCategoryChange}
                    filteredProducts={filteredProducts}
                    selectedParty={selectedParty}
                    parties={parties}
                    partySearch={partySearch}
                    onPartySearchChange={onPartySearchChange}
                    filteredParties={filteredParties}
                    partyPopoverOpen={partyPopoverOpen}
                    onPartyPopoverOpenChange={onPartyPopoverOpenChange}
                    onSelectParty={onSelectParty}
                />

                {/* Right: sticky order panel — stays visible as products scroll */}
                <div className="sticky top-6">
                    <POSOrderPanel
                        cart={cart}
                        onUpdateQty={onUpdateQty}
                        onRemoveFromCart={onRemoveFromCart}
                        onClearCart={onClearCart}
                        paymentMethod={paymentMethod}
                        onPaymentMethodChange={onPaymentMethodChange}
                        discount={discount}
                        onDiscountChange={onDiscountChange}
                        totals={totals}
                        onProcessSale={handleRequestProcess}
                        isProcessing={isProcessing}
                    />
                </div>
            </div>

            {/* ── Sale confirmation dialog ── */}
            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="size-5 text-primary" />
                            Confirm Sale
                        </DialogTitle>
                        <DialogDescription>Review and confirm this transaction.</DialogDescription>
                    </DialogHeader>

                    <div className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Customer</span>
                            <span className="font-medium">
                                {selectedParty ? getPartyDisplayName(selectedParty) : "Walk-in Customer"}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Items</span>
                            <span className="font-medium">{cart.length} item(s)</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Payment</span>
                            <span className="font-medium">{paymentMethod}</span>
                        </div>
                        <Separator />
                        <div className="flex justify-between font-bold text-base">
                            <span>Total</span>
                            <span className="text-primary tabular-nums">
                                {formatCurrency(totals.grandTotal)}
                            </span>
                        </div>
                    </div>

                    <div className="flex gap-2 mt-2">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setConfirmOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleConfirm}
                            disabled={isProcessing}
                        >
                            {isProcessing ? <Spinner /> : "Confirm & Print"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Receipt PDF modal ── */}
            <PDFViewerModal
                isOpen={pdfOpen}
                onClose={onPdfClose}
                pdfUrl={pdfUrl}
                title={pdfTitle}
            />
        </>
    );
}