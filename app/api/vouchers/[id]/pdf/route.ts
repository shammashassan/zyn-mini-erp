// app/api/vouchers/[id]/pdf/route.ts - PDF generation using party/contact snapshots

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import dbConnect from "@/lib/dbConnect";
import Voucher from "@/models/Voucher";
import CompanyDetails from "@/models/CompanyDetails";
import "@/models/Invoice";
import "@/models/Purchase";
import "@/models/Expense";
import "@/models/DebitNote";
import "@/models/CreditNote";
import Party from "@/models/Party";

import { VoucherDocument } from "@/components/VoucherDocument";
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

export async function GET(
  request: NextRequest,
  context: RequestContext
) {
  try {
    const { id } = await context.params;

    if (!id || id === "undefined") {
      return NextResponse.json(
        { message: "Voucher ID is missing or invalid" },
        { status: 400 }
      );
    }

    // Check permission
    const { error } = await requireAuthAndPermission({
      voucher: ["read"],
    });
    if (error) return error;

    await dbConnect();

    // ✅ Fetch Voucher and POPULATE connected documents for display
    const voucher = await Voucher.findById(id)
      .populate({
        path: 'connectedDocuments.invoiceIds',
        model: 'Invoice',
        select: 'invoiceNumber'
      })
      .populate({
        path: 'connectedDocuments.purchaseIds',
        model: 'Purchase',
        select: 'referenceNumber'
      })
      .populate({
        path: 'connectedDocuments.expenseIds',
        model: 'Expense',
        select: 'referenceNumber'
      })
      .populate({
        path: 'connectedDocuments.debitNoteIds',
        model: 'DebitNote',
        select: 'debitNoteNumber'
      })
      .populate({
        path: 'connectedDocuments.creditNoteIds',
        model: 'CreditNote',
        select: 'creditNoteNumber'
      })
      .populate('partyId')
      .setOptions({ includeDeleted: true });

    if (!voucher) {
      return NextResponse.json({ message: "Voucher not found" }, { status: 404 });
    }

    // ✅ Prepare voucher with details
    let voucherWithDetails = voucher.toObject();

    // ✅ IMPORTANT: For PDF, we use snapshots as primary source
    // Only populate contact details from partyId if snapshots don't exist (backward compatibility)
    if (!voucherWithDetails.partySnapshot && voucher.partyId) {
      const party = voucher.partyId as any;
      const pName = party.name || party.company;
      voucherWithDetails.partyName = pName;
      voucherWithDetails.payeeName = pName;
      voucherWithDetails.vendorName = pName;
    }

    // Fetch Company Details
    let companyDetails = await CompanyDetails.findOne();

    if (!companyDetails) {
      companyDetails = {
        companyName: "My Company",
        address: "Address not set",
        email: "email@example.com",
        contactNumber: "",
      };
    }

    const documentElement = React.createElement(VoucherDocument, {
      bill: voucherWithDetails,
      companyDetails,
    });

    const pdfStream = await renderToStream(documentElement as any);

    return new NextResponse(pdfStream as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${voucher.invoiceNumber}_${voucher.voucherType}.pdf"`,
      },
    });
  } catch (error: any) {
    console.error("PDF Generation Error:", error);
    return NextResponse.json(
      { message: "Failed to generate PDF", error: error.message },
      { status: 500 }
    );
  }
}