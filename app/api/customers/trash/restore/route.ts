// app/api/customers/trash/restore/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Customer from "@/models/Customer";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * POST - Restore a soft-deleted customer
 * Body: { id: string }
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuthAndPermission({
      customer: ["restore"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();

    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;
    
    const { id } = body;
    
    if (!id) {
      return NextResponse.json({ error: "Customer ID is required" }, { status: 400 });
    }
    
    const restoredCustomer = await restore(Customer, id, session.user.id);
    
    if (!restoredCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: "Customer restored successfully",
      customer: restoredCustomer 
    });
  } catch (error) {
    console.error("Failed to restore customer:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}