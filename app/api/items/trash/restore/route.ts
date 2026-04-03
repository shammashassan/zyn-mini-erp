// app/api/items/trash/restore/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item from '@/models/Item';
import { restore } from '@/utils/softDelete';
import { requireAuthAndPermission, validateRequiredFields } from '@/lib/auth-utils';

export async function POST(request: Request) {
    try {
        const { error, session } = await requireAuthAndPermission({ item: ['restore'] });
        if (error) return error;

        await dbConnect();
        const body = await request.json();

        const { error: validationError } = validateRequiredFields(body, ['id']);
        if (validationError) return validationError;

        const restored = await restore(Item, body.id, session.user.id);
        if (!restored) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Item restored successfully', item: restored });
    } catch (error) {
        console.error('POST /api/items/trash/restore error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}