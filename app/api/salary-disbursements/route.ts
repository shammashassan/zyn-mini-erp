// app/api/salary-disbursements/route.ts

import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import SalaryDisbursement from '@/models/SalaryDisbursement';
import Attendance from '@/models/Attendance';
import Employee from '@/models/Employee';
import Expense from '@/models/Expense';
import Payee from '@/models/Payee';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { getUserInfo } from '@/lib/auth-helpers';
import generateInvoiceNumber from '@/utils/invoiceNumber';
import { calculateSalary } from '@/utils/salaryCalculation';
import { createPayeeSnapshot } from '@/utils/partySnapshot';
import type { AttendanceStatus } from '@/models/Attendance';

const DisbursementSchema = z.object({
    employeeId: z.string().min(1),
    periodStart: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
    periodEnd: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
    /** If provided, overrides calculatedAmount as the Expense amount */
    finalAmountOverride: z.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
});

/**
 * GET /api/salary-disbursements?employeeId=&page=&pageSize=
 */
export async function GET(request: Request) {
    try {
        const { error } = await requireAuthAndPermission({ salaryDisbursement: ['read'] });
        if (error) return error;

        await dbConnect();
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
        const pageSize = Math.min(100, parseInt(searchParams.get('pageSize') || '20'));

        const query: any = {};
        if (employeeId) query.employeeId = employeeId;

        const [records, total] = await Promise.all([
            SalaryDisbursement.find(query)
                .sort({ periodStart: -1 })
                .skip((page - 1) * pageSize)
                .limit(pageSize)
                .populate({ path: 'expenseId', select: 'referenceNumber status paymentStatus amount' }),
            SalaryDisbursement.countDocuments(query),
        ]);

        return NextResponse.json({
            data: records,
            total,
            pageCount: Math.ceil(total / pageSize),
        });
    } catch (error) {
        console.error('Failed to fetch disbursements:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * POST /api/salary-disbursements
 * 1. Validate no duplicate period
 * 2. Load employee → ensure Payee exists (auto-create if needed)
 * 3. Pull attendance records for the period
 * 4. Calculate salary
 * 5. Create Expense (Category: Salary, status: pending)
 * 6. Create SalaryDisbursement linked to Expense
 */
export async function POST(request: Request) {
    try {
        const { error } = await requireAuthAndPermission({ salaryDisbursement: ['create'] });
        if (error) return error;

        await dbConnect();
        const body = await request.json();
        const parsed = DisbursementSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const user = await getUserInfo();
        const { employeeId, periodStart: ps, periodEnd: pe, finalAmountOverride, notes } = parsed.data;

        const periodStart = new Date(ps);
        const periodEnd = new Date(pe);

        // 1. Check for duplicate
        const existing = await SalaryDisbursement.findOne({ employeeId, periodStart, periodEnd });
        if (existing) {
            return NextResponse.json(
                { error: 'A disbursement for this employee and period already exists.' },
                { status: 409 }
            );
        }

        // 2. Load employee
        const employee = await Employee.findById(employeeId);
        if (!employee) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }
        if (!employee.salary || !employee.salaryFrequency) {
            return NextResponse.json(
                { error: 'Employee does not have a salary configured.' },
                { status: 400 }
            );
        }

        // 2b. Ensure Payee exists — auto-create if missing
        let payeeId = employee.payeeId?.toString();
        if (!payeeId) {
            const existingPayee = await Payee.findOne({
                name: `${employee.firstName} ${employee.lastName}`.trim(),
                isDeleted: false,
            });

            const payee = existingPayee
                ? existingPayee
                : await Payee.create({
                    name: `${employee.firstName} ${employee.lastName}`.trim(),
                    type: 'employee',
                    email: employee.email || '',
                    phone: employee.mobiles?.[0] || '',
                    isDeleted: false,
                    createdBy: user?.id,
                });

            payeeId = payee._id.toString();

            // Link back to employee
            employee.payeeId = payee._id;
            await employee.save();
        }

        // 3. Fetch attendance for period
        const attendanceRecords = await Attendance.find({
            employeeId,
            date: { $gte: periodStart, $lte: periodEnd },
        });
        const statuses: AttendanceStatus[] = attendanceRecords.map((r) => r.status as AttendanceStatus);

        // 4. Calculate
        const calc = calculateSalary({
            salary: employee.salary,
            frequency: employee.salaryFrequency as any,
            periodStart,
            periodEnd,
            attendanceStatuses: statuses,
        });
        const finalAmount = finalAmountOverride ?? calc.calculatedAmount;

        // 5. Build payee snapshot and create Expense
        const payeeSnapshot = await createPayeeSnapshot(payeeId);
        const referenceNumber = await generateInvoiceNumber('expense');

        const expense = new Expense({
            referenceNumber,
            description: `Salary - ${employee.firstName} ${employee.lastName} (${ps} to ${pe})`,
            amount: finalAmount,
            category: 'Salary',
            type: 'single',
            expenseDate: periodEnd,
            date: periodEnd,
            payeeId,
            payeeSnapshot,
            status: 'pending',
            paymentStatus: 'Pending',
            paidAmount: 0,
            remainingAmount: finalAmount,
            notes: notes || '',
            isDeleted: false,
            createdBy: user?.id,
            updatedBy: user?.id,
        });
        expense.addAuditEntry('Created - Salary Disbursement', user?.id, user?.username);
        await expense.save();

        // 6. Create disbursement
        const disbursement = await SalaryDisbursement.create({
            employeeId,
            expenseId: expense._id,
            periodStart,
            periodEnd,
            paymentFrequency: employee.salaryFrequency,
            baseSalary: employee.salary,
            workingDays: calc.workingDays,
            presentDays: calc.presentDays,
            calculatedAmount: calc.calculatedAmount,
            finalAmount,
            notes,
            createdBy: user?.id,
        });

        return NextResponse.json({ disbursement, expense }, { status: 201 });
    } catch (error: any) {
        console.error('Failed to create disbursement:', error);
        if (error.code === 11000) {
            return NextResponse.json(
                { error: 'A disbursement for this employee and period already exists.' },
                { status: 409 }
            );
        }
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}