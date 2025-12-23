// app/api/vouchers/trash/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Voucher from "@/models/Voucher";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all soft-deleted vouchers
 */
export async function GET(request: Request) {
  try {
    await dbConnect();
    
    // Permission Check
    const { error } = await requireAuthAndPermission({
      voucher: ["view_trash"],
    });
    if (error) return error;
    
    const trashedVouchers = await getTrash(Voucher);
    
    return NextResponse.json(trashedVouchers);
  } catch (error) {
    console.error("Failed to fetch trashed vouchers:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}