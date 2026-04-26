// app/api/attendance/[id]/route.ts

import { NextResponse } from 'next/server';
import { z } from 'zod';
import dbConnect from '@/lib/dbConnect';
import Attendance, { ATTENDANCE_STATUSES } from '@/models/Attendance';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { getUserInfo } from '@/lib/auth-helpers';

interface RequestContext {
    params: Promise<{ id: string }>;
}

const UpdateSchema = z.object({
    status: z.enum(ATTENDANCE_STATUSES as [string, ...string[]]).optional(),
    notes: z.string().max(500).optional(),
});

export async function PUT(request: Request, context: RequestContext) {
    try {
        const { error } = await requireAuthAndPermission({ attendance: ['update'] });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;
        const body = await request.json();

        const parsed = UpdateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Validation failed', details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const user = await getUserInfo();
        const updated = await Attendance.findByIdAndUpdate(
            id,
            { $set: { ...parsed.data, markedBy: user?.id } },
            { new: true }
        );

        if (!updated) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        return NextResponse.json(updated);
    } catch (error) {
        console.error('Failed to update attendance:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

export async function DELETE(_request: Request, context: RequestContext) {
    try {
        const { error } = await requireAuthAndPermission({ attendance: ['delete'] });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;

        const deleted = await Attendance.findByIdAndDelete(id);
        if (!deleted) {
            return NextResponse.json({ error: 'Record not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Attendance record deleted' });
    } catch (error) {
        console.error('Failed to delete attendance:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}