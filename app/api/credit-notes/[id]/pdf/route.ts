// app/api/credit-notes/[id]/pdf/route.ts - FINAL: Using snapshots for PDF generation

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import dbConnect from "@/lib/dbConnect";
import CreditNote from "@/models/CreditNote";
import CompanyDetails from "@/models/CompanyDetails";
import Party from "@/models/Party";
import { CreditNoteDocument } from "@/components/CreditNoteDocument";
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
        { message: "Credit Note ID is missing or invalid" },
        { status: 400 }
      );
    }

    const { error } = await requireAuthAndPermission({
      creditNote: ["read"],
    });
    if (error) return error;

    await dbConnect();

    // Ensure Party model is registered
    const _ensureModels = [Party];

    const creditNote = await CreditNote.findById(id)
      .setOptions({ includeDeleted: true })
      .populate('connectedDocuments.returnNoteId', 'returnNumber')
      .populate('partyId');

    if (!creditNote) {
      return NextResponse.json({ message: "Credit Note not found" }, { status: 404 });
    }

    // ✅ Credit note already has snapshots - use them for PDF
    let companyDetails = await CompanyDetails.findOne();

    if (!companyDetails) {
      companyDetails = {
        companyName: "My Company",
        address: "Address not set",
        email: "email@example.com",
        contactNumber: "",
      };
    }

    const documentElement = React.createElement(CreditNoteDocument, {
      creditNote: creditNote.toObject(),
      companyDetails,
    });

    const pdfStream = await renderToStream(documentElement as any);

    return new NextResponse(pdfStream as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${creditNote.creditNoteNumber}_credit_note.pdf"`,
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