// app/api/chart-of-accounts/trash/delete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ChartOfAccount from '@/models/ChartOfAccount';
import { permanentDelete } from '@/utils/softDelete';
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

// DELETE - Permanently delete a chart of account
export async function DELETE(request: NextRequest) {
  try {
    
    const { error } = await requireAuthAndPermission({
      chartOfAccounts: ["permanent_delete"],
    });
    if (error) return error;

    await dbConnect();

    const body = await request.json();

    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;
    
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Chart of account ID is required' },
        { status: 400 }
      );
    }

    const deletedAccount = await permanentDelete(ChartOfAccount, id);

    if (!deletedAccount) {
      return NextResponse.json(
        { error: 'Chart of account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Chart of account permanently deleted' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error permanently deleting chart of account:', error);
    return NextResponse.json(
      { error: 'Failed to permanently delete chart of account' },
      { status: 500 }
    );
  }
}