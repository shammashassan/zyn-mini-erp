// app/api/invoices/trash/delete/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * DELETE - Permanently delete an invoice
 * Body: { id: string }
 */
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;
    
    const { id } = body;
    
    // Check if the invoice is soft-deleted first
    const invoice = await Invoice.findById(id).setOptions({ includeDeleted: true });
    
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Permission Check
    const { error } = await requireAuthAndPermission({
      invoice: ["permanent_delete"],
    });
    if (error) return error;
    
    if (!invoice.isDeleted) {
      return NextResponse.json({ 
        error: "Invoice must be soft-deleted before permanent deletion" 
      }, { status: 400 });
    }
    
    const deletedInvoice = await permanentDelete(Invoice, id);
    
    return NextResponse.json({ 
      message: "Invoice permanently deleted",
      invoice: deletedInvoice 
    });
  } catch (error) {
    console.error("Failed to permanently delete invoice:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}