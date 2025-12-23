// app/api/inventory-report/route.ts - OPTIMIZED: Uses Aggregation for calculations

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Material from "@/models/Material";
import Purchase from "@/models/Purchase";
import StockAdjustment from "@/models/StockAdjustment";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { format } from 'date-fns';

interface InventoryItem {
  id: string;
  name: string;
  type: 'Material';
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

    console.log(`📦 Fetching material inventory from ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);

    // 1. Fetch Master Data (Materials)
    // We still fetch all materials because we need to list items even if they had no movement
    const materials = await Material.find({ isDeleted: false }).lean();

    // 2. AGGREGATION: Sum Purchases by Material
    const purchaseStats = await Purchase.aggregate([
      {
        $match: {
          isDeleted: false,
          status: { $in: ['Received', 'Partially Received'] },
          date: { $gte: startDate, $lte: endDate }
        }
      },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.materialId", // Group by Material ID
          totalQty: { $sum: { $ifNull: ["$items.receivedQuantity", "$items.quantity"] } }
        }
      }
    ]);

    // 3. AGGREGATION: Sum Adjustments by Material
    const adjustmentStats = await StockAdjustment.aggregate([
      {
        $match: {
          isDeleted: false,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: "$materialId",
          netAdjustment: {
            $sum: {
              $cond: [
                { $eq: ["$adjustmentType", "increment"] },
                "$value",
                { $multiply: ["$value", -1] } // Decrement is negative
              ]
            }
          }
        }
      }
    ]);

    // Convert Aggregation Results to Maps for O(1) Lookup
    // We cast to string because ObjectId keys can sometimes be tricky in Maps
    const purchaseMap = new Map(purchaseStats.map(p => [String(p._id), p.totalQty]));
    const adjustmentMap = new Map(adjustmentStats.map(a => [String(a._id), a.netAdjustment]));

    // 4. Process Inventory List
    const inventoryItems: InventoryItem[] = [];
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const material of materials) {
      const materialId = String(material._id);
      
      const currentStock = material.stock || 0;
      
      // Lookup pre-calculated totals instead of looping through arrays
      const purchased = purchaseMap.get(materialId) || 0;
      const adjusted = adjustmentMap.get(materialId) || 0;

      // Derived Opening: Closing - Inflow - NetAdjustment
      const openingQty = currentStock - purchased - adjusted;
      const closingQty = currentStock; 
      const stockValue = closingQty * (material.unitCost || 0);

      let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
      if (closingQty <= 0) {
        status = 'Out of Stock';
        outOfStockCount++;
      } else if (closingQty < 10) { 
        status = 'Low Stock';
        lowStockCount++;
      }

      if (!lowStockOnly || status !== 'In Stock') {
        inventoryItems.push({
          id: materialId,
          name: material.name,
          type: 'Material',
          category: material.type,
          openingQty,
          purchased,
          adjusted,
          closingQty,
          unitCost: material.unitCost || 0,
          stockValue,
          status
        });
      }
    }

    // 5. Calculate Summary
    const totalStockValue = inventoryItems.reduce((sum, item) => sum + item.stockValue, 0);
    const summary: InventorySummary = {
      totalItems: inventoryItems.length,
      totalStockValue,
      lowStockItems: lowStockCount,
      outOfStockItems: outOfStockCount,
      avgStockValue: inventoryItems.length > 0 ? totalStockValue / inventoryItems.length : 0
    };

    // 6. Movement History (Limit this to avoid massive payload)
    // We fetch only the top 100 most recent movements to keep the report light
    // If you need *all* movements, this should really be a separate paginated API.
    
    const [recentPurchases, recentAdjustments] = await Promise.all([
      Purchase.find({
        isDeleted: false,
        status: { $in: ['Received', 'Partially Received'] },
        date: { $gte: startDate, $lte: endDate }
      })
      .sort({ date: -1 })
      .limit(50) // Limit to prevent crash
      .lean(),

      StockAdjustment.find({
        isDeleted: false,
        createdAt: { $gte: startDate, $lte: endDate }
      })
      .sort({ createdAt: -1 })
      .limit(50) // Limit to prevent crash
      .lean()
    ]);

    const movementHistory: MovementHistory[] = [];

    recentPurchases.forEach(purchase => {
      purchase.items.forEach((item: any) => {
        movementHistory.push({
          date: purchase.date.toISOString(),
          type: 'Purchase',
          reference: purchase.referenceNumber,
          itemName: item.materialName,
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
        reference: `ADJ-${format(adj.createdAt, 'yyyyMMdd')}`,
        itemName: adj.materialName,
        quantity: adj.adjustmentType === 'increment' ? adj.value : -adj.value
      });
    });

    // Final sort of the combined limited list
    movementHistory.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
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