// app/api/credit-notes/[id]/pdf/route.ts

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import dbConnect from "@/lib/dbConnect";
import CreditNote from "@/models/CreditNote";
import CompanyDetails from "@/models/CompanyDetails";
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

    // Allow finding soft-deleted credit notes for PDF generation
    const creditNote = await CreditNote.findById(id)
      .setOptions({ includeDeleted: true })
      .populate('connectedDocuments.returnNoteId', 'returnNumber');

    if (!creditNote) {
      return NextResponse.json({ message: "Credit Note not found" }, { status: 404 });
    }

    // Fetch party contact details based on party type
    let creditNoteWithDetails = creditNote.toObject();

    if (creditNote.customerName) {
      const Customer = (await import('@/models/Customer')).default;
      const customer = await Customer.findOne({ name: creditNote.customerName });
      if (customer) {
        creditNoteWithDetails.customerPhone = customer.phone || '';
        creditNoteWithDetails.customerEmail = customer.email || '';
      }
    } else if (creditNote.supplierName) {
      const Supplier = (await import('@/models/Supplier')).default;
      const supplier = await Supplier.findOne({ name: creditNote.supplierName });
      if (supplier) {
        creditNoteWithDetails.supplierPhone = supplier.contactNumbers?.[0] || '';
        creditNoteWithDetails.supplierEmail = supplier.email || '';
      }
    } else if (creditNote.payeeName) {
      const Payee = (await import('@/models/Payee')).default;
      const payee = await Payee.findOne({ name: creditNote.payeeName });
      if (payee) {
        creditNoteWithDetails.payeePhone = payee.phone || '';
        creditNoteWithDetails.payeeEmail = payee.email || '';
      }
    }

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
      creditNote: creditNoteWithDetails,
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