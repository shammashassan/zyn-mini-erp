// models/Attendance.ts

import mongoose, { Document, Schema, models, model } from 'mongoose';

export type AttendanceStatus = 'Present' | 'Absent' | 'Half-Day' | 'Paid Leave' | 'Unpaid Leave';

export const ATTENDANCE_STATUSES: AttendanceStatus[] = [
    'Present',
    'Absent',
    'Half-Day',
    'Paid Leave',
    'Unpaid Leave',
];

/** Day weight used for salary calculation */
export const ATTENDANCE_WEIGHT: Record<AttendanceStatus, number> = {
    Present: 1,
    'Paid Leave': 1,
    'Half-Day': 0.5,
    Absent: 0,
    'Unpaid Leave': 0,
};

export interface IAttendance extends Document<string> {
    employeeId: mongoose.Types.ObjectId;
    date: Date;
    status: AttendanceStatus;
    notes?: string;
    markedBy?: string; // userId
    createdAt: Date;
    updatedAt: Date;
}

const AttendanceSchema: Schema<IAttendance> = new Schema(
    {
        employeeId: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        date: {
            type: Date,
            required: true,
        },
        status: {
            type: String,
            enum: ATTENDANCE_STATUSES,
            required: true,
            default: 'Present',
        },
        notes: {
            type: String,
            trim: true,
            maxlength: [500, 'Notes cannot exceed 500 characters'],
        },
        markedBy: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'attendances',
    }
);

// One record per employee per day
AttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ date: -1 });
AttendanceSchema.index({ status: 1 });

const Attendance =
    (models && models.Attendance) || model<IAttendance>('Attendance', AttendanceSchema);

export default Attendance;