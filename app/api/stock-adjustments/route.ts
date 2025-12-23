// app/api/stock-adjustments/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Material from "@/models/Material";
import StockAdjustment, { IStockAdjustment } from "@/models/StockAdjustment";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { extractTableParams, executePaginatedQuery } from "@/lib/query-builders";

export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      stockAdjustment: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);

    // ✅ Detect server-side mode
    const isServerSide = searchParams.has('page') || searchParams.has('pageSize');

    // Extract date params (support both naming conventions)
    const startDateParam = searchParams.get('startDate') || searchParams.get('from');
    const endDateParam = searchParams.get('endDate') || searchParams.get('to');

    if (isServerSide) {
      // 🚀 SERVER-SIDE MODE
      const { page, pageSize, sorting, filters } = extractTableParams(searchParams);

      const baseFilter: any = { isDeleted: false };

      // Apply Date Range Filter
      if (startDateParam || endDateParam) {
        baseFilter.createdAt = {};
        if (startDateParam) {
          baseFilter.createdAt.$gte = new Date(startDateParam);
        }
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

    } else {
      // 📋 CLIENT-SIDE MODE (fallback)
      const filter: any = { isDeleted: false };

      // Apply Date Range Filter
      if (startDateParam || endDateParam) {
        filter.createdAt = {};
        if (startDateParam) filter.createdAt.$gte = new Date(startDateParam);
        if (endDateParam) {
          const toDate = new Date(endDateParam);
          toDate.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = toDate;
        }
      }

      const activeAdjustments = await StockAdjustment.find(filter)
        .sort({ createdAt: -1 });
      
      return NextResponse.json(activeAdjustments);
    }
  } catch (error) {
    console.error("Failed to fetch stock adjustments:", error);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// POST remains UNCHANGED except for imports
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Determine permission needed based on action
    let permissionRequired = ["create"];
    if (body.action === 'restore') permissionRequired = ["restore"];
    if (body.action === 'revert') permissionRequired = ["soft_delete"];

    const { error, session } = await requireAuthAndPermission({
      stockAdjustment: permissionRequired,
    });
    if (error) return error;

    switch (body.action) {
      case 'revert': {
        const adjustmentToRevert: IStockAdjustment = body.payload;
        
        const material = await Material.findById(adjustmentToRevert.materialId);
        if (material) {
          const stockRevertValue = adjustmentToRevert.adjustmentType === 'increment' 
            ? -adjustmentToRevert.value 
            : +adjustmentToRevert.value;
          
          const isUnitCostChanged = adjustmentToRevert.oldUnitCost !== adjustmentToRevert.newUnitCost;

          const updatePayload: { $inc: { stock: number }; unitCost?: number } = {
            $inc: { stock: stockRevertValue }
          };

          if (isUnitCostChanged) {
            updatePayload.unitCost = adjustmentToRevert.oldUnitCost;
          }
          
          await Material.findByIdAndUpdate(adjustmentToRevert.materialId, updatePayload);
        }
        
        await StockAdjustment.findByIdAndDelete(adjustmentToRevert._id);
        return NextResponse.json({ message: "Adjustment reverted successfully" });
      }

      case 'restore': {
        const { _id, ...restoreData } = body.payload;
        const restoredAdjustment = new StockAdjustment({
          ...restoreData,
          createdAt: new Date(restoreData.createdAt),
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          updatedBy: session.user.id
        });
        await restoredAdjustment.save();
        return NextResponse.json(restoredAdjustment, { status: 201 });
      }

      default: {
        const { materialId, adjustmentType, value, newUnitCost, adjustmentReason } = body;
        const originalMaterial = await Material.findById(materialId);
        if (!originalMaterial) {
          return NextResponse.json({ error: "Material not found." }, { status: 404 });
        }
        const oldStock = originalMaterial.stock;
        const newStock = oldStock + (adjustmentType === 'increment' ? value : -value);
        const oldUnitCost = originalMaterial.unitCost;
        const isUnitCostChanged = newUnitCost !== undefined && newUnitCost !== oldUnitCost;

        if (newStock < 0) {
          return NextResponse.json({ error: "Stock cannot be negative." }, { status: 400 });
        }
        if (isUnitCostChanged && !adjustmentReason) {
          return NextResponse.json({ error: "A reason is required when changing the unit cost." }, { status: 400 });
        }

        const updatePayload: { stock: number; unitCost?: number } = { stock: newStock };
        if (isUnitCostChanged) {
          updatePayload.unitCost = newUnitCost;
        }
        await Material.findByIdAndUpdate(materialId, updatePayload);
        
        const adjustmentData = {
          materialId,
          materialName: originalMaterial.name,
          adjustmentType,
          value,
          oldStock,
          newStock,
          oldUnitCost,
          newUnitCost: isUnitCostChanged ? newUnitCost : oldUnitCost,
          adjustmentReason: adjustmentReason || null,
          createdAt: new Date(),
          isDeleted: false,
          deletedAt: null,
          deletedBy: null,
          createdBy: session.user.id,
        };
        
        const newAdjustment = await StockAdjustment.create(adjustmentData);
        
        return NextResponse.json(newAdjustment, { status: 201 });
      }
    }
  } catch (error) {
    console.error("Failed to process stock adjustment:", error);
    return NextResponse.json({ error: "Failed to process stock adjustment." }, { status: 500 });
  }
}