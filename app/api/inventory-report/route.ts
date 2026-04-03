// app/api/inventory-report/route.ts - Uses unified Item model

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Item from "@/models/Item";
import Purchase from "@/models/Purchase";
import StockAdjustment from "@/models/StockAdjustment";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { format } from 'date-fns';

interface InventoryItem {
    id: string;
    name: string;
    type: string;
    category: string;
    openingQty: number;
    purchased: number;
    adjusted: number;
    closingQty: number;
    unitCost: number;
    stockValue: number;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

interface InventorySummary {
    totalItems: number;
    totalStockValue: number;
    lowStockItems: number;
    outOfStockItems: number;
    avgStockValue: number;
}

interface MovementHistory {
    date: string;
    type: 'Purchase' | 'Adjustment';
    reference: string;
    itemName: string;
    quantity: number;
    unitCost?: number;
    total?: number;
}

export async function GET(request: Request) {
    try {
        const { error } = await requireAuthAndPermission({
            report: ["read"],
        });
        if (error) return error;

        await dbConnect();

        const { searchParams } = new URL(request.url);
        const startDateParam = searchParams.get('startDate');
        const endDateParam = searchParams.get('endDate');
        const lowStockOnly = searchParams.get('lowStockOnly') === 'true';

        if (!startDateParam || !endDateParam) {
            return NextResponse.json(
                { error: "startDate and endDate are required" },
                { status: 400 }
            );
        }

        const startDate = new Date(startDateParam);
        const endDate = new Date(endDateParam);
        endDate.setHours(23, 59, 59, 999);

        console.log(`📦 Fetching item inventory from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

        // 1. Fetch all active Items that are trackable (material or both)
        // Only items with 'material' in their types array have stock tracked via purchases
        const items = await Item.find({
            isDeleted: false,
            types: { $in: ['material'] }
        }).lean();

        // 2. AGGREGATION: Sum received quantities per item from Purchases
        // Purchase.inventoryStatus uses lowercase: 'received' | 'partially received'
        const purchaseStats = await Purchase.aggregate([
            {
                $match: {
                    isDeleted: false,
                    inventoryStatus: { $in: ['received', 'partially received'] },
                    date: { $gte: startDate, $lte: endDate }
                }
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.itemId", // itemId is a string on IPurchaseItem
                    totalQty: {
                        $sum: { $ifNull: ["$items.receivedQuantity", "$items.quantity"] }
                    }
                }
            }
        ]);

        // 3. AGGREGATION: Net stock adjustments per item
        const adjustmentStats = await StockAdjustment.aggregate([
            {
                $match: {
                    isDeleted: false,
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $group: {
                    _id: { $toString: "$itemId" },
                    netAdjustment: {
                        $sum: {
                            $cond: [
                                { $eq: ["$adjustmentType", "increment"] },
                                "$value",
                                { $multiply: ["$value", -1] }
                            ]
                        }
                    }
                }
            }
        ]);

        // Convert aggregation results to O(1) lookup maps
        const purchaseMap = new Map(
            purchaseStats.map(p => [String(p._id), p.totalQty as number])
        );
        const adjustmentMap = new Map(
            adjustmentStats.map(a => [String(a._id), a.netAdjustment as number])
        );

        // 4. Build inventory list
        const inventoryItems: InventoryItem[] = [];
        let lowStockCount = 0;
        let outOfStockCount = 0;

        for (const item of items) {
            const itemId = String(item._id);

            const currentStock = item.stock || 0;
            const purchased = purchaseMap.get(itemId) || 0;
            const adjusted = adjustmentMap.get(itemId) || 0;

            // Opening = Closing − Inflows − Net Adjustments
            const openingQty = currentStock - purchased - adjusted;
            const closingQty = currentStock;
            const unitCost = item.costPrice || 0;
            const stockValue = closingQty * unitCost;

            // Use item's configured minStockLevel, fall back to 10
            const minLevel = item.minStockLevel ?? 10;

            let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
            if (closingQty <= 0) {
                status = 'Out of Stock';
                outOfStockCount++;
            } else if (closingQty < minLevel) {
                status = 'Low Stock';
                lowStockCount++;
            }

            if (!lowStockOnly || status !== 'In Stock') {
                inventoryItems.push({
                    id: itemId,
                    name: item.name,
                    type: item.types.join('/'),
                    category: item.category || '',
                    openingQty,
                    purchased,
                    adjusted,
                    closingQty,
                    unitCost,
                    stockValue,
                    status
                });
            }
        }

        // 5. Summary
        const totalStockValue = inventoryItems.reduce((sum, i) => sum + i.stockValue, 0);
        const summary: InventorySummary = {
            totalItems: inventoryItems.length,
            totalStockValue,
            lowStockItems: lowStockCount,
            outOfStockItems: outOfStockCount,
            avgStockValue: inventoryItems.length > 0
                ? totalStockValue / inventoryItems.length
                : 0
        };

        // 6. Recent movement history (limited to keep payload light)
        const [recentPurchases, recentAdjustments] = await Promise.all([
            Purchase.find({
                isDeleted: false,
                inventoryStatus: { $in: ['received', 'partially received'] },
                date: { $gte: startDate, $lte: endDate }
            })
                .sort({ date: -1 })
                .limit(50)
                .lean(),

            StockAdjustment.find({
                isDeleted: false,
                createdAt: { $gte: startDate, $lte: endDate }
            })
                .sort({ createdAt: -1 })
                .limit(50)
                .lean()
        ]);

        const movementHistory: MovementHistory[] = [];

        recentPurchases.forEach(purchase => {
            purchase.items.forEach((item: any) => {
                movementHistory.push({
                    date: purchase.date.toISOString(),
                    type: 'Purchase',
                    reference: purchase.referenceNumber,
                    itemName: item.description || 'Unknown',
                    quantity: item.receivedQuantity || item.quantity,
                    unitCost: item.unitCost,
                    total: item.total
                });
            });
        });

        recentAdjustments.forEach(adj => {
            movementHistory.push({
                date: adj.createdAt.toISOString(),
                type: 'Adjustment',
                reference: `ADJ-${format(new Date(adj.createdAt), 'yyyyMMdd')}`,
                itemName: adj.itemName || 'Unknown',
                quantity: adj.adjustmentType === 'increment' ? adj.value : -adj.value
            });
        });

        movementHistory.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        return NextResponse.json({
            summary,
            inventory: inventoryItems,
            movements: movementHistory
        });

    } catch (error) {
        console.error("Inventory Report API error:", error);
        return NextResponse.json(
            { error: "Failed to fetch inventory data" },
            { status: 500 }
        );
    }
}