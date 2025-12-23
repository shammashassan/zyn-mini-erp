// app/api/invoices/[id]/route.ts - Updated with receivedAmount

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import Voucher from "@/models/Voucher";
import { softDelete } from "@/utils/softDelete";
import { handleInvoiceStatusChange } from '@/utils/journalAutoCreate';
import { voidJournalsForReference } from '@/utils/journalManager';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { UAE_VAT_PERCENTAGE } from "@/utils/constants"; // ✅ ADDED

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

/**
 * GET - Fetch a single invoice by ID with all details
 */
export async function GET(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    // Check permission
    const { error } = await requireAuthAndPermission({
      invoice: ["read"],
    });
    if (error) return error;

    const invoiceQuery = Invoice.findById(id);
    const includeDeleted = request.headers.get('X-Include-Deleted') === 'true';
    if (includeDeleted) {
      invoiceQuery.setOptions({ includeDeleted: true });
    }
    const invoice = await invoiceQuery;

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.isDeleted && !includeDeleted) {
      return NextResponse.json({
        error: "This invoice has been deleted"
      }, { status: 410 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to fetch invoice ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * Helper function to detect changes between old and new values
 */
function detectChanges(oldInvoice: any, newData: any) {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
  const fieldsToTrack = [
    'status',
    'grandTotal',
    'discount',
    'notes',
    'paidAmount',
    'receivedAmount'
  ];

  for (const field of fieldsToTrack) {
    if (newData[field] !== undefined && oldInvoice[field] !== newData[field]) {
      changes.push({
        field,
        oldValue: oldInvoice[field],
        newValue: newData[field],
      });
    }
  }

  return changes;
}

/**
 * PUT - Update an invoice with enhanced journal handling and automatic recalculation
 */
export async function PUT(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();

    // Check permission
    const { error, session } = await requireAuthAndPermission({
      invoice: ["update"],
    });
    if (error) return error;

    const user = session.user;

    const currentInvoice = await Invoice.findById(id);
    if (!currentInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (currentInvoice.isDeleted) {
      return NextResponse.json({
        error: "Cannot update a deleted invoice. Please restore it first."
      }, { status: 400 });
    }

    const oldStatus = currentInvoice.status;

    // ✅ FIXED: Recalculate with VAT on Gross Total
    // Use values from body if present, otherwise fallback to existing invoice values
    const items = body.items || currentInvoice.items;
    const discount = body.discount !== undefined ? body.discount : currentInvoice.discount;

    // 1. Gross Total = Sum of all items
    const grossTotal = items.reduce((sum: number, item: { total: number }) => sum + (item.total || 0), 0);

    // 3. Subtotal = Gross Total - Discount
    const subtotal = Math.max(grossTotal - discount, 0);

    // 2. VAT = Subtotal × 5%
    const vatAmount = subtotal * (UAE_VAT_PERCENTAGE / 100);

    // 4. Grand Total = Subtotal + VAT
    const grandTotal = subtotal + vatAmount;

    // Prepare the final update object
    const updateData = {
      ...body,
      items,         // Ensure consistent items
      discount,      // Ensure consistent discount
      totalAmount: grossTotal,  // ✅ Gross Total
      vatAmount,                // ✅ VAT on Gross Total
      grandTotal,               // ✅ Grand Total
      updatedBy: user.id,
    };

    const changes = detectChanges(currentInvoice.toObject(), updateData);

    currentInvoice.addAuditEntry(
      'Updated',
      user.id,
      user.username || user.name,
      changes.length > 0 ? changes : undefined
    );

    currentInvoice.set(updateData);

    await currentInvoice.save();

    console.log(`✅ Invoice ${id} updated successfully`);

    const statusChanged = body.status !== undefined && oldStatus !== body.status;

    if (statusChanged) {
      console.log(`📊 Status change detected: ${oldStatus} → ${body.status}`);

      await handleInvoiceStatusChange(
        currentInvoice.toObject(),
        oldStatus,
        body.status,
        user.id,
        user.username || user.name
      );
    } else {
      console.log(`ℹ️ No status change - skipping handleInvoiceStatusChange`);
    }

    return NextResponse.json(currentInvoice);
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to update invoice ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 400 });
  }
}

/**
 * DELETE - Soft delete with journal voiding
 */
export async function DELETE(request: Request, context: RequestContext) {
  try {
    await dbConnect();
    const { id } = await context.params;

    // Check permission
    const { error, session } = await requireAuthAndPermission({
      invoice: ["soft_delete"],
    });
    if (error) return error;

    const user = session.user;

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    console.log(`🔴 DELETE /api/invoices/${id}`);

    // Void all related journals when soft deleting
    await voidJournalsForReference(
      invoice._id,
      user.id,
      user.username || user.name,
      `Invoice soft deleted`
    );

    invoice.addAuditEntry(
      'Soft Deleted',
      user.id,
      user.username || user.name
    );

    await invoice.save();

    console.log(`Deleting invoice ${invoice.invoiceNumber}`);

    const deletedInvoice = await softDelete(Invoice, id, user.id, user.username || user.name);

    console.log(`✅ Successfully soft deleted invoice ${invoice.invoiceNumber}`);

    return NextResponse.json({
      message: "Invoice soft deleted successfully",
      invoice: deletedInvoice
    });
  } catch (error) {
    const params = await context.params;
    console.error(`❌ Failed to delete invoice ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}