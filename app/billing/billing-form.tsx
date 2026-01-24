// app/billing/billing-form.tsx - UPDATED: Added grossTotal prop

"use client";

import type { Dispatch, SetStateAction } from "react";
import type { BillPayload, Item } from "@/lib/types";
import { CustomerDetailsCard } from "./customer-details-card";
import { DocumentDetailsCard } from "./document-details-card";
import { ItemsTable } from "./items-table";
import { SummaryActions } from "./summary-actions";
import type { ICustomer } from "@/models/Customer";
import type { IProduct } from "@/models/Product";
import type { ISupplier } from "@/models/Supplier";

interface BillingFormProps {
  payload: BillPayload;
  setPayload: Dispatch<SetStateAction<BillPayload>>;
  updateItem: (index: number, field: keyof Item, value: string | number | boolean) => void;
  addItem: () => void;
  removeItem: (index: number) => void;
  handleSubmit: () => void;
  isLoading: boolean;
  isFormValid: boolean;
  grossTotal: number;
  subTotal: number;
  vatAmount: number;
  grandTotal: number;
  vatPercentage: number;
  customers: ICustomer[];
  suppliers: ISupplier[];
  products: IProduct[];
}

export function BillingForm({
  payload,
  setPayload,
  updateItem,
  addItem,
  removeItem,
  handleSubmit,
  isLoading,
  isFormValid,
  grossTotal,
  subTotal,
  vatAmount,
  grandTotal,
  vatPercentage,
  customers,
  suppliers,
  products,
}: BillingFormProps) {
  const handleFieldChange = (field: keyof BillPayload, value: string | number | Date | null) => {
    setPayload((prev) => ({ ...prev, [field]: value }));
  };

  const isVoucher = payload.documentType === 'receipt' || payload.documentType === 'payment';

  return (
    <div className="space-y-6">
      {/* Responsive fix: 
         - Default (mobile to lg): 1 column
         - xl (1280px+): 2 columns
         This prevents squishing on 1040px screens
      */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CustomerDetailsCard
          payload={payload}
          onFieldChange={handleFieldChange}
          customers={customers}
          suppliers={suppliers}
        />
        <DocumentDetailsCard payload={payload} onFieldChange={handleFieldChange} />
      </div>

      {!isVoucher && (
        <ItemsTable
          items={payload.items}
          products={products}
          updateItem={updateItem}
          addItem={addItem}
          removeItem={removeItem}
        />
      )}

      <SummaryActions
        discount={payload.discount}
        handleSubmit={handleSubmit}
        isLoading={isLoading}
        isFormValid={isFormValid}
        grossTotal={grossTotal}
        subTotal={subTotal}
        vatAmount={vatAmount}
        grandTotal={grandTotal}
        vatPercentage={vatPercentage}
      />
    </div>
  );
}