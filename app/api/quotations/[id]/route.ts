// app/api/quotations/[id]/route.ts - UPDATED: Handle snapshot updates when party/contact changes

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Quotation from "@/models/Quotation";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { UAE_VAT_PERCENTAGE } from '@/utils/constants';
import { createPartySnapshot } from "@/utils/partySnapshot";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

/**
 * GET - Fetch a single quotation by ID
 */
export async function GET(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const { error } = await requireAuthAndPermission({
      quotation: ["read"],
    });
    if (error) return error;

    const quotationQuery = Quotation.findById(id);
    const includeDeleted = request.headers.get('X-Include-Deleted') === 'true';
    if (includeDeleted) {
      quotationQuery.setOptions({ includeDeleted: true });
    }
    const quotation = await quotationQuery;

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (quotation.isDeleted && !includeDeleted) {
      return NextResponse.json({
        error: "This quotation has been deleted"
      }, { status: 410 });
    }

    return NextResponse.json(quotation);
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to fetch quotation ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * Helper function to detect changes
 */
function detectChanges(oldQuotation: any, newData: any) {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
  const fieldsToTrack = ['status', 'grandTotal', 'discount', 'notes', 'quotationDate'];

  for (const field of fieldsToTrack) {
    if (newData[field] !== undefined && oldQuotation[field] !== newData[field]) {
      changes.push({
        field,
        oldValue: oldQuotation[field],
        newValue: newData[field],
      });
    }
  }

  return changes;
}

/**
 * PUT - Update a quotation with recalculation and snapshot handling
 */
export async function PUT(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();

    const { error, session } = await requireAuthAndPermission({
      quotation: ["update"],
    });
    if (error) return error;

    const user = session.user;

    const currentQuotation = await Quotation.findById(id);
    if (!currentQuotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (currentQuotation.isDeleted) {
      return NextResponse.json({
        error: "Cannot update a deleted quotation. Please restore it first."
      }, { status: 400 });
    }

    // ✅ Handle party/contact changes - update snapshots
    if (body.partyId && body.partyId !== currentQuotation.partyId.toString()) {
      console.log(`🔄 Party changed for quotation ${id}, updating snapshots`);

      const { partySnapshot, contactSnapshot } = await createPartySnapshot(
        body.partyId,
        body.contactId
      );

      body.partySnapshot = partySnapshot;
      body.contactSnapshot = contactSnapshot;

      console.log(`   Old Party: ${currentQuotation.partySnapshot.displayName}`);
      console.log(`   New Party: ${partySnapshot.displayName}`);
    }
    // ✅ If only contact changed (same party)
    else if (body.contactId && body.contactId !== currentQuotation.contactId?.toString()) {
      console.log(`🔄 Contact changed for quotation ${id}, updating contact snapshot`);

      const { contactSnapshot } = await createPartySnapshot(
        currentQuotation.partyId.toString(),
        body.contactId
      );

      body.contactSnapshot = contactSnapshot;
    }

    // Recalculate with VAT on Gross Total
    let calculatedData: any = {};

    if (body.items || body.discount !== undefined) {
      // Use updated items if provided, otherwise use existing
      const items = body.items || currentQuotation.items;
      const discount = body.discount !== undefined ? body.discount : currentQuotation.discount;

      // 1. Gross Total = Sum of all items
      const grossTotal = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);

      // 2. Subtotal = Gross Total - Discount
      const subtotal = Math.max(grossTotal - discount, 0);

      // 3. VAT = Subtotal × 5%
      const vatAmount = subtotal * (UAE_VAT_PERCENTAGE / 100);

      // 4. Grand Total = Subtotal + VAT
      const grandTotal = subtotal + vatAmount;

      calculatedData = {
        totalAmount: grossTotal,
        vatAmount: vatAmount,
        grandTotal: grandTotal,
      };

      console.log(`♻️ Recalculated quotation ${id}:`, {
        grossTotal,
        vatAmount,
        subtotal,
        discount,
        grandTotal
      });
    }

    // Merge body data with calculated data
    const updateData = {
      ...body,
      ...calculatedData,
      updatedBy: user.id,
    };

    // Detect changes for audit
    const changes = detectChanges(currentQuotation.toObject(), updateData);

    // Add audit entry
    currentQuotation.addAuditEntry(
      'Updated',
      user.id,
      user.username || user.name,
      changes.length > 0 ? changes : undefined
    );

    // Apply updates
    currentQuotation.set(updateData);

    await currentQuotation.save();

    console.log(`✅ Quotation ${id} updated successfully`);

    return NextResponse.json(currentQuotation);
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to update quotation ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update quotation" }, { status: 400 });
  }
}

/**
 * DELETE - Soft delete quotation
 */
export async function DELETE(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    const { error, session } = await requireAuthAndPermission({
      quotation: ["soft_delete"],
    });
    if (error) return error;

    const user = session.user;

    const quotation = await Quotation.findById(id);

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    console.log(`🔴 DELETE /api/quotations/${id}`);

    quotation.addAuditEntry(
      'Soft Deleted',
      user.id,
      user.username || user.name
    );

    await quotation.save();

    console.log(`Deleting quotation ${quotation.invoiceNumber}`);

    const deletedQuotation = await softDelete(Quotation, id, user.id, user.username || user.name);

    console.log(`✅ Successfully soft deleted quotation ${quotation.invoiceNumber}`);

    return NextResponse.json({
      message: "Quotation soft deleted successfully",
      quotation: deletedQuotation
    });
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to delete quotation ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}