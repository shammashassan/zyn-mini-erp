// app/api/vouchers/[id]/pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import dbConnect from "@/lib/dbConnect";
import Voucher from "@/models/Voucher";
import CompanyDetails from "@/models/CompanyDetails";
// 👇 Register both models so populate works
import "@/models/Invoice"; 
import "@/models/Purchase"; 

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

    // Fetch Voucher and POPULATE both Invoices and Purchases
    const voucher = await Voucher.findById(id)
      .populate({
        path: 'connectedDocuments.invoiceIds',
        model: 'Invoice',
        select: 'invoiceNumber' 
      })
      .populate({
        path: 'connectedDocuments.purchaseIds',
        model: 'Purchase',
        select: 'referenceNumber' // ✅ Using referenceNumber as per your Purchase model
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
      .setOptions({ includeDeleted: true });

    if (!voucher) {
      return NextResponse.json({ message: "Voucher not found" }, { status: 404 });
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
      bill: voucher,
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