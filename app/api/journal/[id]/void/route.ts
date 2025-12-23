// app/api/journal/[id]/void/route.ts - FIXED with awaited params

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Journal from '@/models/Journal';
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

// POST - Void a posted journal entry
export async function POST(request: NextRequest, context: RouteContext) {
  try {

    const { error, session } = await requireAuthAndPermission({
      journal: ["void"],
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

    if (journal.status !== 'posted') {
      return NextResponse.json(
        { error: 'Only posted journal entries can be voided' },
        { status: 400 }
      );
    }

    journal.status = 'void';
    journal.updatedBy = session.user.id;
    journal.addAuditEntry(
      'Voided',
      session.user.id,
      session.user.username || session.user.name || null,
      [{ field: 'status', oldValue: 'posted', newValue: 'void' }]
    );

    await journal.save();

    return NextResponse.json(
      { message: 'Journal entry voided successfully', journal },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error voiding journal:', error);
    return NextResponse.json(
      { error: 'Failed to void journal entry' },
      { status: 500 }
    );
  }
}