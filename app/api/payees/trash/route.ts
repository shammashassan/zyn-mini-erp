// app/api/payees/trash/route.ts
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Payee from "@/models/Payee";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

export async function GET() {
  try {
    const { error } = await requireAuthAndPermission({
      payee: ["view_trash"],
    });
    if (error) return error;

    await dbConnect();
    const trashedPayees = await getTrash(Payee);
    
    return NextResponse.json(trashedPayees);
  } catch (error) {
    console.error("Failed to fetch trashed payees:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}