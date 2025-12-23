// app/api/delivery-notes/trash/delete/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DeliveryNote from "@/models/DeliveryNote";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * DELETE - Permanently delete a delivery note
 */
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;
    
    const { id } = body;
    
    // Check if the delivery note is soft-deleted first
    const deliveryNote = await DeliveryNote.findById(id).setOptions({ includeDeleted: true });
    
    if (!deliveryNote) {
      return NextResponse.json({ error: "Delivery note not found" }, { status: 404 });
    }

    // Permission Check
    const { error } = await requireAuthAndPermission({
      deliveryNote: ["permanent_delete"],
    });
    if (error) return error;
    
    if (!deliveryNote.isDeleted) {
      return NextResponse.json({ 
        error: "Delivery note must be soft-deleted before permanent deletion" 
      }, { status: 400 });
    }
    
    const deletedDeliveryNote = await permanentDelete(DeliveryNote, id);
    
    return NextResponse.json({ 
      message: "Delivery note permanently deleted",
      deliveryNote: deletedDeliveryNote 
    });
  } catch (error) {
    console.error("Failed to permanently delete delivery note:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}