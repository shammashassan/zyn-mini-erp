// app/api/items/trash/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item from '@/models/Item';
import { getTrash } from '@/utils/softDelete';
import { requireAuthAndPermission } from '@/lib/auth-utils';

export async function GET() {
    try {
        const { error } = await requireAuthAndPermission({ item: ['view_trash'] });
        if (error) return error;

        await dbConnect();
        const trashed = await getTrash(Item);
        return NextResponse.json(trashed);
    } catch (error) {
        console.error('GET /api/items/trash error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}