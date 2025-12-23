// app/api/payees/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Payee from "@/models/Payee";
import { getActive } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all active (non-deleted) payees
 */
export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      payee: ["read"],
    });
    if (error) return error;

    await dbConnect();
    
    const payees = await getActive(Payee);
    
    return NextResponse.json(payees);
  } catch (error) {
    console.error("Failed to fetch payees:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST - Create a new payee
 */
export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuthAndPermission({
      payee: ["create"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();
    
    const newPayee = new Payee({
      ...body,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: session.user.id,
    });
    
    await newPayee.save();
    return NextResponse.json(newPayee, { status: 201 });
  } catch (error) {
    console.error("Failed to create payee:", error);
    return NextResponse.json({ error: "Failed to create payee" }, { status: 400 });
  }
}