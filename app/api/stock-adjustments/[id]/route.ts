// app/api/stock-adjustments/[id]/route.ts - UPDATED: Uses itemId

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import StockAdjustment from '@/models/StockAdjustment';
import Item from '@/models/Item';
import { softDelete } from '@/utils/softDelete';
import { requireAuthAndPermission } from '@/lib/auth-utils';

interface RequestContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: Request, context: RequestContext) {
  try {
    const { error, session } = await requireAuthAndPermission({
      stockAdjustment: ['soft_delete'],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;

    const adj = await StockAdjustment.findById(id);
    if (!adj) {
      return NextResponse.json({ error: 'Adjustment record not found' }, { status: 404 });
    }
    if (adj.isDeleted) {
      return NextResponse.json({ error: 'Record is already deleted' }, { status: 400 });
    }

    // Revert the stock / cost change in the Item
    const item = await Item.findById(adj.itemId);
    if (item) {
      const stockRevert = adj.adjustmentType === 'increment' ? -adj.value : adj.value;
      const newStock = item.stock + stockRevert;
      const updatePayload: any = { stock: newStock };
      if (
        typeof adj.oldCostPrice === 'number' &&
        adj.oldCostPrice !== adj.newCostPrice
      ) {
        updatePayload.costPrice = adj.oldCostPrice;
      }
      await Item.findByIdAndUpdate(adj.itemId, updatePayload);
    }

    const deleted = await softDelete(StockAdjustment, id, session.user.id);
    return NextResponse.json({
      message: 'Adjustment soft deleted and changes reverted',
      adjustment: deleted,
    });
  } catch (error) {
    const { id } = await context.params;
    console.error(`DELETE /api/stock-adjustments/${id} error:`, error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}