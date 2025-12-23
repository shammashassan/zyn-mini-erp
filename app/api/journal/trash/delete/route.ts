// app/api/journal/trash/delete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Journal from '@/models/Journal';
import { permanentDelete } from '@/utils/softDelete';
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

// DELETE - Permanently delete a journal entry
export async function DELETE(request: NextRequest) {
  try {
    const { error } = await requireAuthAndPermission({
      journal: ["permanent_delete"],
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

    const deletedJournal = await permanentDelete(Journal, id);

    if (!deletedJournal) {
      return NextResponse.json(
        { error: 'Journal entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Journal entry permanently deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error permanently deleting journal entry:', error);
    return NextResponse.json(
      { error: 'Failed to permanently delete journal entry' },
      { status: 500 }
    );
  }
}