import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Quotation from "@/models/Quotation";
import Invoice from "@/models/Invoice";
import DeliveryNote from "@/models/DeliveryNote";
import generateInvoiceNumber from "@/utils/invoiceNumber";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";
import { createPartySnapshot } from "@/utils/partySnapshot";

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      quotation: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const ensureModels = [Quotation, Invoice, DeliveryNote];

    const { searchParams } = new URL(request.url);

    const isServerSide = searchParams.has('page') || searchParams.has('pageSize');

    // Extract date params (support both naming conventions)
    const startDateParam = searchParams.get('startDate') || searchParams.get('from');
    const endDateParam = searchParams.get('endDate') || searchParams.get('to');

    if (isServerSide) {
      const { page, pageSize, sorting, filters } = extractTableParams(searchParams);

      const baseFilter: any = { isDeleted: false };

      // ✅ Handle 'partyName' filter for partySnapshot
      const partyFilterIndex = filters.findIndex((f: any) => f.id === 'partyName');
      if (partyFilterIndex !== -1) {
        const partyFilter = filters[partyFilterIndex];
        baseFilter['partySnapshot.displayName'] = { $regex: partyFilter.value, $options: 'i' };
        filters.splice(partyFilterIndex, 1); // Remove from columnFilters as it's handled in baseFilter
      }

      // Apply Date Range Filter using quotationDate
      if (startDateParam || endDateParam) {
        baseFilter.quotationDate = {};
        if (startDateParam) {
          baseFilter.quotationDate.$gte = new Date(startDateParam);
        }
        if (endDateParam) {
          const end = new Date(endDateParam);
          end.setHours(23, 59, 59, 999);
          baseFilter.quotationDate.$lte = end;
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
        },
        {
          path: 'partyId',
          select: 'name company email phone vatNumber roles',
        },
        {
          path: 'contactId',
          select: 'name email phone designation',
        }
      ] : undefined;

      const result = await executePaginatedQuery(Quotation, {
        baseFilter,
        columnFilters: filters,
        sorting,
        page,
        pageSize,
        defaultSort: { quotationDate: -1 },
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
      // Client-side mode
      const status = searchParams.get('status');
      const limit = searchParams.get('limit');
      const partyId = searchParams.get('partyId');
      const populate = searchParams.get('populate') === 'true';

      const filter: any = { isDeleted: false };
      if (status) filter.status = status;
      if (partyId) filter.partyId = partyId;

      // Apply Date Range using quotationDate
      if (startDateParam || endDateParam) {
        filter.quotationDate = {};
        if (startDateParam) filter.quotationDate.$gte = new Date(startDateParam);
        if (endDateParam) {
          const toDate = new Date(endDateParam);
          toDate.setHours(23, 59, 59, 999);
          filter.quotationDate.$lte = toDate;
        }
      }

      let query = Quotation.find(filter).sort({ quotationDate: -1 });

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
          })
          .populate({
            path: 'partyId',
            select: 'name company type roles',
          })
          .populate({
            path: 'contactId',
            select: 'name email phone designation',
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
      items,
      discount = 0,
      notes,
      status,
      quotationDate,
      partyId,
      contactId,
      createdAt,
      updatedAt,
      connectedDocuments,
      vatAmount: customVatAmount,
      totalAmount: customTotalAmount,
      grandTotal: customGrandTotal,
    } = body;

    // ✅ Validation: Party is required
    if (!partyId) {
      return NextResponse.json({
        error: 'Party is required'
      }, { status: 400 });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({
        error: 'Items are required for quotations'
      }, { status: 400 });
    }

    if (!quotationDate) {
      return NextResponse.json({
        error: 'Quotation date is required'
      }, { status: 400 });
    }

    // ✅ Create immutable snapshots of party and contact
    const { partySnapshot, contactSnapshot } = await createPartySnapshot(partyId, contactId);

    // Trust frontend-calculated totals. VAT = sum of per-line taxAmount stored on items.
    const grossTotal = items.reduce((sum: number, item: { total: number }) => sum + item.total, 0);
    const finalVatAmount = customVatAmount ?? 0;
    const finalTotalAmount = customTotalAmount ?? grossTotal;
    const finalGrandTotal = customGrandTotal ?? Math.max(grossTotal - discount, 0) + finalVatAmount;

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

      // ✅ Party & Contact References
      partyId,
      contactId,

      // ✅ Immutable Snapshots (legal/historical truth)
      partySnapshot,
      contactSnapshot,

      // Items & totals
      items,
      discount,
      notes,
      quotationDate: new Date(quotationDate),
      totalAmount: finalTotalAmount,
      vatAmount: finalVatAmount,
      grandTotal: finalGrandTotal,
      status: status || 'pending',

      // Metadata
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
      console.log(`   Party: ${partySnapshot.displayName}`);
      console.log(`   Gross Total: ${finalTotalAmount}, VAT: ${finalVatAmount}, Discount: ${discount}, Grand Total: ${finalGrandTotal}`);

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