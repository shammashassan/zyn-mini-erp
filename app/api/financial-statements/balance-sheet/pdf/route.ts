// app/api/reports/balance-sheet/pdf/route.ts

import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import dbConnect from '@/lib/dbConnect';
import CompanyDetails from '@/models/CompanyDetails';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { BalanceSheetDocument } from '@/components/pdf/BalanceSheetDocument';

export async function GET(request: NextRequest) {
    try {
        const { error } = await requireAuthAndPermission({ financialStatements: ['read'] });
        if (error) return error;

        const { searchParams, origin } = new URL(request.url);
        const asOfDateParam = searchParams.get('asOfDate');

        if (!asOfDateParam) {
            return NextResponse.json({ message: 'asOfDate is required' }, { status: 400 });
        }

        const asOfDate = new Date(asOfDateParam);

        await dbConnect();
        const companyDetails = await CompanyDetails.findOne() || null;

        const dataRes = await fetch(
            `${origin}/api/financial-statements/balance-sheet?asOfDate=${asOfDateParam}`,
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
            React.createElement(BalanceSheetDocument, { data, asOfDate, companyDetails }) as any
        );

        return new NextResponse(pdfStream as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Balance_Sheet_${asOfDate.toISOString().slice(0, 10)}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error('Balance Sheet PDF Error:', error);
        return NextResponse.json({ message: error.message || 'Failed to generate PDF' }, { status: 500 });
    }
}