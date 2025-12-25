// app/billing/page.tsx - UPDATED: Detailed calculations for summary

"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { BillingForm } from "./billing-form";
import type { BillPayload as OriginalBillPayload, Item } from "@/lib/types";
import type { ICustomer } from "@/models/Customer";
import type { IProduct } from "@/models/Product";
import type { ISupplier } from "@/models/Supplier";
import { ScrollText } from "lucide-react";
import { UAE_VAT_PERCENTAGE } from '@/utils/constants';
import { useBillPermissions } from "@/hooks/use-permissions";
import { AccessDenied } from "@/components/access-denied";
import { Spinner } from "@/components/ui/spinner";
import { PDFViewerModal } from "@/components/PDFViewerModal";
import { ca } from "date-fns/locale";

interface BillPayload extends Omit<OriginalBillPayload, 'documentType'> {
  documentType: "invoice" | "receipt" | "payment" | "quotation";
  supplierName?: string;
}

export default function CreateBillPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Ref to prevent double submission during network lag
  const isSubmittingRef = useRef(false);

  const [customers, setCustomers] = useState<ICustomer[]>([]);
  const [suppliers, setSuppliers] = useState<ISupplier[]>([]);
  const [products, setProducts] = useState<IProduct[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPdfUrl, setSelectedPdfUrl] = useState("");
  const [selectedPdfTitle, setSelectedPdfTitle] = useState("");
  const [redirectPath, setRedirectPath] = useState<string | null>(null);

  const [payload, setPayload] = useState<BillPayload>({
    customerName: "",
    supplierName: "",
    customerPhone: "",
    customerEmail: "",
    paymentMethod: "",
    notes: "",
    discount: 0,
    documentType: "invoice",
    status: "pending",
    items: [{ description: "", quantity: 1, rate: 0, total: 0 }],
  } as BillPayload);

  const { permissions: { canCreate } } = useBillPermissions();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!canCreate) return;

      try {
        const [customersRes, productsRes, suppliersRes] = await Promise.all([
          fetch('/api/customers'),
          fetch('/api/products'),
          fetch('/api/suppliers')
        ]);

        if (customersRes.ok) setCustomers(await customersRes.json());
        if (productsRes.ok) setProducts(await productsRes.json());
        if (suppliersRes.ok) setSuppliers(await suppliersRes.json());

      } catch (error) {
        console.error("Could not fetch initial data", error);
        toast.error("Failed to load necessary data.");
      }
    };

    if (isMounted && canCreate) {
      fetchData();
    }
  }, [isMounted, canCreate]);

  const updateItem = (index: number, field: keyof Item, value: string | number) => {
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
          if (strValue === "" || strValue === "-") {
            currentItem[field] = 0;
          } else {
            const numValue = parseFloat(strValue);
            currentItem[field] = isNaN(numValue) ? "" : numValue;
          }
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

  // Detailed calculation breakdown:
  // Gross Total = Sum of line items (before discount, before VAT)
  const grossTotal = isVoucher ? (payload.voucherAmount || 0) : payload.items.reduce((sum, item) => sum + item.total, 0);

  // Subtotal = Gross Total - Discount (this is the amount VAT is calculated on)
  const subTotal = isVoucher ? grossTotal : (grossTotal - payload.discount);

  // VAT = Subtotal × VAT%
  const vatAmount = isVoucher ? 0 : (subTotal * (UAE_VAT_PERCENTAGE / 100));

  // Grand Total = Subtotal + VAT
  const grandTotal = isVoucher ? grossTotal : (subTotal + vatAmount);

  const isFormValid = useMemo(() => {
    // For vouchers: Either customer or supplier must be provided
    if (isVoucher) {
      const hasParty = payload.customerName?.trim() || payload.supplierName?.trim();
      if (!hasParty) return false;
    } else {
      // For non-vouchers (invoice, quotation): Customer is required
      if (!payload.customerName?.trim()) return false;
    }

    const requiresPaymentMethod = payload.documentType === 'receipt' || payload.documentType === 'payment';

    if (requiresPaymentMethod && !payload.paymentMethod?.trim()) return false;

    if (requiresPaymentMethod) {
      if (!payload.voucherAmount || payload.voucherAmount <= 0) return false;
    } else {
      if (payload.items.length === 0) return false;
      const hasValidItem = payload.items.some(item => item.description.trim() && Number(item.quantity) > 0);
      if (!hasValidItem) return false;
      if (grandTotal < 0) return false;
    }

    return true;
  }, [payload.customerName, payload.supplierName, payload.paymentMethod, payload.documentType, payload.items, payload.voucherAmount, grandTotal, isVoucher]);

  const handleSubmit = async () => {
    // 1. Immediate Lock: Prevent double submission
    if (isSubmittingRef.current) return;

    // 2. Synchronous Validations (Safety Net)
    if (!canCreate) {
      toast.error(`You do not have permission to create a ${payload.documentType}`);
      return;
    }

    // Validation for vouchers: Either customer or supplier required
    if (isVoucher) {
      const hasParty = payload.customerName?.trim() || payload.supplierName?.trim();
      if (!hasParty) {
        toast.error("Either customer or supplier name is required");
        return;
      }
    } else {
      // For non-vouchers: Customer required
      if (!payload.customerName?.trim()) {
        toast.error("Customer name is required");
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

    // 3. Lock & Load
    isSubmittingRef.current = true;
    setIsLoading(true);

    try {
      let endpoint = "";
      let payloadToSend: any = { ...payload };
      let responseKey = "";
      let targetRoute = "";

      switch (payload.documentType) {
        case "invoice":
          endpoint = "/api/invoices";
          responseKey = "invoice";
          targetRoute = "/documents/invoices";
          payloadToSend.items = payload.items.map(item => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            rate: Number(item.rate) || 0,
          }));
          break;

        case "quotation":
          endpoint = "/api/quotations";
          responseKey = "quotation";
          targetRoute = "/documents/quotations";
          payloadToSend.items = payload.items.map(item => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            rate: Number(item.rate) || 0,
          }));
          break;

        case "receipt":
        case "payment":
          endpoint = "/api/vouchers";
          responseKey = "voucher";
          targetRoute = "/documents/vouchers";

          payloadToSend = {
            voucherType: payload.documentType,
            paymentMethod: payload.paymentMethod,
            customerName: payload.customerName || undefined,
            supplierName: payload.supplierName || undefined,
            customerPhone: payload.customerPhone,
            customerEmail: payload.customerEmail,
            notes: payload.notes,
            items: [],
            totalAmount: payload.voucherAmount,
            grandTotal: payload.voucherAmount,
            discount: 0,
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
          customerName: "",
          supplierName: "",
          customerPhone: "",
          customerEmail: "",
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
      // 4. Release Lock
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
          payload={payload as any}
          setPayload={setPayload as any}
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
          customers={customers}
          suppliers={suppliers}
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