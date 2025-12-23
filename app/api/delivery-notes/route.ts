// app/api/delivery-notes/route.ts - Enhanced with Date Range Filtering

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import DeliveryNote from "@/models/DeliveryNote";
import Customer from "@/models/Customer";
import generateInvoiceNumber from "@/utils/invoiceNumber";
import { UAE_VAT_PERCENTAGE } from '@/utils/constants';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      deliveryNote: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    
    // ✅ Check if this is a server-side request
    const isServerSide = searchParams.has('page') || searchParams.has('pageSize');
    
    // Extract date params (support both naming conventions)
    const startDateParam = searchParams.get('startDate') || searchParams.get('from');
    const endDateParam = searchParams.get('endDate') || searchParams.get('to');

    if (isServerSide) {
      // 🚀 SERVER-SIDE MODE
      const { page, pageSize, sorting, filters } = extractTableParams(searchParams);
      
      console.log('📊 Server-side delivery note request:', { page, pageSize, sorting, filters, startDateParam, endDateParam });

      const baseFilter: any = { isDeleted: false };

      // Apply Date Range Filter
      if (startDateParam || endDateParam) {
        baseFilter.createdAt = {};
        if (startDateParam) {
          baseFilter.createdAt.$gte = new Date(startDateParam);
        }
        if (endDateParam) {
          const end = new Date(endDateParam);
          end.setHours(23, 59, 59, 999);
          baseFilter.createdAt.$lte = end;
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
          path: 'connectedDocuments.quotationId',
          select: 'invoiceNumber status isDeleted',
          match: { isDeleted: false }
        }
      ] : undefined;

      const result = await executePaginatedQuery(DeliveryNote, {
        baseFilter,
        columnFilters: filters,
        sorting,
        page,
        pageSize,
        defaultSort: { createdAt: -1 },
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
      const customerName = searchParams.get('customerName');
      const populate = searchParams.get('populate') === 'true';

      const filter: any = { isDeleted: false };
      if (status) filter.status = status;
      if (customerName) filter.customerName = customerName;

      // Apply Date Range
      if (startDateParam || endDateParam) {
        filter.createdAt = {};
        if (startDateParam) filter.createdAt.$gte = new Date(startDateParam);
        if (endDateParam) {
          const toDate = new Date(endDateParam);
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }

      let query = DeliveryNote.find(filter).sort({ createdAt: -1 });

      if (populate) {
        query = query
          .populate({
            path: 'connectedDocuments.invoiceIds',
            select: 'invoiceNumber grandTotal status isDeleted',
            match: { isDeleted: false }
          })
          .populate({
            path: 'connectedDocuments.quotationId',
            select: 'invoiceNumber status isDeleted',
            match: { isDeleted: false }
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
    
    // Check permission
    const { error, session } = await requireAuthAndPermission({
      deliveryNote: ["create"],
    });
    if (error) return error;

    await dbConnect();
    const user = session.user;

    const {
      customerName,
      customerPhone,
      customerEmail,
      items,
      discount = 0,
      notes,
      status,
      createdAt,
      updatedAt,
      connectedDocuments,
      vatAmount: customVatAmount,
      totalAmount: customTotalAmount,
      grandTotal: customGrandTotal,
    } = body;

    // Validation
    if (!customerName) {
      return NextResponse.json({
        error: 'Customer name is required'
      }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: 'Items are required for delivery notes' 
      }, { status: 400 });
    }

    // Upsert customer
    await Customer.findOneAndUpdate(
      { name: customerName },
      {
        $set: {
          phone: customerPhone,
          email: customerEmail
        }
      },
      { upsert: true, new: true }
    );

    // Calculate totals
    const subTotal = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);
    const discountedTotal = subTotal - discount;

    const finalVatAmount = customVatAmount !== undefined ? customVatAmount : (discountedTotal * (UAE_VAT_PERCENTAGE / 100));
    const finalTotalAmount = customTotalAmount !== undefined ? customTotalAmount : discountedTotal;
    const finalGrandTotal = customGrandTotal !== undefined ? customGrandTotal : (discountedTotal + finalVatAmount);

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
      customerName,
      customerPhone,
      customerEmail,
      items,
      discount,
      notes,
      totalAmount: finalTotalAmount,
      vatAmount: finalVatAmount,
      grandTotal: finalGrandTotal,
      status: status || 'pending',
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: user.id,
      updatedBy: user.id,
      connectedDocuments: connectedDocuments || {},
      actionHistory: [{
        action: 'Created',
        userId: user.id,
        username: user.username || user.name,
        timestamp: new Date(),
      }],
    };

    // Handle custom timestamps
    if (createdAt) {
      deliveryNoteData.createdAt = new Date(createdAt);
    }
    if (updatedAt) {
      deliveryNoteData.updatedAt = new Date(updatedAt);
    }

    // Create and save delivery note
    const newDeliveryNote = new DeliveryNote(deliveryNoteData);

    try {
      if (createdAt || updatedAt) {
        await newDeliveryNote.save({ timestamps: false });
        if (createdAt) newDeliveryNote.createdAt = new Date(createdAt);
        if (updatedAt) newDeliveryNote.updatedAt = new Date(updatedAt);
        await newDeliveryNote.save({ timestamps: false });
      } else {
        await newDeliveryNote.save();
      }

      console.log(`✅ Successfully created delivery note: ${newDeliveryNote.invoiceNumber}`);
      console.log(`   Total: ${finalTotalAmount}, VAT: ${finalVatAmount}, Grand Total: ${finalGrandTotal}`);

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