// app/api/journal/[id]/route.ts - FIXED with awaited params

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Journal from '@/models/Journal';
import { softDelete } from '@/utils/softDelete';
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// GET - Fetch a single journal entry
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { error } = await requireAuthAndPermission({
      journal: ["read"],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    const journal = await Journal.findById(id);

    if (!journal) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(journal, { status: 200 });
  } catch (error) {
    console.error('Error fetching journal:', error);
    return NextResponse.json(
      { error: 'Failed to fetch journal entry' },
      { status: 500 }
    );
  }
}

// PUT - Update a journal entry
export async function PUT(request: NextRequest, context: RouteContext) {
  try {

    const { error, session } = await requireAuthAndPermission({
      journal: ["update"],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;

    const body = await request.json();
    const journal = await Journal.findById(id);

    if (!journal) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      );
    }

    // Cannot edit posted or void entries
    if (journal.status === 'posted') {
      return NextResponse.json(
        { error: 'Cannot edit posted journal entries' },
        { status: 400 }
      );
    }

    if (journal.status === 'void') {
      return NextResponse.json(
        { error: 'Cannot edit void journal entries' },
        { status: 400 }
      );
    }

    const changes: any[] = [];

    // Update fields
    if (body.entryDate !== undefined) {
      changes.push({
        field: 'entryDate',
        oldValue: journal.entryDate,
        newValue: body.entryDate
      });
      journal.entryDate = new Date(body.entryDate);
    }

    if (body.narration !== undefined) {
      changes.push({
        field: 'narration',
        oldValue: journal.narration,
        newValue: body.narration
      });
      journal.narration = body.narration;
    }

    if (body.entries !== undefined) {
      journal.entries = body.entries;
      // Recalculate totals if entries change
      const totalDebit = body.entries.reduce((sum: number, e: any) => sum + (e.debit || 0), 0);
      const totalCredit = body.entries.reduce((sum: number, e: any) => sum + (e.credit || 0), 0);

      if (journal.totalDebit !== totalDebit || journal.totalCredit !== totalCredit) {
        changes.push({ field: 'totals', oldValue: `${journal.totalDebit}/${journal.totalCredit}`, newValue: `${totalDebit}/${totalCredit}` });
        journal.totalDebit = totalDebit;
        journal.totalCredit = totalCredit;
      }
    }

    // Update references
    if (body.referenceType !== undefined) journal.referenceType = body.referenceType;
    if (body.referenceNumber !== undefined) journal.referenceNumber = body.referenceNumber;
    if (body.partyType !== undefined) journal.partyType = body.partyType;
    if (body.partyId !== undefined) journal.partyId = body.partyId;
    if (body.partyName !== undefined) journal.partyName = body.partyName;
    if (body.itemType !== undefined) journal.itemType = body.itemType;
    if (body.itemId !== undefined) journal.itemId = body.itemId;
    if (body.itemName !== undefined) journal.itemName = body.itemName;

    if (body.status !== undefined) {
      changes.push({
        field: 'status',
        oldValue: journal.status,
        newValue: body.status
      });
      journal.status = body.status;

      if (body.status === 'posted') {
        journal.postedBy = session.user.id;
        journal.postedAt = new Date();
      }
    }

    journal.updatedBy = session.user.id;
    journal.addAuditEntry(
      'Updated',
      session.user.id,
      session.user.username || session.user.name || null,
      changes
    );

    await journal.save();

    return NextResponse.json(
      { message: 'Journal entry updated successfully', journal },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating journal:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update journal entry' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a journal entry
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {

    const { error, session } = await requireAuthAndPermission({
      journal: ["soft_delete"],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;

    const journal = await Journal.findById(id);

    if (!journal) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      );
    }

    // Cannot delete posted entries
    if (journal.status === 'posted') {
      return NextResponse.json(
        { error: 'Cannot delete posted journal entries. Please void them instead.' },
        { status: 400 }
      );
    }

    const deletedJournal = await softDelete(
      Journal,
      id,
      session.user.id
    );

    return NextResponse.json(
      { message: 'Journal entry moved to trash successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting journal:', error);
    return NextResponse.json(
      { error: 'Failed to delete journal entry' },
      { status: 500 }
    );
  }
}