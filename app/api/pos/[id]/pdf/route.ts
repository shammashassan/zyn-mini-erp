// app/api/pos/[id]/pdf/route.ts

import { NextRequest, NextResponse } from 'next/server';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import dbConnect from '@/lib/dbConnect';
import POSSale from '@/models/POSSale';
import CompanyDetails from '@/models/CompanyDetails';
import { POSReceiptDocument } from '@/components/pdf/POSReceiptDocument';
import { requireAuthAndPermission } from '@/lib/auth-utils';

interface RequestContext {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RequestContext) {
    try {
        const { id } = await context.params;

        if (!id || id === 'undefined') {
            return NextResponse.json({ message: 'Sale ID is missing' }, { status: 400 });
        }

        const { error } = await requireAuthAndPermission({ invoice: ['read'] });
        if (error) return error;

        await dbConnect();

        const sale = await POSSale.findById(id).setOptions({ includeDeleted: true });
        if (!sale) return NextResponse.json({ message: 'POS sale not found' }, { status: 404 });

        let companyDetails = await CompanyDetails.findOne();
        if (!companyDetails) {
            companyDetails = {
                companyName: 'My Company',
                address: 'Address not set',
                email: 'email@example.com',
                contactNumber: '',
            } as any;
        }

        const documentElement = React.createElement(POSReceiptDocument, {
            sale,
            companyDetails,
        });

        const pdfStream = await renderToStream(documentElement as any);

        return new NextResponse(pdfStream as any, {
            status: 200,
            headers: {
                'Content-Type': 'application/pdf',
                'Content-Disposition': `inline; filename="${sale.saleNumber}_receipt.pdf"`,
            },
        });
    } catch (error: any) {
        console.error('POS PDF generation error:', error);
        return NextResponse.json({ message: 'Failed to generate PDF', error: error.message }, { status: 500 });
    }
}