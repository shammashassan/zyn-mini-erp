// app/api/items/trash/delete/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item from '@/models/Item';
import { permanentDelete } from '@/utils/softDelete';
import { requireAuthAndPermission, validateRequiredFields } from '@/lib/auth-utils';

export async function DELETE(request: Request) {
    try {
        const { error } = await requireAuthAndPermission({ item: ['permanent_delete'] });
        if (error) return error;

        await dbConnect();
        const body = await request.json();

        const { error: validationError } = validateRequiredFields(body, ['id']);
        if (validationError) return validationError;

        const item = await Item.findById(body.id).setOptions({ includeDeleted: true });
        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }
        if (!item.isDeleted) {
            return NextResponse.json(
                { error: 'Item must be soft-deleted before permanent deletion' },
                { status: 400 }
            );
        }

        const deleted = await permanentDelete(Item, body.id);
        return NextResponse.json({ message: 'Item permanently deleted', item: deleted });
    } catch (error) {
        console.error('DELETE /api/items/trash/delete error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}