// app/api/chart-of-accounts/trash/restore/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ChartOfAccount from '@/models/ChartOfAccount';
import { restore } from '@/utils/softDelete';
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

// POST - Restore a soft-deleted account mapping
export async function POST(request: NextRequest) {
  try {
    
    const { error, session } = await requireAuthAndPermission({
      chartOfAccounts: ["restore"],
    });
    if (error) return error;

    await dbConnect();

    const body = await request.json();

    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;
    
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Account mapping ID is required' },
        { status: 400 }
      );
    }

    const restoredAccount = await restore(
      ChartOfAccount,
      id,
      session.user.id
    );

    if (!restoredAccount) {
      return NextResponse.json(
        { error: 'Chart of account not found in trash' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Chart of account restored successfully', account: restoredAccount },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error restoring chart of account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to restore chart of account' },
      { status: 500 }
    );
  }
}