// app/api/customers/[id]/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Customer from "@/models/Customer";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

/**
 * PUT - Update a customer
 */
export async function PUT(request: Request, context: RequestContext) {
  try {
    const { error, session } = await requireAuthAndPermission({
      customer: ["update"],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();
    
    // Get the current customer to check if it's deleted
    const currentCustomer = await Customer.findById(id);
    if (!currentCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Check if the customer is soft-deleted
    if (currentCustomer.isDeleted) {
      return NextResponse.json({ 
        error: "Cannot update a deleted customer. Please restore it first." 
      }, { status: 400 });
    }

    const updatedCustomer = await Customer.findByIdAndUpdate(
      id, 
      { ...body, updatedBy: session.user.id },
      { new: true }
    );
    
    return NextResponse.json(updatedCustomer);
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to update customer ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update customer" }, { status: 400 });
  }
}

/**
 * DELETE - Soft delete a customer
 */
export async function DELETE(request: Request, context: RequestContext) {
  try {
    const { error, session } = await requireAuthAndPermission({
      customer: ["soft_delete"],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    
    // softDelete utility automatically gets Better Auth user ID
    const deletedCustomer = await softDelete(Customer, id, session.user.id);
    
    if (!deletedCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: "Customer soft deleted successfully",
      customer: deletedCustomer 
    });
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to delete customer ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}