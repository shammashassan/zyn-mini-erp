// app/billing/page.tsx - REFACTORED: BillPayload interface declared inside

"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { BillingForm } from "./billing-form";
import type { Item } from "@/lib/types";
import type { IProduct } from "@/models/Product";
import { ScrollText } from "lucide-react";
import { UAE_VAT_PERCENTAGE } from '@/utils/constants';
import { useBillPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { PDFViewerModal } from "@/components/PDFViewerModal";

// ✅ BillPayload interface declared inside the billing page
interface BillPayload {
  // Party/Contact system (for invoices/quotations)
  partyId?: string;
  contactId?: string;

  // Payee (for vouchers - from Payee collection)
  payeeName?: string;
  payeeId?: string;

  // Vendor (for vouchers - manual input)
  vendorName?: string;

  // Document details
  documentType: "invoice" | "quotation" | "receipt" | "payment";
  paymentMethod?: string;
  notes: string;
  discount: number;
  status: string;
  items: Item[];

  // Dates
  invoiceDate?: Date;
  quotationDate?: Date;
  voucherDate?: Date;

  // Voucher-specific
  voucherAmount?: number;
}

export default function CreateBillPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isSubmittingRef = useRef(false);

  const [products, setProducts] = useState<IProduct[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  const [payload, setPayload] = useState<BillPayload>({
    partyId: undefined,
    contactId: undefined,
    payeeName: "",
    payeeId: undefined,
    vendorName: "",
    paymentMethod: "",
    notes: "",
    discount: 0,
    documentType: "invoice",
    status: "pending",
    items: [{ description: "", quantity: 1, rate: 0, total: 0 }],
    invoiceDate: new Date(),
    quotationDate: new Date(),
    voucherDate: new Date(),
  });

  const { permissions: { canCreate } } = useBillPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!canCreate) return;

      try {
        const productsRes = await fetch('/api/products');
        if (productsRes.ok) setProducts(await productsRes.json());
      } catch (error) {
        console.error("Could not fetch initial data", error);
        toast.error("Failed to load necessary data.");
      }
    };

    if (isMounted && canCreate) {
      fetchData();
    }
  }, [isMounted, canCreate]);

  const updateItem = (index: number, field: keyof Item, value: string | number | boolean) => {
    setPayload(prev => {
      const updatedItems = [...prev.items];
      const currentItem = { ...updatedItems[index] };

      switch (field) {
        case "description":
          currentItem.description = String(value);
          break;
        case "quantity":
        case "rate":
          const strValue = String(value);
          if (strValue === "") {
            currentItem[field] = "" as any;
          } else if (strValue === "-") {
            currentItem[field] = 0;
          } else {
            const numValue = parseFloat(strValue);
            currentItem[field] = isNaN(numValue) ? 0 : numValue;
          }
          break;
        case "shouldCreateProduct":
          currentItem.shouldCreateProduct = Boolean(value);
          break;
      }

      const quantity = Number(currentItem.quantity) || 0;
      const rate = Number(currentItem.rate) || 0;
      currentItem.total = quantity * rate;

      updatedItems[index] = currentItem;
      return { ...prev, items: updatedItems };
    });
  };

  const addItem = () => {
    setPayload(prev => ({
      ...prev,
      items: [...prev.items, { description: "", quantity: 1, rate: 0, total: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    setPayload(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const isVoucher = payload.documentType === 'receipt' || payload.documentType === 'payment';

  const grossTotal = isVoucher ? (payload.voucherAmount || 0) : payload.items.reduce((sum, item) => sum + item.total, 0);
  const subTotal = isVoucher ? grossTotal : (grossTotal - payload.discount);
  const vatAmount = isVoucher ? 0 : (subTotal * (UAE_VAT_PERCENTAGE / 100));
  const grandTotal = isVoucher ? grossTotal : (subTotal + vatAmount);

  const isFormValid = useMemo(() => {
    if (isVoucher) {
      const hasParty = payload.partyId || payload.payeeName?.trim() || payload.vendorName?.trim();
      if (!hasParty) return false;
    } else {
      if (!payload.partyId) return false;
    }

    const requiresPaymentMethod = payload.documentType === 'receipt' || payload.documentType === 'payment';

    if (requiresPaymentMethod && !payload.paymentMethod?.trim()) return false;

    if (requiresPaymentMethod) {
      if (!payload.voucherAmount || payload.voucherAmount <= 0) return false;
    } else {
      if (payload.items.length === 0) return false;

      const allItemsValid = payload.items.every(item =>
        item.description.trim() &&
        Number(item.quantity) > 0 &&
        (item.rate as any) !== ""
      );

      if (!allItemsValid) return false;
      if (grandTotal < 0) return false;
    }

    return true;
  }, [payload.partyId, payload.payeeName, payload.vendorName, payload.paymentMethod, payload.documentType, payload.items, payload.voucherAmount, grandTotal, isVoucher]);

  const handleSubmit = async () => {
    if (isSubmittingRef.current) return;

    if (!canCreate) {
      toast.error(`You do not have permission to create a ${payload.documentType}`);
      return;
    }

    if (isVoucher) {
      const hasParty = payload.partyId || payload.payeeName?.trim() || payload.vendorName?.trim();
      if (!hasParty) {
        toast.error("Party, Payee, or Vendor is required");
        return;
      }
    } else {
      if (!payload.partyId) {
        toast.error("Party is required");
        return;
      }
    }

    const isVoucherCheck = payload.documentType === 'receipt' || payload.documentType === 'payment';

    if (!isVoucherCheck && grandTotal < 0) {
      toast.error("Discount cannot exceed the gross total");
      return;
    }

    if (isVoucherCheck) {
      if (!payload.paymentMethod?.trim()) {
        toast.error("Payment method is required");
        return;
      }
      if (!payload.voucherAmount || payload.voucherAmount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }
    } else {
      if (payload.items.length === 0) {
        toast.error("At least one item is required");
        return;
      }
      for (const item of payload.items) {
        if (!item.description.trim()) {
          toast.error("Each item must have a description");
          return;
        }
        if (Number(item.quantity) <= 0) {
          toast.error("Item quantity must be positive");
          return;
        }
        if (Number(item.rate) < 0) {
          toast.error("Item rate cannot be negative");
          return;
        }
      }
    }

    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      const isVoucherDoc = payload.documentType === 'receipt' || payload.documentType === 'payment';
      if (!isVoucherDoc) {
        const itemsWithProductCreation = await Promise.all(
          payload.items.map(async (item) => {
            if (item.shouldCreateProduct && item.description.trim()) {
              try {
                const productPayload = {
                  name: item.description.trim(),
                  type: "General",
                  price: Number(item.rate) || 0,
                };

                const response = await fetch("/api/products", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(productPayload),
                });

                if (response.ok) {
                  toast.success(`Product "${item.description}" created`);
                  return { ...item, shouldCreateProduct: false };
                } else {
                  const error = await response.json();
                  toast.error(`Failed to create product "${item.description}"`, {
                    description: error.error || "Continuing with custom item"
                  });
                  return { ...item, shouldCreateProduct: false };
                }
              } catch (error) {
                console.error("Error creating product:", error);
                toast.error(`Failed to create product "${item.description}"`);
                return { ...item, shouldCreateProduct: false };
              }
            }
            return item;
          })
        );

        payload.items = itemsWithProductCreation;
      }

      let endpoint = "";
      let payloadToSend: any = { ...payload };
      let responseKey = "";
      let targetRoute = "";

      switch (payload.documentType) {
        case "invoice":
          endpoint = "/api/invoices";
          responseKey = "invoice";
          targetRoute = "/sales/invoices";
          payloadToSend.items = payload.items.map(item => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            rate: Number(item.rate) || 0,
          }));
          payloadToSend.invoiceDate = payload.invoiceDate;
          break;

        case "quotation":
          endpoint = "/api/quotations";
          responseKey = "quotation";
          targetRoute = "/sales/quotations";
          payloadToSend.items = payload.items.map(item => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            rate: Number(item.rate) || 0,
          }));
          payloadToSend.quotationDate = payload.quotationDate;
          break;

        case "receipt":
        case "payment":
          endpoint = "/api/vouchers";
          responseKey = "voucher";
          targetRoute = payload.documentType === 'receipt' ? "/sales/receipts" : "/sales/payments";

          payloadToSend = {
            voucherType: payload.documentType,
            paymentMethod: payload.paymentMethod,
            partyId: payload.partyId,
            contactId: payload.contactId,
            payeeName: payload.payeeName,
            payeeId: payload.payeeId,
            vendorName: payload.vendorName,
            notes: payload.notes,
            items: [],
            totalAmount: payload.voucherAmount,
            grandTotal: payload.voucherAmount,
            discount: 0,
            voucherDate: payload.voucherDate,
          };
          break;
      }

      console.log(`📋 Creating ${payload.documentType} at ${endpoint}`);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadToSend),
      });

      const data = await res.json();

      if (res.ok) {
        const docId = data[responseKey]?._id;
        const docNumber = data[responseKey]?.invoiceNumber;

        let pdfUrl = "";
        if (payload.documentType === 'invoice') pdfUrl = `/api/invoices/${docId}/pdf`;
        else if (payload.documentType === 'quotation') pdfUrl = `/api/quotations/${docId}/pdf`;
        else pdfUrl = `/api/vouchers/${docId}/pdf?type=${payload.documentType}`;

        setSelectedPdfUrl(pdfUrl);
        setSelectedPdfTitle(docNumber || "Document");
        setRedirectPath(targetRoute);
        setIsModalOpen(true);

        toast.success(`${payload.documentType.toUpperCase()} ${docNumber} created successfully!`);

        setPayload(prev => ({
          ...prev,
          partyId: undefined,
          contactId: undefined,
          payeeName: "",
          payeeId: undefined,
          vendorName: "",
          items: [{ description: "", quantity: 1, rate: 0, total: 0 }],
          notes: "",
          voucherAmount: 0,
          discount: 0
        }));

      } else {
        toast.error(data.error || "Failed to create document.");
      }
    } catch (err) {
      console.error("Error creating document:", err);
      toast.error("A server error occurred. Please try again.");
    } finally {
      isSubmittingRef.current = false;
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    if (redirectPath) {
      router.push(redirectPath);
    }
  };

  if (!isMounted) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner className="size-10" />
      </div>
    );
  }

  if (!canCreate) {
    return <AccessDenied />
  }

  return (
    <div className="container mx-auto max-w-5xl p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ScrollText className="h-12 w-12 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Document</h1>
            <p className="text-muted-foreground">Fill in the details below to create a new document.</p>
          </div>
        </div>
      </div>

      <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs">
        <BillingForm
          payload={payload}
          setPayload={setPayload}
          updateItem={updateItem}
          addItem={addItem}
          removeItem={removeItem}
          handleSubmit={handleSubmit}
          isLoading={isLoading}
          isFormValid={isFormValid}
          grossTotal={grossTotal}
          subTotal={subTotal}
          vatAmount={vatAmount}
          grandTotal={grandTotal}
          vatPercentage={UAE_VAT_PERCENTAGE}
          products={products}
        />
      </div>

      <PDFViewerModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        pdfUrl={selectedPdfUrl}
        title={selectedPdfTitle}
      />
    </div>
  );
}

// Export BillPayload type for use in child components
export type { BillPayload };