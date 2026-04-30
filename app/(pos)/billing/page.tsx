// app/billing/page.tsx
// Dedicated Point of Sale page. 
// Old billing form and tab switching logic removed.

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { redirect, usePathname } from "next/navigation";
import { POSView } from "./pos-view";
import type {
  POSProduct, POSCartItem, POSParty,
} from "./pos-types";
import { ShoppingBag } from "lucide-react";
import { useBillPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/shared/access-denied";
import { Spinner } from "@/components/ui/spinner";

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────
export default function POSPage() {
  const pathname = usePathname();
  const { permissions: { canCreate }, session, isPending } = useBillPermissions();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // POS state & handlers
  // ═══════════════════════════════════════════════════════════════════════════
  const [posProducts, setPosProducts] = useState<POSProduct[]>([]);
  const [isPosLoading, setIsPosLoading] = useState(true);
  const [posSearch, setPosSearch] = useState("");
  const [posBarcodeInput, setPosBarcodeInput] = useState("");
  const [posSelectedCategory, setPosSelectedCategory] = useState("All");
  const [posCart, setPosCart] = useState<POSCartItem[]>([]);
  const [posDiscount, setPosDiscount] = useState(0);
  const [posPaymentMethod, setPosPaymentMethod] = useState("Cash");
  const [posSelectedParty, setPosSelectedParty] = useState<POSParty | null>(null);
  const [posParties, setPosParties] = useState<POSParty[]>([]);
  const [posPartySearch, setPosPartySearch] = useState("");
  const [posPartyPopoverOpen, setPosPartyPopoverOpen] = useState(false);
  const [posIsProcessing, setPosIsProcessing] = useState(false);
  const [posPdfUrl, setPosPdfUrl] = useState("");
  const [posPdfTitle, setPosPdfTitle] = useState("");
  const [posPdfOpen, setPosPdfOpen] = useState(false);

  const fetchPosProducts = useCallback(async () => {
    setIsPosLoading(true);
    try {
      const res = await fetch("/api/items?types=product");
      if (res.ok) setPosProducts(await res.json());
    } catch { toast.error("Failed to load products."); }
    finally { setIsPosLoading(false); }
  }, []);

  const fetchPosParties = useCallback(async () => {
    try {
      const res = await fetch("/api/parties?roles=customer");
      if (res.ok) setPosParties(await res.json());
    } catch { }
  }, []);

  useEffect(() => {
    if (isMounted && canCreate) {
      fetchPosProducts();
      fetchPosParties();
    }
  }, [isMounted, canCreate, fetchPosProducts, fetchPosParties]);

  // Derived
  const posCategories = useMemo(() => {
    const cats = Array.from(new Set(posProducts.map(p => p.category).filter(Boolean)));
    return ["All", ...cats];
  }, [posProducts]);

  const posFilteredProducts = useMemo(() => {
    let list = posProducts;
    if (posSelectedCategory !== "All") list = list.filter(p => p.category === posSelectedCategory);
    if (posSearch.trim()) {
      const q = posSearch.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.barcode?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [posProducts, posSelectedCategory, posSearch]);

  const posFilteredParties = useMemo(() => {
    if (!posPartySearch) return posParties;
    const q = posPartySearch.toLowerCase();
    return posParties.filter(p => (p.company || p.name || "").toLowerCase().includes(q));
  }, [posParties, posPartySearch]);

  const posGrossTotal = useMemo(() => posCart.reduce((s, i) => s + i.total, 0), [posCart]);
  const posVatAmount = useMemo(() => posCart.reduce((s, i) => s + i.taxAmount, 0), [posCart]);
  const posSubTotal = useMemo(() => Math.max(posGrossTotal - posDiscount, 0), [posGrossTotal, posDiscount]);
  const posGrandTotal = useMemo(() => posSubTotal + posVatAmount, [posSubTotal, posVatAmount]);
  const posTotals = useMemo(() => ({ grossTotal: posGrossTotal, vatAmount: posVatAmount, subTotal: posSubTotal, grandTotal: posGrandTotal }), [posGrossTotal, posVatAmount, posSubTotal, posGrandTotal]);

  const addToCart = useCallback((product: POSProduct) => {
    setPosCart(prev => {
      const idx = prev.findIndex(c => c.itemId === product._id);
      if (idx !== -1) {
        const updated = [...prev];
        const item = { ...updated[idx] };
        item.quantity += 1;
        item.total = item.quantity * item.rate;
        item.taxAmount = item.total * (item.taxRate / 100);
        updated[idx] = item;
        return updated;
      }
      const total = product.sellingPrice;
      return [...prev, { itemId: product._id, description: product.name, quantity: 1, rate: product.sellingPrice, total, taxRate: product.taxRate, taxAmount: total * (product.taxRate / 100), category: product.category }];
    });
  }, []);

  const updatePosQty = useCallback((itemId: string, qty: number) => {
    if (qty <= 0) { setPosCart(prev => prev.filter(c => c.itemId !== itemId)); return; }
    setPosCart(prev => prev.map(c => {
      if (c.itemId !== itemId) return c;
      const total = qty * c.rate;
      return { ...c, quantity: qty, total, taxAmount: total * (c.taxRate / 100) };
    }));
  }, []);

  const removePosFromCart = useCallback((itemId: string) =>
    setPosCart(prev => prev.filter(c => c.itemId !== itemId)), []);

  const clearPosCart = useCallback(() => {
    setPosCart([]); setPosDiscount(0); setPosSelectedParty(null);
  }, []);

  const handleBarcodeKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const code = posBarcodeInput.trim();
    if (!code) return;
    const found = posProducts.find(p => p.barcode?.toLowerCase() === code.toLowerCase());
    if (found) { addToCart(found); toast.success(`Added: ${found.name}`); }
    else toast.error(`No product found for barcode: ${code}`);
    setPosBarcodeInput("");
  }, [posBarcodeInput, posProducts, addToCart]);

  const handlePosProcessSale = useCallback(async () => {
    if (posCart.length === 0) { toast.error("Cart is empty"); return; }
    setPosIsProcessing(true);
    try {
      const res = await fetch("/api/pos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: posCart.map(c => ({ itemId: c.itemId, description: c.description, quantity: c.quantity, rate: c.rate, total: c.total, taxRate: c.taxRate, taxAmount: c.taxAmount })),
          discount: posDiscount,
          paymentMethod: posPaymentMethod,
          partyId: posSelectedParty?._id || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to create sale"); return; }
      toast.success(`Sale ${data.sale.saleNumber} created!`);
      setPosPdfUrl(`/api/pos/${data.sale._id}/pdf`);
      setPosPdfTitle(data.sale.saleNumber);
      setPosPdfOpen(true);
      clearPosCart();
    } catch { toast.error("An error occurred. Please try again."); }
    finally { setPosIsProcessing(false); }
  }, [posCart, posDiscount, posPaymentMethod, posSelectedParty, clearPosCart]);

  // ─────────────────────────────────────────────────────────────────────────
  // Auth guards
  // ─────────────────────────────────────────────────────────────────────────
  if (!isMounted || isPending) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!session) redirect(`/login?callbackURL=${encodeURIComponent(pathname)}`);
  if (!canCreate) return <AccessDenied />;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">

      <POSView
        products={posProducts}
        isLoadingProducts={isPosLoading}
        cart={posCart}
        onAddToCart={addToCart}
        search={posSearch}
        onSearchChange={setPosSearch}
        barcodeInput={posBarcodeInput}
        onBarcodeInputChange={setPosBarcodeInput}
        onBarcodeKeyDown={handleBarcodeKeyDown}
        categories={posCategories}
        selectedCategory={posSelectedCategory}
        onCategoryChange={setPosSelectedCategory}
        filteredProducts={posFilteredProducts}
        selectedParty={posSelectedParty}
        parties={posParties}
        partySearch={posPartySearch}
        onPartySearchChange={setPosPartySearch}
        filteredParties={posFilteredParties}
        partyPopoverOpen={posPartyPopoverOpen}
        onPartyPopoverOpenChange={setPosPartyPopoverOpen}
        onSelectParty={setPosSelectedParty}
        onUpdateQty={updatePosQty}
        onRemoveFromCart={removePosFromCart}
        onClearCart={clearPosCart}
        paymentMethod={posPaymentMethod}
        onPaymentMethodChange={setPosPaymentMethod}
        discount={posDiscount}
        onDiscountChange={setPosDiscount}
        totals={posTotals}
        onProcessSale={handlePosProcessSale}
        isProcessing={posIsProcessing}
        pdfUrl={posPdfUrl}
        pdfTitle={posPdfTitle}
        pdfOpen={posPdfOpen}
        onPdfClose={() => setPosPdfOpen(false)}
      />
    </div>
  );
}