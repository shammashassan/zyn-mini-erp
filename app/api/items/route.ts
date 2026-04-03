// app/api/items/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item from '@/models/Item';
import { getActive } from '@/utils/softDelete';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { extractTableParams, executePaginatedQuery } from '@/lib/query-builders';

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/items
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
    try {
        const { error } = await requireAuthAndPermission({ item: ['read'] });
        if (error) return error;

        await dbConnect();

        const { searchParams } = new URL(request.url);
        const isServerSide = searchParams.has('page') || searchParams.has('pageSize');

        // Filter by types (e.g. ?types=product  or  ?types=material)
        const typesParam = searchParams.get('types');

        if (isServerSide) {
            const { page, pageSize, sorting, filters } = extractTableParams(searchParams);

            const baseFilter: any = { isDeleted: false };
            if (typesParam) baseFilter.types = { $in: [typesParam] };

            const result = await executePaginatedQuery(Item, {
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

        // Simple list (used by selectors in forms)
        const filter: any = { isDeleted: false };
        if (typesParam) filter.types = { $in: [typesParam] };

        const items = await Item.find(filter).sort({ name: 1 }).lean();
        return NextResponse.json(items);
    } catch (error) {
        console.error('GET /api/items error:', error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST  /api/items
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
    try {
        const { error, session } = await requireAuthAndPermission({ item: ['create'] });
        if (error) return error;

        await dbConnect();
        const body = await request.json();

        const {
            name,
            types,
            category,
            sellingPrice = 0,
            costPrice = 0,
            taxRate = 5,
            taxType = 'standard',
            unit = 'piece',
            stock = 0,
            minStockLevel = 0,
            bom = [],
            sku,
            barcode,
            notes,
        } = body;

        // Validation
        if (!name?.trim()) {
            return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
        }
        if (!Array.isArray(types) || types.length === 0) {
            return NextResponse.json(
                { error: 'At least one type (product or material) is required' },
                { status: 400 }
            );
        }
        if (!category?.trim()) {
            return NextResponse.json({ error: 'Category is required' }, { status: 400 });
        }

        const newItem = new Item({
            name: name.trim(),
            types,
            category: category.trim(),
            sellingPrice,
            costPrice,
            taxRate,
            taxType,
            unit,
            stock,
            minStockLevel,
            bom,
            sku,
            barcode,
            notes,
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            createdBy: session.user.id,
        });

        await newItem.save();
        return NextResponse.json(newItem, { status: 201 });
    } catch (error: any) {
        console.error('POST /api/items error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create item' },
            { status: 400 }
        );
    }
}