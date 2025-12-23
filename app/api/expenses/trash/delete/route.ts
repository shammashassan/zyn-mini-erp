// app/api/expenses/trash/delete/route.ts - UPDATED with permissions

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Expense from "@/models/Expense";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * DELETE - Permanently delete an expense
 * Body: { id: string }
 */
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = body;

    // Validate required fields
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    // Check authentication and permission
    const { error, session } = await requireAuthAndPermission({
      expense: ["permanent_delete"],
    });

    if (error) return error;
    
    // Check if the expense is soft-deleted first
    const expense = await Expense.findById(id).setOptions({ includeDeleted: true });
    
    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }
    
    if (!expense.isDeleted) {
      return NextResponse.json({ 
        error: "Expense must be soft-deleted before permanent deletion" 
      }, { status: 400 });
    }
    
    const deletedExpense = await permanentDelete(Expense, id);
    
    return NextResponse.json({ 
      message: "Expense permanently deleted",
      expense: deletedExpense 
    });
  } catch (error) {
    console.error("Failed to permanently delete expense:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}