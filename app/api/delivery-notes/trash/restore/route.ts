// app/api/delivery-notes/trash/restore/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DeliveryNote from "@/models/DeliveryNote";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;
    
    const { id } = body;
    
    // Get the delivery note before restoring
    const deliveryNoteToRestore = await DeliveryNote.findById(id).setOptions({ includeDeleted: true });
    
    if (!deliveryNoteToRestore) {
      return NextResponse.json({ error: "Delivery note not found" }, { status: 404 });
    }

    // Permission Check
    const { error, session } = await requireAuthAndPermission({
      deliveryNote: ["restore"],
    });
    if (error) return error;

    const user = session.user;
    
    if (!deliveryNoteToRestore.isDeleted) {
      return NextResponse.json({ 
        error: "Delivery note is not deleted" 
      }, { status: 400 });
    }
    
    // Restore the delivery note
    console.log(`♻️ Restoring delivery note ${deliveryNoteToRestore.invoiceNumber}...`);
    const restoredDeliveryNote = await restore(
      DeliveryNote, 
      id, 
      user?.id || null, 
      user?.username || user?.name || null
    );
    
    if (!restoredDeliveryNote) {
      return NextResponse.json({ error: "Delivery note not found" }, { status: 404 });
    }
    
    console.log(`✅ Delivery note restored: ${restoredDeliveryNote.invoiceNumber}`);
    
    return NextResponse.json({ 
      message: 'Delivery note restored successfully',
      deliveryNote: restoredDeliveryNote
    });
  } catch (error) {
    console.error("Failed to restore delivery note:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}