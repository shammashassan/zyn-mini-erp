// app/api/debit-notes/[id]/pdf/route.ts - FINAL: Using snapshots for PDF generation

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import dbConnect from "@/lib/dbConnect";
import DebitNote from "@/models/DebitNote";
import CompanyDetails from "@/models/CompanyDetails";
import Party from "@/models/Party";
import { DebitNoteDocument } from "@/components/DebitNoteDocument";
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
        { message: "Debit Note ID is missing or invalid" },
        { status: 400 }
      );
    }

    const { error } = await requireAuthAndPermission({
      debitNote: ["read"],
    });
    if (error) return error;

    await dbConnect();

    // Ensure Party model is registered
    const _ensureModels = [Party];

    // ✅ Allow finding soft-deleted debit notes for PDF generation
    const debitNote = await DebitNote.findById(id)
      .setOptions({ includeDeleted: true })
      .populate('connectedDocuments.returnNoteId', 'returnNumber')
      .populate('partyId');

    if (!debitNote) {
      return NextResponse.json({ message: "Debit Note not found" }, { status: 404 });
    }

    // ✅ Debit note already has snapshots, no need to populate
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

    const documentElement = React.createElement(DebitNoteDocument, {
      debitNote: debitNote.toObject(),
      companyDetails,
    });

    const pdfStream = await renderToStream(documentElement as any);

    return new NextResponse(pdfStream as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${debitNote.debitNoteNumber}_debit_note.pdf"`,
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