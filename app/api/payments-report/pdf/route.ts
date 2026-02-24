import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import dbConnect from '@/lib/dbConnect';
import CompanyDetails from '@/models/CompanyDetails';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { PaymentsReportDocument } from '@/components/pdf/PaymentsReportDocument';

export async function GET(request: NextRequest) {
    try {
        const { error } = await requireAuthAndPermission({ report: ['read'] });
        if (error) return error;

        const { searchParams, origin } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        if (!startDate || !endDate) {
            return NextResponse.json({ message: 'startDate and endDate are required' }, { status: 400 });
        }

        await dbConnect();
        const companyDetails = await CompanyDetails.findOne() || null;

        const dataRes = await fetch(
            `${origin}/api/payments-report?startDate=${startDate}&endDate=${endDate}`,
            { headers: { cookie: request.headers.get('cookie') || '' } }
        );

        if (!dataRes.ok) {
            const err = await dataRes.json().catch(() => ({}));
            return NextResponse.json({ message: err.message || `Data fetch failed` }, { status: dataRes.status });
        }

        const apiData = await dataRes.json();
        const dateRange = { from: new Date(startDate), to: new Date(endDate) };

        // Build monthly breakdown from transactions if not present directly
        const monthlyBreakdown = apiData.monthlyBreakdown ?? [];
        const summary = apiData.summary;

        const pdfStream = await renderToStream(
            React.createElement(PaymentsReportDocument, {
                monthlyBreakdown,
                summary,
                dateRange,
                companyDetails,
            }) as any
        );

        return new NextResponse(pdfStream as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="Payments_Report.pdf"`,
            },
        });
    } catch (error: any) {
        console.error('Payments Report PDF Error:', error);
        return NextResponse.json({ message: error.message || 'Failed to generate PDF' }, { status: 500 });
    }
}
