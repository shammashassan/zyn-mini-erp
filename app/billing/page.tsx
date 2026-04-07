// app/billing/page.tsx
// Unified Create Document page.
// Default tab: POS. Secondary tab: Billing (existing form, untouched).
// Tab switcher lives in the header row → zero dead space above the sticky order panel.

"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { toast } from "sonner";
import { redirect, usePathname } from "next/navigation";
import { BillingForm } from "./billing-form";
import { POSView } from "./pos/pos-view";
import type { Item } from "@/lib/types";
import type {
  POSProduct, POSCartItem, POSParty,
} from "./pos/pos-types";
import { ScrollText, ShoppingBag } from "lucide-react";
import { useBillPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ─────────────────────────────────────────────────────────────────────────────
// Billing payload type — exported for child billing components
// ─────────────────────────────────────────────────────────────────────────────
export interface BillPayload {
  partyId?: string;
  contactId?: string;
  payeeName?: string;
  payeeId?: string;
  vendorName?: string;
  documentType: "invoice" | "quotation" | "receipt" | "payment";
  paymentMethod?: string;
  notes: string;
  discount: number;
  status: string;
  items: Item[];
  invoiceDate?: Date;
  quotationDate?: Date;
  voucherDate?: Date;
  voucherAmount?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Page component
// ─────────────────────────────────────────────────────────────────────────────
export default function CreateBillPage() {
  const pathname = usePathname();
  const { permissions: { canCreate }, session, isPending } = useBillPermissions();

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => { setIsMounted(true); }, []);

  // ── Tab state ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"pos" | "billing">("pos");

  // ═══════════════════════════════════════════════════════════════════════════
  // BILLING state — identical to original page.tsx, not changed
  // ═══════════════════════════════════════════════════════════════════════════
  const [billingIsLoading, setBillingIsLoading] = useState(false);
  const billingIsSubmittingRef = useRef(false);
  const [billingProducts, setBillingProducts] = useState<any[]>([]);
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [billingPdfUrl, setBillingPdfUrl] = useState("");
  const [billingPdfTitle, setBillingPdfTitle] = useState("");
  const [billingRedirectPath, setBillingRedirectPath] = useState<string | null>(null);

  const [payload, setPayload] = useState<BillPayload>({
    partyId: undefined, contactId: undefined,
    payeeName: "", payeeId: undefined, vendorName: "",
    paymentMethod: "", notes: "", discount: 0,
    documentType: "invoice", status: "pending",
    items: [{ description: "", quantity: 1, rate: 0, total: 0, taxRate: 0, taxAmount: 0 }],
    invoiceDate: new Date(), quotationDate: new Date(), voucherDate: new Date(),
  });

  useEffect(() => {
    if (!isMounted || !canCreate) return;
    fetch('/api/items?types=product')
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setBillingProducts(data); })
      .catch(() => toast.error("Failed to load products for billing."));
  }, [isMounted, canCreate]);

  const updateItem = (index: number, field: keyof Item, value: string | number | boolean) => {
    setPayload(prev => {
      const updatedItems = [...prev.items];
      const current = { ...updatedItems[index] };
      switch (field) {
        case "description": current.description = String(value); break;
        case "quantity": case "rate": case "taxRate": {
          const s = String(value);
          if (s === "") { current[field] = "" as any; }
          else if (s === "-") { current[field] = 0; }
          else { const n = parseFloat(s); current[field] = isNaN(n) ? 0 : n; }
          break;
        }
        case "shouldCreateProduct": current.shouldCreateProduct = Boolean(value); break;
      }
      const qty = Number(current.quantity) || 0;
      const rate = Number(current.rate) || 0;
      const tax = Number(current.taxRate) || 0;
      current.total = qty * rate;
      current.taxAmount = current.total * (tax / 100);
      updatedItems[index] = current;
      return { ...prev, items: updatedItems };
    });
  };

  const addItem = () => setPayload(prev => ({
    ...prev,
    items: [...prev.items, { description: "", quantity: 1, rate: 0, total: 0, taxRate: 0, taxAmount: 0 }],
  }));

  const removeItem = (index: number) =>
    setPayload(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));

  const isVoucher = payload.documentType === 'receipt' || payload.documentType === 'payment';
  const billingGrossTotal = isVoucher ? (payload.voucherAmount || 0) : payload.items.reduce((s, i) => s + i.total, 0);
  const billingSubTotal = isVoucher ? billingGrossTotal : billingGrossTotal - payload.discount;
  const billingVatAmount = isVoucher ? 0 : payload.items.reduce((s, i) => s + (i.taxAmount || 0), 0);
  const billingGrandTotal = isVoucher ? billingGrossTotal : billingSubTotal + billingVatAmount;

  const isFormValid = useMemo(() => {
    if (isVoucher) {
      if (!payload.partyId && !payload.payeeName?.trim() && !payload.vendorName?.trim()) return false;
    } else {
      if (!payload.partyId) return false;
    }
    const needsPayment = payload.documentType === 'receipt' || payload.documentType === 'payment';
    if (needsPayment && !payload.paymentMethod?.trim()) return false;
    if (needsPayment) {
      if (!payload.voucherAmount || payload.voucherAmount <= 0) return false;
    } else {
      if (payload.items.length === 0) return false;
      if (!payload.items.every(i => i.description.trim() && Number(i.quantity) > 0 && (i.rate as any) !== "")) return false;
      if (billingGrandTotal < 0) return false;
    }
    return true;
  }, [payload.partyId, payload.payeeName, payload.vendorName, payload.paymentMethod, payload.documentType, payload.items, payload.voucherAmount, billingGrandTotal, isVoucher]);

  const handleBillingSubmit = async () => {
    if (billingIsSubmittingRef.current) return;
    if (!canCreate) { toast.error(`No permission to create ${payload.documentType}`); return; }
    if (isVoucher) {
      if (!payload.partyId && !payload.payeeName?.trim() && !payload.vendorName?.trim()) { toast.error("Party, Payee, or Vendor is required"); return; }
    } else {
      if (!payload.partyId) { toast.error("Party is required"); return; }
    }
    const needsPayment = payload.documentType === 'receipt' || payload.documentType === 'payment';
    if (!needsPayment && billingGrandTotal < 0) { toast.error("Discount cannot exceed gross total"); return; }
    if (needsPayment) {
      if (!payload.paymentMethod?.trim()) { toast.error("Payment method is required"); return; }
      if (!payload.voucherAmount || payload.voucherAmount <= 0) { toast.error("Please enter a valid amount"); return; }
    } else {
      if (payload.items.length === 0) { toast.error("At least one item is required"); return; }
      for (const item of payload.items) {
        if (!item.description.trim()) { toast.error("Each item must have a description"); return; }
        if (Number(item.quantity) <= 0) { toast.error("Item quantity must be positive"); return; }
        if (Number(item.rate) < 0) { toast.error("Item rate cannot be negative"); return; }
      }
    }
    billingIsSubmittingRef.current = true;
    setBillingIsLoading(true);
    try {
      let endpoint = "", responseKey = "", targetRoute = "";
      let payloadToSend: any = { ...payload };
      switch (payload.documentType) {
        case "invoice":
          endpoint = "/api/invoices"; responseKey = "invoice"; targetRoute = "/sales/invoices";
          payloadToSend.items = payload.items.map(i => ({ ...i, quantity: Number(i.quantity) || 0, rate: Number(i.rate) || 0, taxRate: Number(i.taxRate) || 0, taxAmount: Number(i.taxAmount) || 0 }));
          payloadToSend.invoiceDate = payload.invoiceDate;
          break;
        case "quotation":
          endpoint = "/api/quotations"; responseKey = "quotation"; targetRoute = "/sales/quotations";
          payloadToSend.items = payload.items.map(i => ({ ...i, quantity: Number(i.quantity) || 0, rate: Number(i.rate) || 0, taxRate: Number(i.taxRate) || 0, taxAmount: Number(i.taxAmount) || 0 }));
          payloadToSend.quotationDate = payload.quotationDate;
          break;
        case "receipt": case "payment":
          endpoint = "/api/vouchers"; responseKey = "voucher";
          targetRoute = payload.documentType === 'receipt' ? "/sales/receipts" : "/sales/payments";
          payloadToSend = { voucherType: payload.documentType, paymentMethod: payload.paymentMethod, partyId: payload.partyId, contactId: payload.contactId, payeeName: payload.payeeName, payeeId: payload.payeeId, vendorName: payload.vendorName, notes: payload.notes, items: [], totalAmount: payload.voucherAmount, grandTotal: payload.voucherAmount, discount: 0, voucherDate: payload.voucherDate };
          break;
      }
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payloadToSend) });
      const data = await res.json();
      if (res.ok) {
        const docId = data[responseKey]?._id;
        const docNumber = data[responseKey]?.invoiceNumber;
        let pdfUrl = payload.documentType === 'invoice' ? `/api/invoices/${docId}/pdf`
          : payload.documentType === 'quotation' ? `/api/quotations/${docId}/pdf`
            : `/api/vouchers/${docId}/pdf?type=${payload.documentType}`;
        setBillingPdfUrl(pdfUrl);
        setBillingPdfTitle(docNumber || "Document");
        setBillingRedirectPath(targetRoute);
        setBillingModalOpen(true);
        toast.success(`${payload.documentType.toUpperCase()} ${docNumber} created successfully!`);
        setPayload(prev => ({ ...prev, partyId: undefined, contactId: undefined, payeeName: "", payeeId: undefined, vendorName: "", items: [{ description: "", quantity: 1, rate: 0, total: 0, taxRate: 0, taxAmount: 0 }], notes: "", voucherAmount: 0, discount: 0 }));
      } else {
        toast.error(data.error || "Failed to create document.");
      }
    } catch { toast.error("A server error occurred. Please try again."); }
    finally { billingIsSubmittingRef.current = false; setBillingIsLoading(false); }
  };

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
    if (isMounted && canCreate) { fetchPosProducts(); fetchPosParties(); }
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
  //
  // Key layout decisions:
  //   1. <Tabs> wraps the whole page so TabsContent can live anywhere inside it.
  //   2. <TabsList> is placed in the HEADER ROW (right side) — not below the
  //      heading. This means the two-column grid starts immediately after a
  //      single compact header line, eliminating the dead space that used to
  //      appear above the sticky order panel.
  //   3. TabsContent has no extra top margin (mt-0) because gap on the flex
  //      column is handled by the parent's gap-6.
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 flex-col p-4 md:p-6">
      <Tabs
        value={activeTab}
        onValueChange={v => setActiveTab(v as "pos" | "billing")}
        className="flex flex-col gap-6"
      >
        {/* ── Header row: icon + title LEFT, tab toggle RIGHT ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {activeTab === "pos"
              ? <ShoppingBag className="h-7 w-7 text-primary shrink-0" />
              : <ScrollText className="h-7 w-7 text-primary shrink-0" />
            }
            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-none">
                {activeTab === "pos" ? "Point of Sale" : "Create Document"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {activeTab === "pos"
                  ? "Quick sales terminal"
                  : "Fill in the details below to create a new document."}
              </p>
            </div>
          </div>

          {/* Tab switcher in the header, not below it */}
          <TabsList className="shrink-0">
            <TabsTrigger value="pos" className="gap-1.5">
              <ShoppingBag className="size-3.5" />
              POS
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-1.5">
              <ScrollText className="size-3.5" />
              Billing
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── POS tab ── */}
        <TabsContent value="pos" className="mt-0">
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
        </TabsContent>

        {/* ── Billing tab — BillingForm untouched, same wrapper as original ── */}
        <TabsContent value="billing" className="mt-0">
          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-linear-to-t *:data-[slot=card]:shadow-xs">
            <BillingForm
              payload={payload}
              setPayload={setPayload}
              updateItem={updateItem}
              addItem={addItem}
              removeItem={removeItem}
              handleSubmit={handleBillingSubmit}
              isLoading={billingIsLoading}
              isFormValid={isFormValid}
              grossTotal={billingGrossTotal}
              subTotal={billingSubTotal}
              vatAmount={billingVatAmount}
              grandTotal={billingGrandTotal}
              vatPercentage={0}
              products={billingProducts}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Billing PDF modal ── */}
      <PDFViewerModal
        isOpen={billingModalOpen}
        onClose={() => {
          setBillingModalOpen(false);
          if (billingRedirectPath) {
            // Use window.location to avoid importing useRouter in this file
            window.location.href = billingRedirectPath;
          }
        }}
        pdfUrl={billingPdfUrl}
        title={billingPdfTitle}
      />
    </div>
  );
}