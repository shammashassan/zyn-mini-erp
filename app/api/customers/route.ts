// app/api/customers/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Customer from "@/models/Customer";
import { getActive } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all active (non-deleted) customers
 */
export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      customer: ["read"],
    });
    if (error) return error;

    await dbConnect();
    
    // Using the utility function to get only active records
    const customers = await getActive(Customer);
    
    return NextResponse.json(customers);
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST - Create a new customer
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuthAndPermission({
      customer: ["create"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();
    
    const newCustomer = new Customer({
      ...body,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: session.user.id,
    });
    
    await newCustomer.save();
    return NextResponse.json(newCustomer, { status: 201 });
  } catch (error) {
    console.error("Failed to create customer:", error);
    return NextResponse.json({ error: "Failed to create customer" }, { status: 400 });
  }
}