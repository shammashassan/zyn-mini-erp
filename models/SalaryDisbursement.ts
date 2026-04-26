// models/SalaryDisbursement.ts

import mongoose, { Document, Schema, models, model } from 'mongoose';

export type PaymentFrequency = 'daily' | 'weekly' | 'monthly';

export interface ISalaryDisbursement extends Document<string> {
    employeeId: mongoose.Types.ObjectId;
    expenseId?: mongoose.Types.ObjectId; // linked Expense record
    periodStart: Date;
    periodEnd: Date;
    paymentFrequency: PaymentFrequency;
    baseSalary: number; // salary rate (per frequency period)
    workingDays: number; // total Mon-Sat days in period
    presentDays: number; // weighted days (Half-Day = 0.5)
    calculatedAmount: number; // dailyRate × presentDays
    finalAmount: number; // user-overrideable, used for Expense
    notes?: string;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SalaryDisbursementSchema: Schema<ISalaryDisbursement> = new Schema(
    {
        employeeId: {
            type: Schema.Types.ObjectId,
            ref: 'Employee',
            required: true,
            index: true,
        },
        expenseId: {
            type: Schema.Types.ObjectId,
            ref: 'Expense',
            default: null,
        },
        periodStart: {
            type: Date,
            required: true,
        },
        periodEnd: {
            type: Date,
            required: true,
        },
        paymentFrequency: {
            type: String,
            enum: ['daily', 'weekly', 'monthly'],
            required: true,
        },
        baseSalary: {
            type: Number,
            required: true,
            min: 0,
        },
        workingDays: {
            type: Number,
            required: true,
            min: 0,
        },
        presentDays: {
            type: Number,
            required: true,
            min: 0,
        },
        calculatedAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        finalAmount: {
            type: Number,
            required: true,
            min: 0,
        },
        notes: {
            type: String,
            trim: true,
            maxlength: [1000, 'Notes cannot exceed 1000 characters'],
        },
        createdBy: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
        collection: 'salarydisbursements',
    }
);

// Prevent duplicate disbursements for same employee & period
SalaryDisbursementSchema.index(
    { employeeId: 1, periodStart: 1, periodEnd: 1 },
    { unique: true }
);
SalaryDisbursementSchema.index({ periodStart: -1 });
SalaryDisbursementSchema.index({ expenseId: 1 });

const SalaryDisbursement =
    models.SalaryDisbursement ||
    model<ISalaryDisbursement>('SalaryDisbursement', SalaryDisbursementSchema);

export default SalaryDisbursement;