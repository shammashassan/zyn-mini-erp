// app/api/invoices/[id]/route.ts - FINAL: Using snapshots, removed legacy fields

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import Voucher from "@/models/Voucher";
import { softDelete } from "@/utils/softDelete";
import { handleInvoiceStatusChange } from '@/utils/journalAutoCreate';
import { voidJournalsForReference } from '@/utils/journalManager';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { getUserInfo } from "@/lib/auth-utils";
import { createPartySnapshot } from "@/utils/partySnapshot";
import { deductStockForInvoice, reverseStockForInvoice } from "@/utils/inventoryManager";

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
    'receivedAmount',
    'invoiceDate'
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

    const { error, session } = await requireAuthAndPermission({
      invoice: ["update"],
    });
    if (error) return error;

    const user = await getUserInfo();

    const currentInvoice = await Invoice.findById(id);
    if (!currentInvoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (currentInvoice.isDeleted) {
      return NextResponse.json({
        error: "Cannot update a deleted invoice. Please restore it first."
      }, { status: 400 });
    }

    // ✅ Handle party/contact changes - update snapshots
    if (body.partyId && body.partyId !== currentInvoice.partyId.toString()) {

      const { partySnapshot, contactSnapshot } = await createPartySnapshot(
        body.partyId,
        body.contactId
      );

      body.partySnapshot = partySnapshot;
      body.contactSnapshot = contactSnapshot;

    }
    // ✅ If only contact changed (same party)
    else if (body.contactId && body.contactId !== currentInvoice.contactId?.toString()) {

      const { contactSnapshot } = await createPartySnapshot(
        currentInvoice.partyId.toString(),
        body.contactId
      );

      body.contactSnapshot = contactSnapshot;
    }

    const oldStatus = currentInvoice.status;

    // Trust frontend-calculated totals. VAT = sum of per-line taxAmount stored on items.
    const items = body.items || currentInvoice.items;
    const discount = body.discount !== undefined ? body.discount : currentInvoice.discount;
    const grossTotal = items.reduce((sum: number, item: { total: number }) => sum + (item.total || 0), 0);
    const subtotal = Math.max(grossTotal - discount, 0);

    const finalVatAmount = body.vatAmount ?? currentInvoice.vatAmount;
    const finalTotalAmount = body.totalAmount ?? grossTotal;
    const finalGrandTotal = body.grandTotal ?? subtotal + finalVatAmount;

    const updateData = {
      ...body,
      items,
      discount,
      totalAmount: finalTotalAmount,
      vatAmount: finalVatAmount,
      grandTotal: finalGrandTotal,
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

    // ✅ Validate before applying external effects and saving
    await currentInvoice.validate();

    const statusChanged = body.status !== undefined && oldStatus !== body.status;
    let stockDeducted = false;
    let stockReversed = false;

    if (statusChanged) {

      // ✅ STOCK DEDUCTION: Deduct stock when invoice is approved
      if (body.status === 'approved' && oldStatus !== 'approved') {
        try {
          await deductStockForInvoice(
            currentInvoice._id,
            currentInvoice.items
          );
          stockDeducted = true;
        } catch (stockError: any) {
          return NextResponse.json({
            error: `Cannot approve invoice: ${stockError.message}`
          }, { status: 400 });
        }
      }

      // ✅ STOCK REVERSAL: Restore stock when invoice status changes from approved
      if (oldStatus === 'approved' && body.status !== 'approved') {
        try {
          await reverseStockForInvoice(
            currentInvoice._id,
            currentInvoice.items
          );
          stockReversed = true;
        } catch (stockError: any) {
          console.error(`❌ Stock reversal failed:`, stockError);
          // Don't fail the status change if stock reversal fails, but log it
        }
      }
    }

    try {
      await currentInvoice.save();
    } catch (saveError) {
      // ⚠️ CRITICAL: Rollback inventory if DB save fails
      if (stockDeducted) {
        try { await reverseStockForInvoice(currentInvoice._id, currentInvoice.items); } catch (e) { console.error('Rollback failed:', e); }
      }
      if (stockReversed) {
        try { await deductStockForInvoice(currentInvoice._id, currentInvoice.items); } catch (e) { console.error('Rollback failed:', e); }
      }
      throw saveError;
    }

    if (statusChanged) {
      await handleInvoiceStatusChange(
        currentInvoice.toObject(),
        oldStatus,
        body.status,
        user.id,
        user.username || user.name
      );
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

    const { error, session } = await requireAuthAndPermission({
      invoice: ["soft_delete"],
    });
    if (error) return error;

    const user = await getUserInfo();

    const invoice = await Invoice.findById(id);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }



    // Void all related journals when soft deleting
    await voidJournalsForReference(
      invoice._id,
      user.id,
      user.username || user.name,
      `Invoice soft deleted`
    );

    // ✅ Reverse stock deduction if invoice was approved
    if (invoice.status === 'approved') {
      try {
        await reverseStockForInvoice(invoice._id, invoice.items);
      } catch (stockError) {
        console.error('Error reversing stock:', stockError);
        // Don't fail the delete if stock reversal fails, but log it
      }
    }

    invoice.addAuditEntry(
      'Soft Deleted',
      user.id,
      user.username || user.name
    );

    await invoice.save();

    const deletedInvoice = await softDelete(Invoice, id, user.id, user.username || user.name);

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