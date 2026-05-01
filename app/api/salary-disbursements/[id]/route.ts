// app/api/salary-disbursements/[id]/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SalaryDisbursement from '@/models/SalaryDisbursement';
import Expense from '@/models/Expense';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { getUserInfo } from '@/lib/auth-utils';
import { voidJournalsForReference } from '@/utils/journalManager';
import { softDelete } from '@/utils/softDelete';

interface RequestContext {
    params: Promise<{ id: string }>;
}

/** GET single disbursement with populated expense */
export async function GET(_request: Request, context: RequestContext) {
    try {
        const { error } = await requireAuthAndPermission({ salaryDisbursement: ['read'] });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;

        const record = await SalaryDisbursement.findById(id).populate({
            path: 'expenseId',
            select: 'referenceNumber status paymentStatus amount paidAmount remainingAmount',
        });

        if (!record) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        return NextResponse.json(record);
    } catch (error) {
        console.error('Failed to fetch disbursement:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * DELETE /api/salary-disbursements/[id]
 * Soft-deletes the linked Expense (which triggers journal voiding via existing logic).
 * Then removes the SalaryDisbursement document.
 */
export async function DELETE(_request: Request, context: RequestContext) {
    try {
        const { error } = await requireAuthAndPermission({ salaryDisbursement: ['delete'] });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;
        const user = await getUserInfo();

        const disbursement = await SalaryDisbursement.findById(id);
        if (!disbursement) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        // Soft-delete the linked expense (this will void journals via the expense DELETE handler logic)
        if (disbursement.expenseId) {
            const expense = await Expense.findById(disbursement.expenseId);
            if (expense && !expense.isDeleted) {
                await voidJournalsForReference(
                    expense._id,
                    user?.id,
                    user?.username,
                    'Salary disbursement deleted'
                );
                await softDelete(Expense, expense._id.toString(), user?.id, user?.username);
            }
        }

        await SalaryDisbursement.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Salary disbursement deleted successfully.' });
    } catch (error) {
        console.error('Failed to delete disbursement:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}