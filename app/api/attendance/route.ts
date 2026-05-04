// app/api/attendance/route.ts

import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import Attendance, { ATTENDANCE_STATUSES } from '@/models/Attendance';
import { requireAuthAndPermission, getUserInfo } from '@/lib/auth-utils';

const AttendanceSchema = z.object({
    employeeId: z.string().min(1, 'Employee is required'),
    date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
    status: z.enum(ATTENDANCE_STATUSES as [string, ...string[]]),
    notes: z.string().max(500).optional(),
});

const BulkSchema = z.object({
    employeeId: z.string().min(1),
    entries: z
        .array(
            z.object({
                date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
                status: z.enum(ATTENDANCE_STATUSES as [string, ...string[]]),
                notes: z.string().max(500).optional(),
            })
        )
        .min(1),
});

/**
 * GET /api/attendance?employeeId=&month=YYYY-MM
 */
export async function GET(request: Request) {
    try {
        const { error } = await requireAuthAndPermission({ attendance: ['read'] });
        if (error) return error;

        await dbConnect();

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employeeId');
        const month = searchParams.get('month'); // format: YYYY-MM

        if (!employeeId) {
            return NextResponse.json({ error: 'employeeId is required' }, { status: 400 });
        }

        const query: any = { employeeId };

        if (month) {
            const [year, m] = month.split('-').map(Number);
            const start = new Date(year, m - 1, 1);
            const end = new Date(year, m, 0, 23, 59, 59, 999); // last day of month
            query.date = { $gte: start, $lte: end };
        }

        const records = await Attendance.find(query).sort({ date: 1 });
        return NextResponse.json(records);
    } catch (error) {
        console.error('Failed to fetch attendance:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

/**
 * POST /api/attendance
 * Supports single { employeeId, date, status, notes }
 * or bulk { employeeId, entries: [...] }
 * Uses upsert so marking the same day twice just updates.
 */
export async function POST(request: Request) {
    try {
        const { error } = await requireAuthAndPermission({
            attendance: ['create'],
        });
        if (error) return error;

        await dbConnect();
        const user = await getUserInfo();
        const body = await request.json();

        // --- Bulk mode ---
        if (Array.isArray(body.entries)) {
            const parsed = BulkSchema.safeParse(body);
            if (!parsed.success) {
                return NextResponse.json(
                    { error: 'Validation failed', details: parsed.error.flatten() },
                    { status: 400 }
                );
            }
            const { employeeId, entries } = parsed.data;

            const ops = entries.map((entry) => ({
                updateOne: {
                    filter: {
                        employeeId,
                        date: new Date(entry.date),
                    },
                    update: {
                        $set: {
                            status: entry.status,
                            notes: entry.notes,
                            markedBy: user?.id,
                        },
                    },
                    upsert: true,
                },
            }));

            const result = await Attendance.bulkWrite(ops);
            return NextResponse.json({
                message: `Saved ${result.upsertedCount + result.modifiedCount} attendance record(s)`,
                upserted: result.upsertedCount,
                modified: result.modifiedCount,
            });
        }

        // --- Single mode ---
        const parsed = AttendanceSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten() },
                { status: 400 }
            );
        }
        const { employeeId, date, status, notes } = parsed.data;

        const record = await Attendance.findOneAndUpdate(
            { employeeId, date: new Date(date) },
            { $set: { status, notes, markedBy: user?.id } },
            { upsert: true, new: true }
        );

        return NextResponse.json(record, { status: 201 });
    } catch (error: any) {
        console.error('Failed to save attendance:', error);
        return NextResponse.json(
            { error: error.message || 'Server error' },
            { status: 500 }
        );
    }
}