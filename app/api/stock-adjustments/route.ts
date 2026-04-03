// app/api/stock-adjustments/route.ts - UPDATED: Uses itemId (unified Item model)

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Item from '@/models/Item';
import StockAdjustment, { IStockAdjustment } from '@/models/StockAdjustment';
import { requireAuthAndPermission } from '@/lib/auth-utils';
import { extractTableParams, executePaginatedQuery } from '@/lib/query-builders';

// ─────────────────────────────────────────────────────────────────────────────
// GET  /api/stock-adjustments
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({ stockAdjustment: ['read'] });
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

      const result = await executePaginatedQuery(StockAdjustment, {
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
        const toDate = new Date(endDateParam);
        toDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = toDate;
      }
    }

    const adjustments = await StockAdjustment.find(filter).sort({ createdAt: -1 });
    return NextResponse.json(adjustments);
  } catch (error) {
    console.error('GET /api/stock-adjustments error:', error);
    return NextResponse.json({ error: 'Server error.' }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST  /api/stock-adjustments
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();

    let permissionRequired = ['create'];
    if (body.action === 'restore') permissionRequired = ['restore'];
    if (body.action === 'revert') permissionRequired = ['soft_delete'];

    const { error, session } = await requireAuthAndPermission({
      stockAdjustment: permissionRequired,
    });
    if (error) return error;

    switch (body.action) {
      // ── Revert (undo) an adjustment ────────────────────────────────────────
      case 'revert': {
        const adj: IStockAdjustment = body.payload;
        const item = await Item.findById(adj.itemId);
        if (item) {
          const stockRevert = adj.adjustmentType === 'increment' ? -adj.value : adj.value;
          const updatePayload: any = { $inc: { stock: stockRevert } };
          if (adj.oldCostPrice !== adj.newCostPrice) {
            updatePayload.costPrice = adj.oldCostPrice;
          }
          await Item.findByIdAndUpdate(adj.itemId, updatePayload);
        }
        await StockAdjustment.findByIdAndDelete(adj._id);
        return NextResponse.json({ message: 'Adjustment reverted successfully' });
      }

      // ── Restore a soft-deleted adjustment ──────────────────────────────────
      case 'restore': {
        const { _id, ...restoreData } = body.payload;
        const restored = new StockAdjustment({
          ...restoreData,
          createdAt: new Date(restoreData.createdAt),
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          updatedBy: session.user.id,
        });
        await restored.save();
        return NextResponse.json(restored, { status: 201 });
      }

      // ── New manual adjustment ───────────────────────────────────────────────
      default: {
        const {
          itemId,
          adjustmentType,
          value,
          newCostPrice,
          adjustmentReason,
        } = body;

        const item = await Item.findById(itemId);
        if (!item) {
          return NextResponse.json({ error: 'Item not found.' }, { status: 404 });
        }

        const oldStock = item.stock;
        const newStock = oldStock + (adjustmentType === 'increment' ? value : -value);
        const oldCostPrice = item.costPrice;
        const isCostChanged =
          newCostPrice !== undefined && newCostPrice !== oldCostPrice;

        if (newStock < 0) {
          return NextResponse.json(
            { error: 'Stock cannot go below zero.' },
            { status: 400 }
          );
        }
        if (isCostChanged && !adjustmentReason) {
          return NextResponse.json(
            { error: 'A reason is required when changing the cost price.' },
            { status: 400 }
          );
        }

        const itemUpdate: any = { stock: newStock };
        if (isCostChanged) itemUpdate.costPrice = newCostPrice;
        await Item.findByIdAndUpdate(itemId, itemUpdate);

        // Auto-lock unit on first stock entry
        if (!item.baseUnitLocked && newStock > 0) {
          await Item.findByIdAndUpdate(itemId, { baseUnitLocked: true });
        }

        const adjustment = await StockAdjustment.create({
          itemId,
          itemName: item.name,
          adjustmentType,
          value,
          oldStock,
          newStock,
          oldCostPrice,
          newCostPrice: isCostChanged ? newCostPrice : oldCostPrice,
          adjustmentReason: adjustmentReason || null,
          createdAt: new Date(),
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          createdBy: session.user.id,
        });

        return NextResponse.json(adjustment, { status: 201 });
      }
    }
  } catch (error) {
    console.error('POST /api/stock-adjustments error:', error);
    return NextResponse.json(
      { error: 'Failed to process stock adjustment.' },
      { status: 500 }
    );
  }
}