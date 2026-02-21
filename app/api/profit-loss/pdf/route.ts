// app/api/reports/profit-loss/pdf/route.ts

import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import dbConnect from '@/lib/dbConnect';
import CompanyDetails from '@/models/CompanyDetails';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { ProfitLossDocument } from '@/components/pdf/ProfitLossDocument';

export async function GET(request: NextRequest) {
    try {
        const { error } = await requireAuthAndPermission({ profitLoss: ['read'] });
        if (error) return error;

        const { searchParams, origin } = new URL(request.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        if (!startDateParam || !endDateParam) {
            return NextResponse.json({ message: 'startDate and endDate are required' }, { status: 400 });
        }

        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);

        await dbConnect();
        const companyDetails = await CompanyDetails.findOne() || null;

        const cookie = request.headers.get('cookie') || '';

        const [dataRes, detailsRes] = await Promise.all([
            fetch(`${origin}/api/financial-statements?startDate=${startDateParam}&endDate=${endDateParam}`, {
                headers: { cookie },
            }),
            fetch(`${origin}/api/financial-statements?startDate=${startDateParam}&endDate=${endDateParam}`, {
                headers: { cookie },
            }),
        ]);

        if (!dataRes.ok) {
            const err = await dataRes.json().catch(() => ({}));
            return NextResponse.json(
                { message: err.message || `Data fetch failed with status ${dataRes.status}` },
                { status: dataRes.status }
            );
        }

        const data = await dataRes.json();
        const income: any[] = data.income || [];
        const expenses: any[] = data.expenses || [];
        const totalIncome = income.reduce((sum: number, i: any) => sum + i.amount, 0);
        const totalExpenses = expenses.reduce((sum: number, e: any) => sum + e.amount, 0);
        const netProfit = totalIncome - totalExpenses;

        const pdfStream = await renderToStream(
            React.createElement(ProfitLossDocument, {
                income,
                expenses,
                totals: { income: totalIncome, expenses: totalExpenses, netProfit },
                dateRange: { from: startDate, to: endDate },
                companyDetails,
            }) as any
        );

        return new NextResponse(pdfStream as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Profit_Loss_${endDate.toISOString().slice(0, 10)}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error('Profit & Loss PDF Error:', error);
        return NextResponse.json({ message: error.message || 'Failed to generate PDF' }, { status: 500 });
    }
}