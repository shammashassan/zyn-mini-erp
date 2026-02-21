// app/api/return-notes/[id]/pdf/route.ts

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import dbConnect from "@/lib/dbConnect";
import ReturnNote from "@/models/ReturnNote";
import CompanyDetails from "@/models/CompanyDetails";
import { ReturnNoteDocument } from "@/components/pdf/ReturnNoteDocument";
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
        { message: "Return Note ID is missing or invalid" },
        { status: 400 }
      );
    }

    // Check permission
    const { error } = await requireAuthAndPermission({
      returnNote: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const returnNote = await ReturnNote.findById(id)
      .setOptions({ includeDeleted: true })
      .populate('connectedDocuments.purchaseId', 'referenceNumber')
      .populate('connectedDocuments.invoiceId', 'invoiceNumber');

    if (!returnNote) {
      return NextResponse.json({ message: "Return Note not found" }, { status: 404 });
    }

    // Convert to plain object - snapshots are already in the database
    const returnNoteWithDetails = returnNote.toObject();


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

    const documentElement = React.createElement(ReturnNoteDocument, {
      returnNote: returnNoteWithDetails,
      companyDetails,
    });

    const pdfStream = await renderToStream(documentElement as any);

    return new NextResponse(pdfStream as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${returnNote.returnNumber}_return_note.pdf"`,
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