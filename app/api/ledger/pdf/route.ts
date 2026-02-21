// app/api/ledger/pdf/route.ts

import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import dbConnect from '@/lib/dbConnect';
import CompanyDetails from '@/models/CompanyDetails';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { LedgerDocument } from '@/components/pdf/LedgerDocument';

export async function GET(request: NextRequest) {
    try {
        const { error } = await requireAuthAndPermission({ ledger: ['read'] });
        if (error) return error;

        const { searchParams, origin } = new URL(request.url);
        const accountCode = searchParams.get('accountCode');
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');

        if (!accountCode || !startDateParam || !endDateParam) {
            return NextResponse.json(
                { message: 'accountCode, startDate and endDate are required' },
                { status: 400 }
            );
        }

        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);

        await dbConnect();
        const companyDetails = await CompanyDetails.findOne() || null;

        // Forward all params including optional partyId
        const dataRes = await fetch(
            `${origin}/api/ledger?${searchParams.toString()}`,
            { headers: { cookie: request.headers.get('cookie') || '' } }
        );

        if (!dataRes.ok) {
            const err = await dataRes.json().catch(() => ({}));
            return NextResponse.json(
                { message: err.message || `Data fetch failed with status ${dataRes.status}` },
                { status: dataRes.status }
            );
        }

        const ledgerData = await dataRes.json();

        const pdfStream = await renderToStream(
            React.createElement(LedgerDocument, {
                ledgerData,
                startDate,
                endDate,
                companyDetails,
            }) as any
        );

        return new NextResponse(pdfStream as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Ledger_${accountCode}.pdf"`,
            },
        });
    } catch (error: any) {
        console.error('Ledger PDF Error:', error);
        return NextResponse.json({ message: error.message || 'Failed to generate PDF' }, { status: 500 });
    }
}