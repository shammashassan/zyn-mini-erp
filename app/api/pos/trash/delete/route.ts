// app/api/pos/trash/delete/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import POSSale from '@/models/POSSale';
import { permanentDelete } from '@/utils/softDelete';
import { requireAuthAndPermission, validateRequiredFields } from '@/lib/auth-utils';

/**
 * DELETE - Permanently delete a POS sale
 * Body: { id: string }
 * The sale must already be soft-deleted before permanent deletion is allowed.
 */
export async function DELETE(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();

        const { error: validationError } = validateRequiredFields(body, ['id']);
        if (validationError) return validationError;

        const { id } = body;

        // Check if the sale exists (including soft-deleted)
        const sale = await POSSale.findById(id).setOptions({ includeDeleted: true });

        if (!sale) {
            return NextResponse.json({ error: 'POS sale not found' }, { status: 404 });
        }

        // Permission check
        const { error } = await requireAuthAndPermission({
            posSale: ['permanent_delete'],
        });
        if (error) return error;

        if (!sale.isDeleted) {
            return NextResponse.json({
                error: 'POS sale must be soft-deleted before permanent deletion',
            }, { status: 400 });
        }

        const deleted = await permanentDelete(POSSale, id);

        return NextResponse.json({
            message: 'POS sale permanently deleted',
            sale: deleted,
        });
    } catch (error) {
        console.error('DELETE /api/pos/trash/delete error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}