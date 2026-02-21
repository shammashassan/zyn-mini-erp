// app/api/financial-statements/cash-flow/pdf/route.ts

import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import dbConnect from '@/lib/dbConnect';
import CompanyDetails from '@/models/CompanyDetails';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { CashFlowDocument } from '@/components/pdf/CashFlowDocument';

export async function GET(request: NextRequest) {
    try {
        const { error } = await requireAuthAndPermission({ financialStatements: ['read'] });
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

        const dataRes = await fetch(
            `${origin}/api/financial-statements/cash-flow?startDate=${startDateParam}&endDate=${endDateParam}`,
            { headers: { cookie: request.headers.get('cookie') || '' } }
        );

        if (!dataRes.ok) {
            const err = await dataRes.json().catch(() => ({}));
            return NextResponse.json(
                { message: err.message || `Data fetch failed with status ${dataRes.status}` },
                { status: dataRes.status }
            );
        }

        const data = await dataRes.json();

        const pdfStream = await renderToStream(
            React.createElement(CashFlowDocument, {
                data,
                dateRange: { from: startDate, to: endDate },
                companyDetails,
            }) as any
        );

        return new NextResponse(pdfStream as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Cash_Flow_${endDate.toISOString().slice(0, 10)}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error('Cash Flow PDF Error:', error);
        return NextResponse.json({ message: error.message || 'Failed to generate PDF' }, { status: 500 });
    }
}