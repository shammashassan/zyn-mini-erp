import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import dbConnect from "@/lib/dbConnect";
import Quotation from "@/models/Quotation";
import CompanyDetails from "@/models/CompanyDetails";
import Party from "@/models/Party";
import { QuotationDocument } from "@/components/QuotationDocument";
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
        { message: "Quotation ID is missing or invalid" },
        { status: 400 }
      );
    }

    // Check permission
    const { error } = await requireAuthAndPermission({
      quotation: ["read"],
    });
    if (error) return error;

    await dbConnect();

    await dbConnect();

    // ✅ FIXED: Allow finding soft-deleted quotations for PDF generation
    // Ensure Party model is registered
    const _ensureModels = [Party];

    const quotation = await Quotation.findById(id)
      .setOptions({ includeDeleted: true })
      .populate('partyId');

    if (!quotation) {
      return NextResponse.json({ message: "Quotation not found" }, { status: 404 });
    }

    // Prepare quotation with details
    let quotationWithDetails = quotation.toObject();

    // Populate contact details from partyId if available
    if (quotation.partyId) {
      const party = quotation.partyId as any;
      quotationWithDetails.partyName = party.name || party.company;
      quotationWithDetails.partyPhone = party.phone || '';
      quotationWithDetails.partyEmail = party.email || '';
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

    const documentElement = React.createElement(QuotationDocument, {
      bill: quotationWithDetails,
      companyDetails,
    });

    const pdfStream = await renderToStream(documentElement as any);

    return new NextResponse(pdfStream as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${quotation.invoiceNumber}_quotation.pdf"`,
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