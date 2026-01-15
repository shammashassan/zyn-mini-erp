// app/api/delivery-notes/[id]/pdf/route.ts - FIXED: Populate invoice data for PDF

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import dbConnect from "@/lib/dbConnect";
import DeliveryNote from "@/models/DeliveryNote";
import CompanyDetails from "@/models/CompanyDetails";
import { DeliveryNoteDocument } from "@/components/DeliveryNoteDocument";
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
        { message: "Delivery note ID is missing or invalid" },
        { status: 400 }
      );
    }

    // Check permission
    const { error } = await requireAuthAndPermission({
      deliveryNote: ["read"],
    });
    if (error) return error;

    await dbConnect();

    // ✅ FIXED: Populate invoice data for "Against Invoice" display
    const deliveryNote = await DeliveryNote.findById(id)
      .setOptions({ includeDeleted: true })
      .populate({
        path: 'connectedDocuments.invoiceIds',
        select: 'invoiceNumber grandTotal status customerName',
        match: { isDeleted: false }
      });

    if (!deliveryNote) {
      return NextResponse.json({ message: "Delivery note not found" }, { status: 404 });
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

    const documentElement = React.createElement(DeliveryNoteDocument, {
      bill: deliveryNote,
      companyDetails,
    });

    const pdfStream = await renderToStream(documentElement as any);

    return new NextResponse(pdfStream as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${deliveryNote.invoiceNumber}_delivery.pdf"`,
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