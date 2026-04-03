// app/api/items/[id]/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item from '@/models/Item';
import StockAdjustment from '@/models/StockAdjustment';
import { softDelete } from '@/utils/softDelete';
import { requireAuthAndPermission } from '@/lib/auth-utils';

interface RequestContext {
    params: Promise<{ id: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/items/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request, context: RequestContext) {
    try {
        const { error } = await requireAuthAndPermission({ item: ['read'] });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;

        const item = await Item.findById(id).populate({
            path: 'bom.itemId',
            select: 'name unit category costPrice stock',
        });

        if (!item) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json(item);
    } catch (error) {
        const { id } = await context.params;
        console.error(`GET /api/items/${id} error:`, error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT  /api/items/[id]
// ─────────────────────────────────────────────────────────────────────────────
export async function PUT(request: Request, context: RequestContext) {
    try {
        const { error, session } = await requireAuthAndPermission({ item: ['update'] });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;
        const body = await request.json();

        const current = await Item.findById(id);
        if (!current) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }
        if (current.isDeleted) {
            return NextResponse.json(
                { error: 'Cannot update a deleted item. Please restore it first.' },
                { status: 400 }
            );
        }

        // Unit-lock guard
        if (body.unit && body.unit !== current.unit) {
            if (current.baseUnitLocked) {
                return NextResponse.json(
                    { error: 'Cannot change unit after stock movements have been recorded.' },
                    { status: 400 }
                );
            }
        }

        const updated = await Item.findByIdAndUpdate(
            id,
            { ...body, updatedBy: session.user.id },
            { new: true }
        );

        // Auto-lock unit on first stock entry
        if (!current.baseUnitLocked && (updated?.stock ?? 0) > 0) {
            await Item.findByIdAndUpdate(id, { baseUnitLocked: true });
        }

        // Create stock adjustment record if stock or costPrice changed
        const oldStock = current.stock;
        const newStock = updated?.stock ?? oldStock;
        const oldCostPrice = current.costPrice;
        const newCostPrice = updated?.costPrice ?? oldCostPrice;

        if (oldStock !== newStock || oldCostPrice !== newCostPrice) {
            const stockDiff = newStock - oldStock;
            await StockAdjustment.create({
                itemId: id,
                itemName: updated?.name ?? current.name,
                adjustmentType: stockDiff >= 0 ? 'increment' : 'decrement',
                value: Math.abs(stockDiff),
                oldStock,
                newStock,
                oldCostPrice,
                newCostPrice,
                adjustmentReason: 'Item page edit',
                createdAt: new Date(),
            });
        }

        return NextResponse.json(updated);
    } catch (error) {
        const { id } = await context.params;
        console.error(`PUT /api/items/${id} error:`, error);
        return NextResponse.json({ error: 'Failed to update item' }, { status: 400 });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE  /api/items/[id]  (soft delete)
// ─────────────────────────────────────────────────────────────────────────────
export async function DELETE(request: Request, context: RequestContext) {
    try {
        const { error, session } = await requireAuthAndPermission({ item: ['soft_delete'] });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;

        const deleted = await softDelete(Item, id, session.user.id);
        if (!deleted) {
            return NextResponse.json({ error: 'Item not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Item moved to trash', item: deleted });
    } catch (error) {
        const { id } = await context.params;
        console.error(`DELETE /api/items/${id} error:`, error);
        return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
}