// app/api/payments-report/route.ts - OPTIMIZED

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Journal from "@/models/Journal";
import ChartOfAccount from "@/models/ChartOfAccount";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { startOfMonth, endOfMonth, eachMonthOfInterval, format, isWithinInterval } from 'date-fns';

// Cash and Bank account codes
const CASH_BANK_ACCOUNTS = ['A1001', 'A1002', 'A1003']; // Cash, Bank Main, Bank Secondary

interface PaymentTransaction {
  date: string;
  journalNumber: string;
  referenceType: string;
  referenceNumber?: string;
  partyType?: string;
  partyName?: string;
  paymentMethod?: string;
  inflow: number;
  outflow: number;
  narration: string;
  journalId: string;
}

interface MonthlyBreakdown {
  month: string;
  rawDate: string; // Added for sorting
  totalInflow: number;
  totalOutflow: number;
  netMovement: number;
  inflowCount: number;
  outflowCount: number;
}

interface PaymentsSummary {
  totalCashIn: number;
  totalCashOut: number;
  netCashMovement: number;
  openingBalance: number;
  closingBalance: number;
  totalTransactions: number;
  receiptCount: number;
  paymentCount: number;
}

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      report: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const paymentType = searchParams.get('paymentType'); // 'receipt' or 'payment'
    const paymentMethod = searchParams.get('paymentMethod');
    const partyType = searchParams.get('partyType');

    if (!startDateParam || !endDateParam) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    endDate.setHours(23, 59, 59, 999);

    // 1. Build query for CURRENT Period journals
    const journalQuery: any = {
      status: 'posted',
      isDeleted: false,
      entryDate: { $gte: startDate, $lte: endDate },
      'entries.accountCode': { $in: CASH_BANK_ACCOUNTS }
    };

    if (paymentType === 'receipt') {
      journalQuery.referenceType = 'Receipt';
    } else if (paymentType === 'payment') {
      journalQuery.referenceType = 'Payment';
    }

    if (partyType) {
      journalQuery.partyType = partyType;
    }

    // 2. Fetch journals
    const journals = await Journal.find(journalQuery).lean();

    // 3. Opening Balance Aggregation
    let openingBalance = 0;

    if (startDate) {
      const openingAgg = await Journal.aggregate([
        {
          $match: {
            status: 'posted',
            isDeleted: false,
            entryDate: { $lt: startDate },
            'entries.accountCode': { $in: CASH_BANK_ACCOUNTS }
          }
        },
        { $unwind: "$entries" },
        {
          $match: {
            "entries.accountCode": { $in: CASH_BANK_ACCOUNTS }
          }
        },
        {
          $group: {
            _id: null,
            totalDebit: { $sum: "$entries.debit" },
            totalCredit: { $sum: "$entries.credit" }
          }
        }
      ]);

      if (openingAgg.length > 0) {
        openingBalance = openingAgg[0].totalDebit - openingAgg[0].totalCredit;
      }
    }

    // 4. Process transactions
    const transactions: PaymentTransaction[] = [];
    let totalCashIn = 0;
    let totalCashOut = 0;
    let receiptCount = 0;
    let paymentCount = 0;

    journals.forEach(journal => {
      let inflow = 0;
      let outflow = 0;

      journal.entries.forEach((entry: any) => {
        if (CASH_BANK_ACCOUNTS.includes(entry.accountCode)) {
          if (entry.debit > 0) {
            inflow += entry.debit;
            receiptCount++;
          }
          if (entry.credit > 0) {
            outflow += entry.credit;
            paymentCount++;
          }
        }
      });

      const pMethod = getPaymentMethod(journal);
      if (paymentMethod && pMethod.toLowerCase() !== paymentMethod.toLowerCase()) {
        return;
      }

      if (inflow > 0 || outflow > 0) {
        transactions.push({
          date: journal.entryDate.toISOString(),
          journalNumber: journal.journalNumber,
          referenceType: journal.referenceType,
          referenceNumber: journal.referenceNumber,
          partyType: journal.partyType,
          partyName: journal.partyName,
          paymentMethod: pMethod,
          inflow,
          outflow,
          narration: journal.narration,
          journalId: String(journal._id)
        });

        totalCashIn += inflow;
        totalCashOut += outflow;
      }
    });

    transactions.sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const netCashMovement = totalCashIn - totalCashOut;
    const closingBalance = openingBalance + netCashMovement;

    const summary: PaymentsSummary = {
      totalCashIn,
      totalCashOut,
      netCashMovement,
      openingBalance,
      closingBalance,
      totalTransactions: transactions.length,
      receiptCount,
      paymentCount
    };

    // 5. Calculate monthly breakdown
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const monthlyBreakdown: MonthlyBreakdown[] = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthTransactions = transactions.filter(t =>
        isWithinInterval(new Date(t.date), { start: monthStart, end: monthEnd })
      );

      const monthInflow = monthTransactions.reduce((sum, t) => sum + t.inflow, 0);
      const monthOutflow = monthTransactions.reduce((sum, t) => sum + t.outflow, 0);

      return {
        month: format(month, 'MMM yyyy'),
        rawDate: month.toISOString(), // Sortable date
        totalInflow: monthInflow,
        totalOutflow: monthOutflow,
        netMovement: monthInflow - monthOutflow,
        inflowCount: monthTransactions.filter(t => t.inflow > 0).length,
        outflowCount: monthTransactions.filter(t => t.outflow > 0).length
      };
    });

    return NextResponse.json({
      summary,
      transactions, // Still returning transactions in case needed for drill-down later
      monthlyBreakdown: monthlyBreakdown.reverse() // Newest first
    });

  } catch (error) {
    console.error("Payments Report API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments data" },
      { status: 500 }
    );
  }
}

function getPaymentMethod(journal: any): string {
  const narration = journal.narration?.toLowerCase() || '';
  if (narration.includes('cash')) return 'Cash';
  if (narration.includes('bank') || narration.includes('transfer')) return 'Bank Transfer';
  if (narration.includes('card') || narration.includes('credit')) return 'Card';
  if (narration.includes('cheque') || narration.includes('check')) return 'Cheque';

  const cashBankEntry = journal.entries?.find((e: any) =>
    CASH_BANK_ACCOUNTS.includes(e.accountCode)
  );
  if (cashBankEntry) {
    if (cashBankEntry.accountCode === 'A1001') return 'Cash';
    if (cashBankEntry.accountCode === 'A1002' || cashBankEntry.accountCode === 'A1003') {
      return 'Bank Transfer';
    }
  }
  return 'Other';
}