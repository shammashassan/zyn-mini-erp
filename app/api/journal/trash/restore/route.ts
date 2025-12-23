// app/api/journal/trash/restore/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Journal from '@/models/Journal';
import { restore } from '@/utils/softDelete';
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

// POST - Restore a soft-deleted journal entry
export async function POST(request: NextRequest) {
  try {
    const { error, session } = await requireAuthAndPermission({
      journal: ["restore"],
    });
    if (error) return error;

    await dbConnect();

    const body = await request.json();

    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;
    
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Journal entry ID is required' },
        { status: 400 }
      );
    }

    const restoredJournal = await restore(
      Journal,
      id,
      session.user.id
    );

    if (!restoredJournal) {
      return NextResponse.json(
        { error: 'Journal entry not found in trash' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Journal entry restored successfully', journal: restoredJournal },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error restoring journal entry:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to restore journal entry' },
      { status: 500 }
    );
  }
}