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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const voucherType = searchParams.get("voucherType");

    const trashedVouchers = await getTrash(Voucher, {}, "partyId payeeId");

    // Filter by voucherType if provided
    const filteredVouchers = voucherType
      ? trashedVouchers.filter((v: any) => v.voucherType === voucherType)
      : trashedVouchers;

    return NextResponse.json(filteredVouchers);
  } catch (error) {
    console.error("Failed to fetch trashed vouchers:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}