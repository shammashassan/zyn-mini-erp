// app/api/delivery-notes/route.ts - FINAL: Using party snapshots, removed legacy fields

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DeliveryNote from "@/models/DeliveryNote";
import Invoice from "@/models/Invoice";
import Party from "@/models/Party";
import generateInvoiceNumber from "@/utils/invoiceNumber";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";
import { createPartySnapshot } from "@/utils/partySnapshot";

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      deliveryNote: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const ensureModels = [DeliveryNote, Invoice];

    const { searchParams } = new URL(request.url);

    const isServerSide = searchParams.has('page') || searchParams.has('pageSize');

    const startDateParam = searchParams.get('startDate') || searchParams.get('from');
    const endDateParam = searchParams.get('endDate') || searchParams.get('to');

    if (isServerSide) {
      // 🚀 SERVER-SIDE MODE
      const { page, pageSize, sorting, filters } = extractTableParams(searchParams);

      const baseFilter: any = { isDeleted: false };

      // ✅ Handle 'partyName' filter for partySnapshot
      const partyFilterIndex = filters.findIndex((f: any) => f.id === 'partyName');
      if (partyFilterIndex !== -1) {
        const partyFilter = filters[partyFilterIndex];
        baseFilter['partySnapshot.displayName'] = { $regex: partyFilter.value, $options: 'i' };
        filters.splice(partyFilterIndex, 1);
      }

      if (startDateParam || endDateParam) {
        baseFilter.deliveryDate = {};
        if (startDateParam) {
          baseFilter.deliveryDate.$gte = new Date(startDateParam);
        }
        if (endDateParam) {
          const end = new Date(endDateParam);
          end.setHours(23, 59, 59, 999);
          baseFilter.deliveryDate.$lte = end;
        }
      }

      const populate = searchParams.get('populate') === 'true';

      const populateOptions = populate ? [
        {
          path: 'connectedDocuments.invoiceIds',
          select: 'invoiceNumber grandTotal status isDeleted',
          match: { isDeleted: false }
        },
        {
          path: 'partyId',
          select: 'name company type roles',
        }
      ] : undefined;

      const result = await executePaginatedQuery(DeliveryNote, {
        baseFilter,
        columnFilters: filters,
        sorting,
        page,
        pageSize,
        defaultSort: { deliveryDate: -1 },
        populate: populateOptions,
      });

      return NextResponse.json({
        data: result.data,
        pageCount: result.pageCount,
        totalCount: result.totalCount,
        currentPage: result.currentPage,
        pageSize: result.pageSize,
      });
    } else {
      // 📋 CLIENT-SIDE MODE (backward compatibility)
      const status = searchParams.get('status');
      const limit = searchParams.get('limit');
      const partyId = searchParams.get('partyId');
      const populate = searchParams.get('populate') === 'true';

      const filter: any = { isDeleted: false };
      if (status) filter.status = status;
      if (partyId) filter.partyId = partyId;

      if (startDateParam || endDateParam) {
        filter.deliveryDate = {};
        if (startDateParam) filter.deliveryDate.$gte = new Date(startDateParam);
        if (endDateParam) {
          const toDate = new Date(endDateParam);
          toDate.setHours(23, 59, 59, 999);
          filter.deliveryDate.$lte = toDate;
        }
      }

      let query = DeliveryNote.find(filter).sort({ deliveryDate: -1 });

      if (populate) {
        query = query
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

      if (limit) {
        const parsedLimit = parseInt(limit, 10);
        if (!isNaN(parsedLimit)) {
          query = query.limit(parsedLimit);
        }
      }

      const deliveryNotes = await query.exec();

      return NextResponse.json(deliveryNotes);
    }
  } catch (error) {
    console.error('Error fetching delivery notes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { error, session } = await requireAuthAndPermission({
      deliveryNote: ["create"],
    });
    if (error) return error;

    await dbConnect();
    const user = session.user;

    const {
      items,
      discount = 0,
      notes,
      status,
      deliveryDate,
      connectedDocuments,
      vatAmount: customVatAmount,
      totalAmount: customTotalAmount,
      grandTotal: customGrandTotal,
      partyId,
      contactId,
    } = body;

    // ✅ Validation: Party is required
    if (!partyId) {
      return NextResponse.json({
        error: 'Party is required'
      }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        error: 'Items are required for delivery notes'
      }, { status: 400 });
    }

    if (!deliveryDate) {
      return NextResponse.json({
        error: 'Delivery date is required'
      }, { status: 400 });
    }

    // ✅ CRITICAL: Extract invoiceId from connectedDocuments
    const invoiceId = connectedDocuments?.invoiceId;

    // ✅ Create immutable snapshots of party and contact
    const { partySnapshot, contactSnapshot } = await createPartySnapshot(partyId, contactId);

    // Trust frontend-provided totals (copied from the source invoice)
    const subTotal = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);
    const finalVatAmount = customVatAmount ?? 0;
    const finalTotalAmount = customTotalAmount ?? subTotal;
    const finalGrandTotal = customGrandTotal ?? (subTotal - discount) + finalVatAmount;

    // Generate delivery note number
    const invoiceNumber = await generateInvoiceNumber('delivery');

    // Double-check uniqueness
    const existingDeliveryNote = await DeliveryNote.findOne({
      invoiceNumber,
      isDeleted: false
    });

    if (existingDeliveryNote) {
      console.error(`❌ CRITICAL: Generated duplicate delivery note number ${invoiceNumber}`);
      return NextResponse.json({
        error: 'Failed to generate unique delivery note number. Please try again.',
        details: 'Delivery note number collision detected'
      }, { status: 500 });
    }

    // Build delivery note data
    const deliveryNoteData: any = {
      invoiceNumber,

      // ✅ Party & Contact References
      partyId,
      contactId,

      // ✅ Immutable Snapshots (legal/historical truth)
      partySnapshot,
      contactSnapshot,

      items,
      discount,
      notes,
      deliveryDate: new Date(deliveryDate),
      totalAmount: finalTotalAmount,
      vatAmount: finalVatAmount,
      grandTotal: finalGrandTotal,
      status: status || 'pending',
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: user.id,
      updatedBy: user.id,
      connectedDocuments: {
        // ✅ FIXED: Store as invoiceIds array
        invoiceIds: invoiceId ? [invoiceId] : [],
        ...connectedDocuments
      },
      actionHistory: [{
        action: 'Created',
        userId: user.id,
        username: user.username || user.name,
        timestamp: new Date(),
      }],
    };

    // Create and save delivery note
    const newDeliveryNote = new DeliveryNote(deliveryNoteData);

    try {
      await newDeliveryNote.save();

      console.log(`✅ Successfully created delivery note: ${newDeliveryNote.invoiceNumber}`);
      console.log(`   Party: ${partySnapshot.displayName}`);

      // ✅ NEW: Update the linked invoice's connectedDocuments.deliveryId
      if (invoiceId) {
        try {
          const invoice = await Invoice.findById(invoiceId);

          if (!invoice) {
            console.error(`❌ Invoice ${invoiceId} not found in database`);
          } else if (invoice.isDeleted) {
            console.warn(`⚠️ Invoice ${invoiceId} is deleted, skipping link`);
          } else {
            // Update the invoice
            invoice.set({
              'connectedDocuments.deliveryId': newDeliveryNote._id
            });

            invoice.addAuditEntry(
              'Delivery Note Linked',
              user.id,
              user.username || user.name,
              [{
                field: 'connectedDocuments.deliveryId',
                oldValue: invoice.connectedDocuments?.deliveryId || null,
                newValue: newDeliveryNote._id
              }]
            );

            await invoice.save();
          }
        } catch (linkError) {
          console.error('❌ Failed to link invoice:', linkError);
          // Don't fail the whole request if linking fails
        }
      } else {
        console.warn('⚠️ No invoiceId provided, skipping invoice linking');
      }

      return NextResponse.json({
        message: 'Delivery note saved',
        deliveryNote: newDeliveryNote
      }, { status: 201 });

    } catch (saveError: any) {
      console.error('❌ Error saving delivery note:', saveError);

      if (saveError.code === 11000 && saveError.keyPattern?.invoiceNumber) {
        return NextResponse.json({
          error: 'Duplicate delivery note number detected. Please try again.',
          details: saveError.message
        }, { status: 500 });
      }

      throw saveError;
    }

  } catch (error: any) {
    console.error('❌ Error in POST /api/delivery-notes:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}