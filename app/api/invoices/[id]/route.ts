// app/api/invoices/[id]/route.ts - UPDATED: Store previous quotation status and revert on delete

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import Quotation from "@/models/Quotation";
import Voucher from "@/models/Voucher";
import { softDelete } from "@/utils/softDelete";
import { handleInvoiceStatusChange } from '@/utils/journalAutoCreate';
import { voidJournalsForReference } from '@/utils/journalManager';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { UAE_VAT_PERCENTAGE } from "@/utils/constants";
import { getUserInfo } from "@/lib/auth-helpers";

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

    const oldStatus = currentInvoice.status;

    const items = body.items || currentInvoice.items;
    const discount = body.discount !== undefined ? body.discount : currentInvoice.discount;

    const grossTotal = items.reduce((sum: number, item: { total: number }) => sum + (item.total || 0), 0);
    const subtotal = Math.max(grossTotal - discount, 0);
    const vatAmount = subtotal * (UAE_VAT_PERCENTAGE / 100);
    const grandTotal = subtotal + vatAmount;

    const updateData = {
      ...body,
      items,
      discount,
      totalAmount: grossTotal,
      vatAmount,
      grandTotal,
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
 * DELETE - Soft delete with journal voiding and quotation status reversion
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

    console.log(`🔴 DELETE /api/invoices/${id}`);

    // ✅ NEW: Handle quotation status reversion
    if (invoice.connectedDocuments?.quotationId) {
      try {
        const quotation = await Quotation.findById(invoice.connectedDocuments.quotationId);
        
        if (quotation && quotation.status === 'converted') {
          // Store the previous status in the invoice for restoration later
          if (!invoice.metadata) {
            invoice.metadata = {};
          }
          invoice.metadata.previousQuotationStatus = 'approved'; // Default to approved
          
          // Revert quotation status to approved
          quotation.status = 'approved';
          
          // Remove invoice from quotation's connected documents
          if (quotation.connectedDocuments?.invoiceIds) {
            quotation.connectedDocuments.invoiceIds = quotation.connectedDocuments.invoiceIds.filter(
              (invId: any) => invId.toString() !== id
            );
          }
          
          quotation.addAuditEntry(
            'Status reverted (connected invoice deleted)',
            user.id,
            user.username || user.name,
            [{
              field: 'status',
              oldValue: 'converted',
              newValue: 'approved'
            }]
          );
          
          await quotation.save();
          console.log(`✅ Reverted quotation ${quotation.invoiceNumber} status to 'approved'`);
        }
      } catch (quotationError) {
        console.error('Error reverting quotation status:', quotationError);
        // Don't fail the delete if quotation update fails
      }
    }

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