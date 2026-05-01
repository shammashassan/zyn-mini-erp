// app/api/delivery-notes/[id]/route.ts - FINAL: Using party snapshots, removed legacy fields

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DeliveryNote from "@/models/DeliveryNote";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { createPartySnapshot } from "@/utils/partySnapshot";
import { getUserInfo } from "@/lib/auth-utils";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

/**
 * GET - Fetch a single delivery note by ID with populated invoice data
 */
export async function GET(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const { error } = await requireAuthAndPermission({
      deliveryNote: ["read"],
    });
    if (error) return error;

    // ✅ Check for populate query param
    const { searchParams } = new URL(request.url);
    const shouldPopulate = searchParams.get('populate') === 'true';

    let deliveryNoteQuery = DeliveryNote.findById(id);

    const includeDeleted = request.headers.get('X-Include-Deleted') === 'true';
    if (includeDeleted) {
      deliveryNoteQuery.setOptions({ includeDeleted: true });
    }

    // ✅ Populate invoice data if requested
    if (shouldPopulate) {
      deliveryNoteQuery = deliveryNoteQuery
        .populate({
          path: 'connectedDocuments.invoiceIds',
          select: 'invoiceNumber grandTotal status isDeleted',
          match: { isDeleted: false }
        })
        .populate({
          path: 'partyId',
          select: 'name company type roles'
        });
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
  const fieldsToTrack = ['status', 'grandTotal', 'discount', 'notes', 'deliveryDate'];

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
 * PUT - Update a delivery note with party snapshot updates if party changes
 */
export async function PUT(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();

    const { error, session } = await requireAuthAndPermission({
      deliveryNote: ["update"],
    });
    if (error) return error;

    const user = await getUserInfo();

    const currentDeliveryNote = await DeliveryNote.findById(id);
    if (!currentDeliveryNote) {
      return NextResponse.json({ error: "Delivery note not found" }, { status: 404 });
    }

    if (currentDeliveryNote.isDeleted) {
      return NextResponse.json({
        error: "Cannot update a deleted delivery note. Please restore it first."
      }, { status: 400 });
    }

    // ✅ Handle party/contact changes - update snapshots
    if (body.partyId && body.partyId !== currentDeliveryNote.partyId.toString()) {
      console.log(`🔄 Party changed for delivery note ${id}, updating snapshots`);

      const { partySnapshot, contactSnapshot } = await createPartySnapshot(
        body.partyId,
        body.contactId
      );

      body.partySnapshot = partySnapshot;
      body.contactSnapshot = contactSnapshot;

      console.log(`   Old Party: ${currentDeliveryNote.partySnapshot.displayName}`);
      console.log(`   New Party: ${partySnapshot.displayName}`);
    }
    // ✅ If only contact changed (same party)
    else if (body.contactId && body.contactId !== currentDeliveryNote.contactId?.toString()) {
      console.log(`🔄 Contact changed for delivery note ${id}, updating contact snapshot`);

      const { contactSnapshot } = await createPartySnapshot(
        currentDeliveryNote.partyId.toString(),
        body.contactId
      );

      body.contactSnapshot = contactSnapshot;
    }

    const changes = detectChanges(currentDeliveryNote.toObject(), body);

    currentDeliveryNote.addAuditEntry(
      'Updated',
      user.id,
      user.username || user.name,
      changes.length > 0 ? changes : undefined
    );

    if (body.deliveryDate) {
      body.deliveryDate = new Date(body.deliveryDate);
    }

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

    const { error, session } = await requireAuthAndPermission({
      deliveryNote: ["soft_delete"],
    });
    if (error) return error;

    const user = await getUserInfo();

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