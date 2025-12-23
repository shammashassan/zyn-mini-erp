// app/api/payees/[id]/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Payee from "@/models/Payee";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

/**
 * PUT - Update a payee
 */
export async function PUT(request: Request, context: RequestContext) {
  try {
    const { error, session } = await requireAuthAndPermission({
      payee: ["update"],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();
    
    const currentPayee = await Payee.findById(id);
    if (!currentPayee) {
      return NextResponse.json({ error: "Payee not found" }, { status: 404 });
    }

    if (currentPayee.isDeleted) {
      return NextResponse.json({ 
        error: "Cannot update a deleted payee. Please restore it first." 
      }, { status: 400 });
    }

    const updatedPayee = await Payee.findByIdAndUpdate(
      id, 
      { ...body, updatedBy: session.user.id },
      { new: true }
    );
    
    return NextResponse.json(updatedPayee);
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to update payee ${params.id}:`, error);
    return NextResponse.json({ error: "Failed to update payee" }, { status: 400 });
  }
}

/**
 * DELETE - Soft delete a payee
 */
export async function DELETE(request: Request, context: RequestContext) {
  try {
    const { error, session } = await requireAuthAndPermission({
      payee: ["soft_delete"],
    });
    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    
    const deletedPayee = await softDelete(Payee, id, session.user.id);
    
    if (!deletedPayee) {
      return NextResponse.json({ error: "Payee not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: "Payee soft deleted successfully",
      payee: deletedPayee 
    });
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to delete payee ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}