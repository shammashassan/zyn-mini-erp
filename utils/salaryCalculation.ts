// utils/salaryCalculation.ts
// Pure calculation utilities for salary disbursements.

import type { PaymentFrequency } from '@/models/SalaryDisbursement';
import { ATTENDANCE_WEIGHT, type AttendanceStatus } from '@/models/Attendance';

/**
 * Returns true if the given date is a working day (Mon-Sat).
 * Sunday = 0, Saturday = 6.
 */
export function isWorkingDay(date: Date): boolean {
    const day = date.getDay(); // 0=Sun … 6=Sat
    return day !== 0; // exclude Sunday
}

/**
 * Count standard working days (Mon-Sat) between two dates inclusive.
 */
export function countWorkingDays(start: Date, end: Date): number {
    let count = 0;
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    while (current <= endDate) {
        if (isWorkingDay(current)) count++;
        current.setDate(current.getDate() + 1);
    }
    return count;
}

/**
 * Compute the daily rate based on salary and frequency.
 *   monthly → salary / 26
 *   weekly  → salary / 6
 *   daily   → salary (flat)
 */
export function getDailyRate(salary: number, frequency: PaymentFrequency): number {
    switch (frequency) {
        case 'monthly': return salary / 26;
        case 'weekly': return salary / 6;
        case 'daily': return salary;
    }
}

/**
 * Sum attendance weight for a list of status records.
 * Entries without a record in the period are NOT automatically counted.
 */
export function sumPresentDays(
    statuses: AttendanceStatus[],
): number {
    return statuses.reduce((sum, s) => sum + ATTENDANCE_WEIGHT[s], 0);
}

/**
 * Full calculation result.
 */
export interface SalaryCalcResult {
    workingDays: number;
    presentDays: number;
    dailyRate: number;
    calculatedAmount: number;
}

export function calculateSalary(opts: {
    salary: number;
    frequency: PaymentFrequency;
    periodStart: Date;
    periodEnd: Date;
    attendanceStatuses: AttendanceStatus[];
}): SalaryCalcResult {
    const { salary, frequency, periodStart, periodEnd, attendanceStatuses } = opts;
    const workingDays = countWorkingDays(periodStart, periodEnd);
    const presentDays = sumPresentDays(attendanceStatuses);
    const dailyRate = getDailyRate(salary, frequency);
    const calculatedAmount = parseFloat((dailyRate * presentDays).toFixed(2));

    return { workingDays, presentDays, dailyRate, calculatedAmount };
}