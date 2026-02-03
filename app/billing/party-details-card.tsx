// app/billing/party-details-card.tsx - UPDATED: Imports BillPayload from page.tsx

"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BillPayload } from "./page"; // ✅ Import from page.tsx
import { PartyContactSelector, type PartyContactValue } from "@/components/PartyContactSelector";

interface PartyDetailsProps {
  payload: BillPayload;
  onFieldChange: (field: keyof BillPayload, value: any) => void;
}

export function PartyDetailsCard({ payload, onFieldChange }: PartyDetailsProps) {
  const isVoucher = payload.documentType === 'receipt' || payload.documentType === 'payment';

  // Determine allowed roles based on document type
  const allowedRoles = React.useMemo(() => {
    if (isVoucher) {
      // Vouchers can use any party type
      return ['customer', 'supplier', 'payee', 'vendor'] as const;
    } else {
      // Invoices and quotations use only customer role
      return ['customer'] as const;
    }
  }, [isVoucher]);

  // Build the current value from payload
  const partyContactValue: PartyContactValue = React.useMemo(() => {
    // Determine party type from payload
    let partyType: 'customer' | 'supplier' | 'payee' | 'vendor' = 'customer';

    if (payload.vendorName) {
      partyType = 'vendor';
    } else if (payload.payeeId || payload.payeeName) {
      partyType = 'payee';
    } else if (payload.partyId) {
      // We need to infer from the party's role
      // For now, default to customer for invoices/quotations
      partyType = isVoucher ? 'customer' : 'customer';
    }

    return {
      partyType,
      partyId: payload.partyId || payload.payeeId,
      partyName: payload.vendorName,
      contactId: payload.contactId,
    };
  }, [payload.partyId, payload.contactId, payload.payeeName, payload.payeeId, payload.vendorName, isVoucher]);

  const handlePartyContactChange = (value: PartyContactValue, party?: any) => {
    // Clear all party-related fields first
    onFieldChange("partyId", undefined);
    onFieldChange("contactId", undefined);
    onFieldChange("payeeName", "");
    onFieldChange("payeeId", undefined);
    onFieldChange("vendorName", "");

    // Set new values based on party type
    if (value.partyType === 'vendor') {
      onFieldChange("vendorName", value.partyName ?? "");
    } else if (value.partyType === 'payee') {
      if (party) {
        onFieldChange("payeeId", value.partyId);
        onFieldChange("payeeName", party.name || "");
      }
    } else {
      // customer or supplier (using Party system)
      onFieldChange("partyId", value.partyId);
      onFieldChange("contactId", value.contactId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Party Details</CardTitle>
      </CardHeader>
      <CardContent>
        <PartyContactSelector
          allowedRoles={allowedRoles as any}
          value={partyContactValue}
          onChange={handlePartyContactChange}
          showContactSelector={!isVoucher} // Only show contact selector for invoices/quotations
          showCreateButton={true}
          layout="vertical"
        />
      </CardContent>
    </Card>
  );
}