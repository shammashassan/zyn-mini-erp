// app/api/quotations/route.ts - FIXED: Backend calculates totals

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Quotation from "@/models/Quotation";
import Customer from "@/models/Customer";
import generateInvoiceNumber from "@/utils/invoiceNumber";
import { UAE_VAT_PERCENTAGE } from '@/utils/constants';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      quotation: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    
    const isServerSide = searchParams.has('page') || searchParams.has('pageSize');
    
    const startDateParam = searchParams.get('startDate') || searchParams.get('from');
    const endDateParam = searchParams.get('endDate') || searchParams.get('to');

    if (isServerSide) {
      const { page, pageSize, sorting, filters } = extractTableParams(searchParams);
      
      console.log('📊 Server-side quotation request:', { page, pageSize, sorting, filters, startDateParam, endDateParam });

      const baseFilter: any = { isDeleted: false };

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
          path: 'connectedDocuments.deliveryId',
          select: 'invoiceNumber status isDeleted',
          match: { isDeleted: false }
        }
      ] : undefined;

      const result = await executePaginatedQuery(Quotation, {
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
      const status = searchParams.get('status');
      const limit = searchParams.get('limit');
      const customerName = searchParams.get('customerName');
      const populate = searchParams.get('populate') === 'true';

      const filter: any = { isDeleted: false };
      if (status) filter.status = status;
      if (customerName) filter.customerName = customerName;

      if (startDateParam || endDateParam) {
        filter.createdAt = {};
        if (startDateParam) filter.createdAt.$gte = new Date(startDateParam);
        if (endDateParam) {
          const toDate = new Date(endDateParam);
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }

      let query = Quotation.find(filter).sort({ createdAt: -1 });

      if (populate) {
        query = query
          .populate({
            path: 'connectedDocuments.invoiceIds',
            select: 'invoiceNumber grandTotal status isDeleted',
            match: { isDeleted: false }
          })
          .populate({
            path: 'connectedDocuments.deliveryId',
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

      const quotations = await query.exec();

      return NextResponse.json(quotations);
    }
  } catch (error) {
    console.error('Error fetching quotations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { error, session } = await requireAuthAndPermission({
      quotation: ["create"],
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
    } = body;

    // Validation
    if (!customerName) {
      return NextResponse.json({
        error: 'Customer name is required'
      }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: 'Items are required for quotations' 
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

    // ✅ FIXED: Correct VAT Calculation
    // 1. Gross Total = Sum of all items
    const grossTotal = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);
    
    // 2. Subtotal = Gross Total - Discount
    const subtotal = (Math.max(grossTotal - discount, 0));

    // 3. VAT = Subtotal × 5%
    const vatAmount = subtotal * (UAE_VAT_PERCENTAGE / 100);

    // 4. Grand Total = Subtotal + VAT
    const grandTotal = subtotal + vatAmount;

    // Generate quotation number
    const invoiceNumber = await generateInvoiceNumber('quotation');

    // Double-check uniqueness
    const existingQuotation = await Quotation.findOne({
      invoiceNumber,
      isDeleted: false
    });

    if (existingQuotation) {
      console.error(`❌ CRITICAL: Generated duplicate quotation number ${invoiceNumber}`);
      return NextResponse.json({
        error: 'Failed to generate unique quotation number. Please try again.',
        details: 'Quotation number collision detected'
      }, { status: 500 });
    }

    // Build quotation data
    const quotationData: any = {
      invoiceNumber,
      customerName,
      customerPhone,
      customerEmail,
      items,
      discount,
      notes,
      totalAmount: grossTotal,    // Gross Total (before VAT)
      vatAmount: vatAmount,        // VAT (5% of gross total)
      grandTotal: grandTotal,      // Final Total (gross + VAT - discount)
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
      quotationData.createdAt = new Date(createdAt);
    }
    if (updatedAt) {
      quotationData.updatedAt = new Date(updatedAt);
    }

    // Create and save quotation
    const newQuotation = new Quotation(quotationData);

    try {
      if (createdAt || updatedAt) {
        await newQuotation.save({ timestamps: false });
        if (createdAt) newQuotation.createdAt = new Date(createdAt);
        if (updatedAt) newQuotation.updatedAt = new Date(updatedAt);
        await newQuotation.save({ timestamps: false });
      } else {
        await newQuotation.save();
      }

      console.log(`✅ Successfully created quotation: ${newQuotation.invoiceNumber}`);
      console.log(`   Gross Total: ${grossTotal}, VAT: ${vatAmount}, Subtotal: ${subtotal}, Discount: ${discount}, Grand Total: ${grandTotal}`);

      return NextResponse.json({
        message: 'Quotation saved',
        quotation: newQuotation
      }, { status: 201 });

    } catch (saveError: any) {
      console.error('❌ Error saving quotation:', saveError);

      if (saveError.code === 11000 && saveError.keyPattern?.invoiceNumber) {
        return NextResponse.json({
          error: 'Duplicate quotation number detected. Please try again.',
          details: saveError.message
        }, { status: 500 });
      }

      throw saveError;
    }

  } catch (error: any) {
    console.error('❌ Error in POST /api/quotations:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}