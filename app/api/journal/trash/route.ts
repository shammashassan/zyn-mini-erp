// app/api/journal/trash/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Journal from '@/models/Journal';
import { getTrash } from '@/utils/softDelete';
import { requireAuthAndPermission } from "@/lib/auth-utils";

// GET - Fetch all soft-deleted journal entries
export async function GET(request: NextRequest) {
  try {
    
    const { error } = await requireAuthAndPermission({
      journal: ["view_trash"],
    });
    if (error) return error;

    await dbConnect();
    
    const trashedJournals = await getTrash(Journal);
    
    return NextResponse.json(trashedJournals, { status: 200 });
  } catch (error) {
    console.error('Error fetching trash:', error);
    return NextResponse.json(
      { error: 'Failed to fetch deleted journal entries' },
      { status: 500 }
    );
  }
}