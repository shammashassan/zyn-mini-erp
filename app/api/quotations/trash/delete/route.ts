// app/api/quotations/trash/delete/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Quotation from "@/models/Quotation";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * DELETE - Permanently delete a quotation
 */
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;
    
    const { id } = body;
    
    // Check if the quotation is soft-deleted first
    const quotation = await Quotation.findById(id).setOptions({ includeDeleted: true });
    
    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // Permission Check
    const { error } = await requireAuthAndPermission({
      quotation: ["permanent_delete"],
    });
    if (error) return error;
    
    if (!quotation.isDeleted) {
      return NextResponse.json({ 
        error: "Quotation must be soft-deleted before permanent deletion" 
      }, { status: 400 });
    }
    
    const deletedQuotation = await permanentDelete(Quotation, id);
    
    return NextResponse.json({ 
      message: "Quotation permanently deleted",
      quotation: deletedQuotation 
    });
  } catch (error) {
    console.error("Failed to permanently delete quotation:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}