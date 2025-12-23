// app/api/customers/trash/delete/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Customer from "@/models/Customer";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * DELETE - Permanently delete a customer
 * Body: { id: string }
 */
export async function DELETE(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      customer: ["permanent_delete"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();

    // Validate required fields
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { id } = body;
    
    // Check if the customer is soft-deleted first
    const customer = await Customer.findById(id).setOptions({ includeDeleted: true });
    
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    
    if (!customer.isDeleted) {
      return NextResponse.json({ 
        error: "Customer must be soft-deleted before permanent deletion" 
      }, { status: 400 });
    }
    
    const deletedCustomer = await permanentDelete(Customer, id);
    
    return NextResponse.json({ 
      message: "Customer permanently deleted",
      customer: deletedCustomer 
    });
  } catch (error) {
    console.error("Failed to permanently delete customer:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}