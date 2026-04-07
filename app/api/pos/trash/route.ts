// app/api/pos/trash/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import POSSale from '@/models/POSSale';
import { getTrash } from '@/utils/softDelete';
import { requireAuthAndPermission } from '@/lib/auth-utils';

export async function GET() {
    try {
        await dbConnect();
        const { error } = await requireAuthAndPermission({ invoice: ['view_trash'] });
        if (error) return error;

        const trashed = await getTrash(POSSale);
        return NextResponse.json(trashed);
    } catch (error) {
        console.error('GET /api/pos/trash error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}