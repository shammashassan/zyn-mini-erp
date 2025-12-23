// app/api/quotations/trash/restore/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Quotation from "@/models/Quotation";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;
    
    const { id } = body;
    
    // Get the quotation before restoring
    const quotationToRestore = await Quotation.findById(id).setOptions({ includeDeleted: true });
    
    if (!quotationToRestore) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    // Permission Check
    const { error, session } = await requireAuthAndPermission({
      quotation: ["restore"],
    });
    if (error) return error;

    const user = session.user;
    
    if (!quotationToRestore.isDeleted) {
      return NextResponse.json({ 
        error: "Quotation is not deleted" 
      }, { status: 400 });
    }
    
    // Restore the quotation
    console.log(`♻️ Restoring quotation ${quotationToRestore.invoiceNumber}...`);
    const restoredQuotation = await restore(
      Quotation, 
      id, 
      user?.id || null, 
      user?.username || user?.name || null
    );
    
    if (!restoredQuotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }
    
    console.log(`✅ Quotation restored: ${restoredQuotation.invoiceNumber}`);
    
    return NextResponse.json({ 
      message: 'Quotation restored successfully',
      quotation: restoredQuotation
    });
  } catch (error) {
    console.error("Failed to restore quotation:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}