// app/api/chart-of-accounts/trash/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ChartOfAccount from '@/models/ChartOfAccount';
import { getTrash } from '@/utils/softDelete';
import { requireAuthAndPermission } from "@/lib/auth-utils";

// GET - Fetch all soft-deleted chart of accounts
export async function GET(request: NextRequest) {
  try {

    const { error } = await requireAuthAndPermission({
      chartOfAccounts: ["view_trash"],
    });
    if (error) return error;

    await dbConnect();

    const trashedAccounts = await getTrash(ChartOfAccount);

    return NextResponse.json(trashedAccounts, { status: 200 });
  } catch (error) {
    console.error('Error fetching trash:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deleted chart of accounts' },
      { status: 500 }
    );
  }
}