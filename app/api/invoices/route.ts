// app/api/invoices/route.ts - FIXED: Added Date Range Filtering

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Invoice from "@/models/Invoice";
import Customer from "@/models/Customer";
import generateInvoiceNumber from "@/utils/invoiceNumber";
import { createJournalForInvoice } from '@/utils/journalAutoCreate';
import { UAE_VAT_PERCENTAGE } from '@/utils/constants';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";

/**
 * GET - Fetch invoices with optional server-side pagination, sorting, and filtering
 */
export async function GET(request: Request) {
  try {
    // Check permission
    const { error } = await requireAuthAndPermission({
      invoice: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    
    // Check if this is a server-side request (has page/pageSize params)
    const isServerSide = searchParams.has('page') || searchParams.has('pageSize');
    
    // Extract date params (support both naming conventions)
    const startDateParam = searchParams.get('startDate') || searchParams.get('from');
    const endDateParam = searchParams.get('endDate') || searchParams.get('to');

    if (isServerSide) {
      // 🚀 SERVER-SIDE MODE: Handle pagination, sorting, and filtering
      const { page, pageSize, sorting, filters } = extractTableParams(searchParams);
      
      console.log('📊 Server-side request:', { page, pageSize, sorting, filters, startDateParam, endDateParam });

      // Base filter (always exclude deleted items)
      const baseFilter: any = { isDeleted: false };

      // ✅ UPDATED: Apply Date Range Filter using invoiceDate
      if (startDateParam || endDateParam) {
        baseFilter.invoiceDate = {}; // Changed from createdAt to invoiceDate
        if (startDateParam) {
          baseFilter.invoiceDate.$gte = new Date(startDateParam);
        }
        if (endDateParam) {
          const end = new Date(endDateParam);
          end.setHours(23, 59, 59, 999);
          baseFilter.invoiceDate.$lte = end;
        }
      }

      // Check for populate flag
      const populate = searchParams.get('populate') === 'true';

      const populateOptions = populate ? [
        {
          path: 'connectedDocuments.receiptIds',
          select: 'invoiceNumber grandTotal voucherType isDeleted',
          match: { isDeleted: false }
        },
        {
          path: 'connectedDocuments.refundIds',
          select: 'invoiceNumber grandTotal voucherType isDeleted',
          match: { isDeleted: false }
        },
        {
          path: 'connectedDocuments.deliveryId',
          select: 'invoiceNumber status isDeleted',
          match: { isDeleted: false }
        },
        {
          path: 'connectedDocuments.quotationId',
          select: 'invoiceNumber status isDeleted',
          match: { isDeleted: false }
        }
      ] : undefined;

      // Execute paginated query - ✅ UPDATED: Default sort by invoiceDate
      const result = await executePaginatedQuery(Invoice, {
        baseFilter,
        columnFilters: filters,
        sorting,
        page,
        pageSize,
        defaultSort: { invoiceDate: -1 }, // Changed from createdAt to invoiceDate
        populate: populateOptions,
      });

      // Add remainingAmount to each invoice
      const invoicesWithRemaining = result.data.map((invoice: any) => ({
        ...invoice.toObject(),
        remainingAmount: invoice.grandTotal - (invoice.paidAmount || 0)
      }));

      return NextResponse.json({
        data: invoicesWithRemaining,
        pageCount: result.pageCount,
        totalCount: result.totalCount,
        currentPage: result.currentPage,
        pageSize: result.pageSize,
      });
    } else {
      // 📋 CLIENT-SIDE MODE: Return all invoices (for backward compatibility)
      const status = searchParams.get('status');
      const limit = searchParams.get('limit');
      const customerName = searchParams.get('customerName');
      const overdue = searchParams.get('overdue') === 'true';
      const populate = searchParams.get('populate') === 'true';

      const filter: any = { isDeleted: false };
      if (status) filter.status = status;
      if (customerName) filter.customerName = customerName;

      if (overdue) {
        filter.status = 'overdue';
      }

      // ✅ UPDATED: Apply Date Range using invoiceDate (Supports both 'startDate/endDate' and 'from/to')
      if (startDateParam || endDateParam) {
        filter.invoiceDate = {}; // Changed from createdAt to invoiceDate
        if (startDateParam) filter.invoiceDate.$gte = new Date(startDateParam);
        if (endDateParam) {
          const toDate = new Date(endDateParam);
          toDate.setHours(23, 59, 59, 999);
          filter.invoiceDate.$lte = toDate;
        }
      }

      let query = Invoice.find(filter).sort({ invoiceDate: -1 }); // ✅ UPDATED: Sort by invoiceDate

      if (populate) {
        query = query
          .populate({
            path: 'connectedDocuments.receiptIds',
            select: 'invoiceNumber grandTotal voucherType isDeleted',
            match: { isDeleted: false }
          })
          .populate({
            path: 'connectedDocuments.refundIds',
            select: 'invoiceNumber grandTotal voucherType isDeleted',
            match: { isDeleted: false }
          })
          .populate({
            path: 'connectedDocuments.deliveryId',
            select: 'invoiceNumber status isDeleted',
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

      const invoices = await query.exec();

      const invoicesWithRemaining = invoices.map((invoice: any) => ({
        ...invoice.toObject(),
        remainingAmount: invoice.grandTotal - (invoice.paidAmount || 0)
      }));

      return NextResponse.json(invoicesWithRemaining);
    }
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Create new invoice
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Check permission
    const { error, session } = await requireAuthAndPermission({
      invoice: ["create"],
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
      invoiceDate, // ✅ NEW: Invoice date field
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
        error: 'Items are required for invoices' 
      }, { status: 400 });
    }

    // ✅ NEW: Validate invoice date
    if (!invoiceDate) {
      return NextResponse.json({
        error: 'Invoice date is required'
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
    const grossTotal = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);
    const subtotal = Math.max(grossTotal - discount, 0);
    const calculatedVatAmount = subtotal * (UAE_VAT_PERCENTAGE / 100);
    const calculatedGrandTotal = subtotal + calculatedVatAmount;

    // Allow custom values if provided, otherwise use calculated
    const finalVatAmount = customVatAmount !== undefined ? customVatAmount : calculatedVatAmount;
    const finalTotalAmount = customTotalAmount !== undefined ? customTotalAmount : grossTotal;
    const finalGrandTotal = customGrandTotal !== undefined ? customGrandTotal : calculatedGrandTotal;

    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber('invoice');

    // Double-check uniqueness
    const existingInvoice = await Invoice.findOne({
      invoiceNumber,
      isDeleted: false
    });

    if (existingInvoice) {
      console.error(`❌ CRITICAL: Generated duplicate invoice number ${invoiceNumber}`);
      return NextResponse.json({
        error: 'Failed to generate unique invoice number. Please try again.',
        details: 'Invoice number collision detected'
      }, { status: 500 });
    }

    // Build invoice data
    const invoiceData: any = {
      invoiceNumber,
      customerName,
      customerPhone,
      customerEmail,
      items,
      discount,
      notes,
      invoiceDate: new Date(invoiceDate), // ✅ NEW: Set invoice date
      totalAmount: finalTotalAmount,
      vatAmount: finalVatAmount,
      grandTotal: finalGrandTotal,
      status: status || 'pending',
      paidAmount: 0,
      receivedAmount: 0,
      paymentStatus: 'Pending',
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

    // Create and save invoice
    const newInvoice = new Invoice(invoiceData);

    try {
      await newInvoice.save();

      console.log(`✅ Successfully created invoice: ${newInvoice.invoiceNumber}`);
      console.log(`   Gross Total: ${grossTotal}, VAT: ${finalVatAmount}, Subtotal: ${subtotal}, Discount: ${discount}, Grand Total: ${finalGrandTotal}`);

      // Conditional journal entry creation - only for APPROVED invoices
      if (newInvoice.status === 'approved') {
        console.log('📝 Creating journal for APPROVED invoice');
        try {
          await createJournalForInvoice(
            newInvoice.toObject(),
            user.id,
            user.username || user.name
          );
        } catch (journalError) {
          console.error('Failed to create journal entry:', journalError);
        }
      }

      return NextResponse.json({
        message: 'Invoice saved',
        invoice: newInvoice
      }, { status: 201 });

    } catch (saveError: any) {
      console.error('❌ Error saving invoice:', saveError);

      if (saveError.code === 11000 && saveError.keyPattern?.invoiceNumber) {
        return NextResponse.json({
          error: 'Duplicate invoice number detected. Please try again.',
          details: saveError.message
        }, { status: 500 });
      }

      throw saveError;
    }

  } catch (error: any) {
    console.error('❌ Error in POST /api/invoices:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}