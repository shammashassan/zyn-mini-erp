// app/api/vouchers/trash/delete/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Voucher from "@/models/Voucher";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * DELETE - Permanently delete a voucher
 */
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;
    
    const { id } = body;
    
    // Check if the voucher is soft-deleted first
    const voucher = await Voucher.findById(id).setOptions({ includeDeleted: true });
    
    if (!voucher) {
      return NextResponse.json({ error: "Voucher not found" }, { status: 404 });
    }

    // Permission Check
    const { error } = await requireAuthAndPermission({
      voucher: ["permanent_delete"],
    });
    if (error) return error;
    
    if (!voucher.isDeleted) {
      return NextResponse.json({ 
        error: "Voucher must be soft-deleted before permanent deletion" 
      }, { status: 400 });
    }
    
    const deletedVoucher = await permanentDelete(Voucher, id);
    
    return NextResponse.json({ 
      message: "Voucher permanently deleted",
      voucher: deletedVoucher 
    });
  } catch (error) {
    console.error("Failed to permanently delete voucher:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}