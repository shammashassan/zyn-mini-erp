// app/api/salary-disbursements/preview/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Attendance from '@/models/Attendance';
import Employee from '@/models/Employee';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { calculateSalary } from '@/utils/salaryCalculation';
import type { AttendanceStatus } from '@/models/Attendance';

/**
 * GET /api/salary-disbursements/preview?employeeId=&start=&end=
 * Calculates salary breakdown for a period without saving.
 */
export async function GET(request: Request) {
    try {
        const { error } = await requireAuthAndPermission({ salaryDisbursement: ['read'] });
        if (error) return error;

        await dbConnect();
        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const start = searchParams.get('start');
        const end = searchParams.get('end');

        if (!employeeId || !start || !end) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
        }

        const periodStart = new Date(start);
        const periodEnd = new Date(end);

        // 1. Load employee
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

        // 2. Fetch attendance for period
        const attendanceRecords = await Attendance.find({
            employeeId,
            date: { $gte: periodStart, $lte: periodEnd },
        });
        const statuses: AttendanceStatus[] = attendanceRecords.map((r) => r.status as AttendanceStatus);

        // 3. Calculate
        const calc = calculateSalary({
            salary: employee.salary,
            frequency: employee.salaryFrequency as any,
            periodStart,
            periodEnd,
            attendanceStatuses: statuses,
        });

        return NextResponse.json(calc);
    } catch (error: any) {
        console.error('Failed to preview calculation:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}
