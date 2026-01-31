// app/api/invoices/[id]/pdf/route.ts - FINAL: Using snapshots for PDF generation

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import CompanyDetails from "@/models/CompanyDetails";
import Party from "@/models/Party";
import { InvoiceDocument } from "@/components/InvoiceDocument";
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
        { message: "Invoice ID is missing or invalid" },
        { status: 400 }
      );
    }

    // Check permission
    const { error } = await requireAuthAndPermission({
      invoice: ["read"],
    });
    if (error) return error;

    await dbConnect();

    // Ensure Party model is registered
    const _ensureModels = [Party];

    // ✅ Allow finding soft-deleted invoices for PDF generation
    const invoice = await Invoice.findById(id)
      .setOptions({ includeDeleted: true })
      .populate('partyId');

    if (!invoice) {
      return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
    }

    // ✅ Invoice already has snapshots, no need to populate
    // Snapshots are the source of truth for PDF generation

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

    const documentElement = React.createElement(InvoiceDocument, {
      bill: invoice,
      companyDetails,
      type: "invoice",
    });

    const pdfStream = await renderToStream(documentElement as any);

    return new NextResponse(pdfStream as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${invoice.invoiceNumber}_invoice.pdf"`,
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