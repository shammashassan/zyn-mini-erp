// app/api/stock-adjustments/trash/restore/route.ts - UPDATED: Uses itemId

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StockAdjustment from '@/models/StockAdjustment';
import Item from '@/models/Item';
import { restore } from '@/utils/softDelete';
import { requireAuthAndPermission, validateRequiredFields } from '@/lib/auth-utils';

export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuthAndPermission({
      stockAdjustment: ['restore'],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();

    const { error: validationError } = validateRequiredFields(body, ['id']);
    if (validationError) return validationError;

    const { id } = body;

    const adj = await StockAdjustment.findById(id).setOptions({ includeDeleted: true });
    if (!adj) {
      return NextResponse.json({ error: 'Adjustment not found' }, { status: 404 });
    }
    if (!adj.isDeleted) {
      return NextResponse.json({ error: 'Adjustment is not deleted' }, { status: 400 });
    }

    // Re-apply the stock / cost change to the Item
    const item = await Item.findById(adj.itemId);
    if (item) {
      const stockReapply = adj.adjustmentType === 'increment' ? adj.value : -adj.value;
      const newStock = item.stock + stockReapply;
      const updatePayload: any = { stock: newStock };
      if (
        typeof adj.newCostPrice === 'number' &&
        adj.newCostPrice !== adj.oldCostPrice
      ) {
        updatePayload.costPrice = adj.newCostPrice;
      }
      await Item.findByIdAndUpdate(adj.itemId, updatePayload);
    }

    const restored = await restore(StockAdjustment, id, session.user.id);
    return NextResponse.json({
      message: 'Adjustment restored and changes reapplied',
      adjustment: restored,
    });
  } catch (error) {
    console.error('POST /api/stock-adjustments/trash/restore error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}