// app/api/pos/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import POSSale from '@/models/POSSale';
import Item from '@/models/Item';
import Party from '@/models/Party';
import generateInvoiceNumber from '@/utils/invoiceNumber';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { extractTableParams, executePaginatedQuery } from '@/lib/query-builders';
import { deductStockForPOSSale } from '@/utils/inventoryManager';
import { createJournalForPOSSale } from '@/utils/journalAutoCreate';
import { createPartySnapshot } from '@/utils/partySnapshot';
import { unstable_rethrow } from 'next/navigation';

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/pos  — paginated list of POS sales
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
    try {
        const { error } = await requireAuthAndPermission({ invoice: ['read'] });
        if (error) return error;

        await dbConnect();
        const { searchParams } = new URL(request.url);
        const isServerSide = searchParams.has('page') || searchParams.has('pageSize');

        const startDateParam = searchParams.get('startDate') || searchParams.get('from');
        const endDateParam = searchParams.get('endDate') || searchParams.get('to');

        if (isServerSide) {
            const { page, pageSize, sorting, filters } = extractTableParams(searchParams);
            const baseFilter: any = { isDeleted: false };

            if (startDateParam || endDateParam) {
                baseFilter.createdAt = {};
                if (startDateParam) baseFilter.createdAt.$gte = new Date(startDateParam);
                if (endDateParam) {
                    const end = new Date(endDateParam);
                    end.setHours(23, 59, 59, 999);
                    baseFilter.createdAt.$lte = end;
                }
            }

            const customerFilterIdx = filters.findIndex((f: any) => f.id === 'customerName');
            if (customerFilterIdx !== -1) {
                const f = filters[customerFilterIdx];
                baseFilter.customerName = { $regex: f.value, $options: 'i' };
                filters.splice(customerFilterIdx, 1);
            }

            const result = await executePaginatedQuery(POSSale, {
                baseFilter,
                columnFilters: filters,
                sorting,
                page,
                pageSize,
                defaultSort: { createdAt: -1 },
            });

            return NextResponse.json({
                data: result.data,
                pageCount: result.pageCount,
                totalCount: result.totalCount,
                currentPage: result.currentPage,
                pageSize: result.pageSize,
            });
        }

        const filter: any = { isDeleted: false };
        if (startDateParam || endDateParam) {
            filter.createdAt = {};
            if (startDateParam) filter.createdAt.$gte = new Date(startDateParam);
            if (endDateParam) {
                const end = new Date(endDateParam);
                end.setHours(23, 59, 59, 999);
                filter.createdAt.$lte = end;
            }
        }

        const sales = await POSSale.find(filter).sort({ createdAt: -1 });
        return NextResponse.json(sales);
    } catch (error) {
        unstable_rethrow(error);
        console.error('GET /api/pos error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST  /api/pos  — create a new POS sale
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
    try {
        const { error, session } = await requireAuthAndPermission({ invoice: ['create'] });
        if (error) return error;

        await dbConnect();
        const body = await request.json();

        const { items, discount = 0, paymentMethod = 'Cash', partyId, notes } = body;

        if (!Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
        }
        if (!paymentMethod) {
            return NextResponse.json({ error: 'Payment method is required' }, { status: 400 });
        }

        // ── Totals ───────────────────────────────────────────────────────────────
        const grossTotal = items.reduce((s: number, i: any) => s + (Number(i.total) || 0), 0);
        const vatAmount = items.reduce((s: number, i: any) => s + (Number(i.taxAmount) || 0), 0);
        const subTotal = Math.max(grossTotal - Number(discount), 0);
        const grandTotal = subTotal + vatAmount;

        // ── Party snapshot ───────────────────────────────────────────────────────
        let customerName = 'Walk-in Customer';
        let customerType: 'walk-in' | 'party' = 'walk-in';
        let partySnapshot: any = undefined;

        if (partyId) {
            try {
                const { partySnapshot: snap } = await createPartySnapshot(partyId, undefined);
                partySnapshot = snap;
                customerName = snap.displayName;
                customerType = 'party';
            } catch {
                // Fall back to walk-in if party fetch fails
            }
        }

        // ── Generate sale number ──────────────────────────────────────────────────
        const saleNumber = await generateInvoiceNumber('pos');

        // ── Create POSSale document (get _id before stock ops) ───────────────────
        const saleData: any = {
            saleNumber,
            customerType,
            customerName,
            partyId: partyId || undefined,
            partySnapshot,
            items: items.map((i: any) => ({
                itemId: i.itemId || undefined,
                description: i.description,
                quantity: Number(i.quantity) || 0,
                rate: Number(i.rate) || 0,
                total: Number(i.total) || 0,
                taxRate: Number(i.taxRate) || 0,
                taxAmount: Number(i.taxAmount) || 0,
            })),
            discount: Number(discount),
            totalAmount: grossTotal,
            vatAmount,
            grandTotal,
            paymentMethod,
            notes,
            stockAdjustmentIds: [],
            createdBy: session.user.id,
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
        };

        const sale = new POSSale(saleData);

        // ── Deduct stock ──────────────────────────────────────────────────────────
        let stockAdjustmentIds: any[] = [];
        let cogsAmount = 0;

        try {
            const stockResult = await deductStockForPOSSale(sale._id, items);
            stockAdjustmentIds = stockResult.adjustmentIds;
            cogsAmount = stockResult.cogsAmount;
        } catch (stockError: any) {
            return NextResponse.json(
                { error: `Stock error: ${stockError.message}` },
                { status: 400 }
            );
        }

        // ── Save sale ─────────────────────────────────────────────────────────────
        sale.stockAdjustmentIds = stockAdjustmentIds;
        await sale.save();

        // ── Create journal (revenue + COGS in one balanced entry) ─────────────────
        const journal = await createJournalForPOSSale(
            sale.toObject(),
            session.user.id,
            session.user.username || session.user.name,
            cogsAmount
        );

        if (journal) {
            sale.journalId = journal._id;
            await sale.save();
        }

        console.log(`✅ POS Sale created: ${saleNumber} — ${customerName} — ${grandTotal}`);

        return NextResponse.json({ message: 'POS sale created', sale }, { status: 201 });
    } catch (error: any) {
        unstable_rethrow(error);
        console.error('POST /api/pos error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}