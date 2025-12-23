// app/api/delivery-notes/[id]/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DeliveryNote from "@/models/DeliveryNote";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

/**
 * GET - Fetch a single delivery note by ID
 */
export async function GET(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;
    
    // Check permission
    const { error } = await requireAuthAndPermission({
      deliveryNote: ["read"],
    });
    if (error) return error;
    
    const deliveryNoteQuery = DeliveryNote.findById(id);
    const includeDeleted = request.headers.get('X-Include-Deleted') === 'true';
    if (includeDeleted) {
      deliveryNoteQuery.setOptions({ includeDeleted: true });
    }
    const deliveryNote = await deliveryNoteQuery;
    
    if (!deliveryNote) {
      return NextResponse.json({ error: "Delivery note not found" }, { status: 404 });
    }
    
    if (deliveryNote.isDeleted && !includeDeleted) {
      return NextResponse.json({ 
        error: "This delivery note has been deleted" 
      }, { status: 410 });
    }
    
    return NextResponse.json(deliveryNote);
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to fetch delivery note ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * Helper function to detect changes
 */
function detectChanges(oldDeliveryNote: any, newData: any) {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
  const fieldsToTrack = ['status', 'grandTotal', 'discount', 'notes'];
  
  for (const field of fieldsToTrack) {
    if (newData[field] !== undefined && oldDeliveryNote[field] !== newData[field]) {
      changes.push({
        field,
        oldValue: oldDeliveryNote[field],
        newValue: newData[field],
      });
    }
  }
  
  return changes;
}

/**
 * PUT - Update a delivery note
 */
export async function PUT(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();
    
    // Check permission - for delivery notes, status update is a specific permission
    const { error, session } = await requireAuthAndPermission({
      deliveryNote: ["update_status"],
    });
    if (error) return error;

    const user = session.user;
    
    const currentDeliveryNote = await DeliveryNote.findById(id);
    if (!currentDeliveryNote) {
      return NextResponse.json({ error: "Delivery note not found" }, { status: 404 });
    }

    if (currentDeliveryNote.isDeleted) {
      return NextResponse.json({ 
        error: "Cannot update a deleted delivery note. Please restore it first." 
      }, { status: 400 });
    }

    const changes = detectChanges(currentDeliveryNote.toObject(), body);

    currentDeliveryNote.addAuditEntry(
      'Updated',
      user.id,
      user.username || user.name,
      changes.length > 0 ? changes : undefined
    );

    currentDeliveryNote.set({
      ...body,
      updatedBy: user.id,
    });

    await currentDeliveryNote.save();
    
    console.log(`✅ Delivery note ${id} updated successfully`);
    
    return NextResponse.json(currentDeliveryNote);
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to update delivery note ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update delivery note" }, { status: 400 });
  }
}

/**
 * DELETE - Soft delete delivery note
 */
export async function DELETE(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    // Check permission
    const { error, session } = await requireAuthAndPermission({
      deliveryNote: ["soft_delete"],
    });
    if (error) return error;

    const user = session.user;

    const deliveryNote = await DeliveryNote.findById(id);
    
    if (!deliveryNote) {
      return NextResponse.json({ error: "Delivery note not found" }, { status: 404 });
    }
    
    console.log(`🔴 DELETE /api/delivery-notes/${id}`);
    
    deliveryNote.addAuditEntry(
      'Soft Deleted',
      user.id,
      user.username || user.name
    );
    
    await deliveryNote.save();
    
    console.log(`Deleting delivery note ${deliveryNote.invoiceNumber}`);
    
    const deletedDeliveryNote = await softDelete(DeliveryNote, id, user.id, user.username || user.name);
    
    console.log(`✅ Successfully soft deleted delivery note ${deliveryNote.invoiceNumber}`);
    
    return NextResponse.json({ 
      message: "Delivery note soft deleted successfully",
      deliveryNote: deletedDeliveryNote 
    });
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to delete delivery note ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}