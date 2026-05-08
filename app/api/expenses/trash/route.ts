// app/api/expenses/trash/route.ts - UPDATED with permissions

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Expense from "@/models/Expense";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all soft-deleted expenses
 */
export async function GET() {
  try {
    // Check authentication and permission
    const { error, session } = await requireAuthAndPermission({
      expense: ["view_trash"],
    });

    if (error) return error;

    await dbConnect();
    
    // Using the utility function to get only soft-deleted records and populating payeeId
    const trashedExpenses = await getTrash(Expense, {}, "payeeId");
    
    return NextResponse.json(trashedExpenses);
  } catch (error) {
    console.error("Failed to fetch trashed expenses:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}