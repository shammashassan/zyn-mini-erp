// app/api/salary-disbursements/[id]/approve/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import SalaryDisbursement from '@/models/SalaryDisbursement';
import Expense from '@/models/Expense';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { getUserInfo } from '@/lib/auth-utils';

/**
 * POST /api/salary-disbursements/[id]/approve
 * Approves a salary disbursement and its connected expense.
 */
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const { error } = await requireAuthAndPermission({ salaryDisbursement: ['approve'] });
        if (error) return error;

        await dbConnect();
        const user = await getUserInfo();

        // 1. Load disbursement
        const disbursement = await SalaryDisbursement.findById(id).populate('expenseId');
        if (!disbursement) {
            return NextResponse.json({ error: 'Disbursement not found' }, { status: 404 });
        }

        const expense = disbursement.expenseId as any;
        if (!expense) {
             return NextResponse.json({ error: 'Connected expense record not found' }, { status: 404 });
        }

        if (expense.status === 'approved') {
            return NextResponse.json({ error: 'Disbursement is already approved' }, { status: 400 });
        }

        // 2. Update Expense status
        expense.status = 'approved';
        expense.updatedBy = user?.id;
        expense.addAuditEntry(`Approved - via Salary Disbursement Approval`, user?.id, user?.username);
        await expense.save();

        // 3. Return updated state
        return NextResponse.json({ 
            success: true, 
            message: 'Disbursement approved successfully',
            disbursement
        });
    } catch (error: any) {
        console.error('Failed to approve disbursement:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
