// app/api/pos/[id]/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import POSSale from '@/models/POSSale';
import { softDelete } from '@/utils/softDelete';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { getUserInfo } from '@/lib/auth-helpers';
import { reverseStockForPOSSale, voidJournalForPOSSale } from '@/utils/posManager';

interface RequestContext {
    params: Promise<{ id: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/pos/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request, context: RequestContext) {
    try {
        const { error } = await requireAuthAndPermission({ invoice: ['read'] });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;

        const includeDeleted = request.headers.get('X-Include-Deleted') === 'true';
        const query = POSSale.findById(id);
        if (includeDeleted) query.setOptions({ includeDeleted: true });

        const sale = await query;
        if (!sale) return NextResponse.json({ error: 'POS sale not found' }, { status: 404 });
        if (sale.isDeleted && !includeDeleted) {
            return NextResponse.json({ error: 'This sale has been deleted' }, { status: 410 });
        }

        return NextResponse.json(sale);
    } catch (error) {
        const { id } = await context.params;
        console.error(`GET /api/pos/${id} error:`, error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE  /api/pos/[id]  — soft delete + revert stock + void journal
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(request: Request, context: RequestContext) {
    try {
        const { error, session } = await requireAuthAndPermission({ invoice: ['soft_delete'] });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;
        const user = await getUserInfo();

        const sale = await POSSale.findById(id);
        if (!sale) return NextResponse.json({ error: 'POS sale not found' }, { status: 404 });
        if (sale.isDeleted) return NextResponse.json({ error: 'Sale already deleted' }, { status: 400 });

        // 1. Reverse stock deductions
        if (sale.stockAdjustmentIds?.length > 0) {
            try {
                await reverseStockForPOSSale(sale.stockAdjustmentIds);
            } catch (err) {
                console.error('Stock reversal failed:', err);
                // Log but don't fail the delete
            }
        }

        // 2. Void the journal
        if (sale.journalId) {
            await voidJournalForPOSSale(
                sale.journalId,
                user.id,
                user.username || user.name
            );
        }

        // 3. Soft-delete the sale
        const deleted = await softDelete(POSSale, id, user.id);

        return NextResponse.json({
            message: 'POS sale deleted, stock restored, journal voided',
            sale: deleted,
        });
    } catch (error) {
        const { id } = await context.params;
        console.error(`DELETE /api/pos/${id} error:`, error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}