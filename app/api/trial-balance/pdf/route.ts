// app/api/reports/trial-balance/pdf/route.ts  (or wherever you placed it)

import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import dbConnect from '@/lib/dbConnect';
import CompanyDetails from '@/models/CompanyDetails';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { TrialBalanceDocument } from '@/components/pdf/TrialBalanceDocument';

export async function GET(request: NextRequest) {
    try {
        const { error } = await requireAuthAndPermission({ trialBalance: ['read'] });
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
            `${origin}/api/trial-balance?asOfDate=${asOfDateParam}`,
            { headers: { cookie: request.headers.get('cookie') || '' } }
        );

        if (!dataRes.ok) {
            const err = await dataRes.json().catch(() => ({}));
            return NextResponse.json(
                { message: err.message || `Data fetch failed with status ${dataRes.status}` },
                { status: dataRes.status }
            );
        }

        const { accounts: data, summary } = await dataRes.json();

        const pdfStream = await renderToStream(
            React.createElement(TrialBalanceDocument, { data, summary, asOfDate, companyDetails }) as any
        );

        return new NextResponse(pdfStream as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Trial_Balance_${asOfDate.toISOString().slice(0, 10)}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error('Trial Balance PDF Error:', error);
        return NextResponse.json({ message: error.message || 'Failed to generate PDF' }, { status: 500 });
    }
}