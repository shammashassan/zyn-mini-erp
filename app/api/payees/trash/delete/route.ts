// app/api/payees/trash/delete/route.ts
import { NextResponse } from "next/server";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";
import dbConnect from "@/lib/dbConnect";
import Payee from "@/models/Payee";

export async function DELETE(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      payee: ["permanent_delete"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();

    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { id } = body;
    
    const payee = await Payee.findById(id).setOptions({ includeDeleted: true });
    
    if (!payee) {
      return NextResponse.json({ error: "Payee not found" }, { status: 404 });
    }
    
    if (!payee.isDeleted) {
      return NextResponse.json({ 
        error: "Payee must be soft-deleted before permanent deletion" 
      }, { status: 400 });
    }
    
    const deletedPayee = await permanentDelete(Payee, id);
    
    return NextResponse.json({ 
      message: "Payee permanently deleted",
      payee: deletedPayee 
    });
  } catch (error) {
    console.error("Failed to permanently delete payee:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}