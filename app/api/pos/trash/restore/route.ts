// app/api/pos/trash/restore/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import POSSale from '@/models/POSSale';
import { restore } from '@/utils/softDelete';
import { requireAuthAndPermission, validateRequiredFields } from '@/lib/auth-utils';
import { reapplyStockForPOSSale } from '@/utils/inventoryManager';
import { recreateJournalForPOSSale } from '@/utils/journalAutoCreate';

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();

        const { error: validationError } = validateRequiredFields(body, ['id']);
        if (validationError) return validationError;

        const { id } = body;

        const { error, session } = await requireAuthAndPermission({ invoice: ['restore'] });
        if (error) return error;

        const user = session.user;

        const sale = await POSSale.findById(id).setOptions({ includeDeleted: true });
        if (!sale) return NextResponse.json({ error: 'POS sale not found' }, { status: 404 });
        if (!sale.isDeleted) return NextResponse.json({ error: 'Sale is not deleted' }, { status: 400 });

        // 1. Re-apply stock deductions (using previous adjustment records as templates)
        let newAdjIds: any[] = [];
        let cogsAmount = 0;

        if (sale.stockAdjustmentIds?.length > 0) {
            try {
                const stockResult = await reapplyStockForPOSSale(sale._id, sale.stockAdjustmentIds);
                newAdjIds = stockResult.newIds;
                cogsAmount = stockResult.cogsAmount;
            } catch (stockErr: any) {
                return NextResponse.json(
                    { error: `Cannot restore: ${stockErr.message}` },
                    { status: 400 }
                );
            }
        }

        // 2. Restore the sale
        const restored = await restore(
            POSSale,
            id,
            user?.id || null,
            user?.username || user?.name || null
        );

        if (!restored) return NextResponse.json({ error: 'Restore failed' }, { status: 500 });

        // 3. Update stockAdjustmentIds with the new ones
        restored.stockAdjustmentIds = newAdjIds;

        // 4. Recreate journal (revenue + COGS in one balanced entry)
        const journal = await recreateJournalForPOSSale(
            restored.toObject(),
            user?.id || null,
            user?.username || user?.name || null,
            cogsAmount
        );

        if (journal) {
            restored.journalId = journal._id;
        }

        await restored.save();

        return NextResponse.json({
            message: 'POS sale restored, stock re-deducted, journal recreated',
            sale: restored,
        });
    } catch (error) {
        console.error('POST /api/pos/trash/restore error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}