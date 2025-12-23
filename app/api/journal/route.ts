// app/api/journal/route.ts - UPDATED: Server-side Pagination & Advanced Filtering

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Journal from '@/models/Journal';
import ChartOfAccount from '@/models/ChartOfAccount';
import generateInvoiceNumber from '@/utils/invoiceNumber';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";

// GET - Fetch journal entries with pagination and advanced filters
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuthAndPermission({
      journal: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);

    // ✅ Detect Server-side Mode
    const isServerSide = searchParams.has('page') || searchParams.has('pageSize');

    if (isServerSide) {
      // 🚀 SERVER-SIDE MODE
      const { page, pageSize, sorting, filters } = extractTableParams(searchParams);
      
      // Build Base Filter from Custom Params
      const baseFilter: any = { isDeleted: false };
      
      const status = searchParams.get('status');
      const referenceType = searchParams.get('referenceType');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const partyType = searchParams.get('partyType');
      const partyId = searchParams.get('partyId');

      if (status && status !== 'all') baseFilter.status = status;
      if (referenceType && referenceType !== 'all') baseFilter.referenceType = referenceType;
      
      if (startDate && endDate) {
        baseFilter.entryDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      if (partyType && partyType !== 'all') baseFilter.partyType = partyType;
      if (partyId) baseFilter.partyId = partyId;

      // Execute Paginated Query
      const result = await executePaginatedQuery(Journal, {
        baseFilter,
        columnFilters: filters,
        sorting,
        page,
        pageSize,
        defaultSort: { entryDate: -1, createdAt: -1 },
      });

      return NextResponse.json({
        data: result.data,
        pageCount: result.pageCount,
        totalCount: result.totalCount,
        currentPage: result.currentPage,
        pageSize: result.pageSize,
      });

    } else {
      // 📋 CLIENT-SIDE MODE (Fallback/Legacy)
      // This block maintains backward compatibility if needed, though mostly replaced.
      const status = searchParams.get('status');
      const referenceType = searchParams.get('referenceType');
      const startDate = searchParams.get('startDate');
      const endDate = searchParams.get('endDate');
      const partyType = searchParams.get('partyType');
      const partyId = searchParams.get('partyId');

      let query: any = { isDeleted: false };

      if (status && status !== 'all') query.status = status;
      if (referenceType && referenceType !== 'all') query.referenceType = referenceType;
      
      if (startDate && endDate) {
        query.entryDate = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      }

      if (partyType && partyType !== 'all') query.partyType = partyType;
      if (partyId) query.partyId = partyId;

      const journals = await Journal.find(query)
        .sort({ entryDate: -1, createdAt: -1 })
        .lean();

      return NextResponse.json(journals, { status: 200 });
    }

  } catch (error) {
    console.error('Error fetching journals:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journal entries' },
      { status: 500 }
    );
  }
}

// POST - Create a new journal entry
export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuthAndPermission({
      journal: ["create"],
    });
    if (error) return error;

    await dbConnect();

    const body = await request.json();
    const {
      entryDate,
      referenceType,
      referenceId,
      referenceNumber,
      partyType,
      partyId,
      partyName,
      itemType,
      itemId,
      itemName,
      narration,
      entries,
      status = 'draft'
    } = body;

    // Validation
    if (!entryDate || !referenceType || !narration || !entries || entries.length < 2) {
      return NextResponse.json(
        { error: 'Missing required fields or insufficient entries' },
        { status: 400 }
      );
    }

    // Validate account codes exist
    const accountCodes = entries.map((e: any) => e.accountCode);
    const accounts = await ChartOfAccount.find({
      accountCode: { $in: accountCodes }
    });

    if (accounts.length !== accountCodes.length) {
      return NextResponse.json(
        { error: 'One or more account codes are invalid' },
        { status: 400 }
      );
    }

    // Calculate totals
    const totalDebit = entries.reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
    const totalCredit = entries.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);

    // Validate balanced entry
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return NextResponse.json(
        { error: `Journal entry must be balanced. Debit: ${totalDebit}, Credit: ${totalCredit}` },
        { status: 400 }
      );
    }

    // Generate journal number with retry mechanism
    const journalNumber = await generateInvoiceNumber('journal');

    // Create journal entry
    const journal = new Journal({
      journalNumber,
      entryDate: new Date(entryDate),
      referenceType,
      referenceId,
      referenceNumber,
      partyType,
      partyId,
      partyName,
      itemType,
      itemId,
      itemName,
      narration,
      entries,
      totalDebit,
      totalCredit,
      status,
      createdBy: session.user.id,
    });

    if (status === 'posted') {
      journal.postedBy = session.user.id;
      journal.postedAt = new Date();
    }

    journal.addAuditEntry(
      'Created',
      session.user.id,
      session.user.username || session.user.name || null
    );

    await journal.save();

    return NextResponse.json(
      { message: 'Journal entry created successfully', journal },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating journal:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create journal entry' },
      { status: 500 }
    );
  }
}