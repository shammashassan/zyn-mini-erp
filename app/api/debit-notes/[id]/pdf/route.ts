// app/api/debit-notes/[id]/pdf/route.ts - PDF Generation

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToStream } from "@react-pdf/renderer";
import dbConnect from "@/lib/dbConnect";
import DebitNote from "@/models/DebitNote";
import CompanyDetails from "@/models/CompanyDetails";
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

    // Allow finding soft-deleted debit notes for PDF generation
    const debitNote = await DebitNote.findById(id)
      .setOptions({ includeDeleted: true })
      .populate('connectedDocuments.returnNoteId', 'returnNumber');

    if (!debitNote) {
      return NextResponse.json({ message: "Debit Note not found" }, { status: 404 });
    }

    // Fetch party contact details based on party type
    let debitNoteWithDetails = debitNote.toObject();

    if (debitNote.supplierName) {
      const Supplier = (await import('@/models/Supplier')).default;
      const supplier = await Supplier.findOne({ name: debitNote.supplierName });
      if (supplier) {
        debitNoteWithDetails.supplierPhone = supplier.contactNumbers?.[0] || '';
        debitNoteWithDetails.supplierEmail = supplier.email || '';
      }
    } else if (debitNote.customerName) {
      const Customer = (await import('@/models/Customer')).default;
      const customer = await Customer.findOne({ name: debitNote.customerName });
      if (customer) {
        debitNoteWithDetails.customerPhone = customer.phone || '';
        debitNoteWithDetails.customerEmail = customer.email || '';
      }
    } else if (debitNote.payeeName) {
      const Payee = (await import('@/models/Payee')).default;
      const payee = await Payee.findOne({ name: debitNote.payeeName });
      if (payee) {
        debitNoteWithDetails.payeePhone = payee.phone || '';
        debitNoteWithDetails.payeeEmail = payee.email || '';
      }
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

    const documentElement = React.createElement(DebitNoteDocument, {
      debitNote: debitNoteWithDetails,
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