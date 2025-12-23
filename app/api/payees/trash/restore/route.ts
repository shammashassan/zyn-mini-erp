// app/api/payees/trash/restore/route.ts
import { NextResponse } from "next/server";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";
import dbConnect from "@/lib/dbConnect";
import Payee from "@/models/Payee";

export async function POST(request: Request) {
  try {
    const { error, session } = await requireAuthAndPermission({
      payee: ["restore"],
    });
    if (error) return error;

    await dbConnect();
    const body = await request.json();

    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    const { id } = body;
    
    const restoredPayee = await restore(Payee, id, session.user.id);
    
    if (!restoredPayee) {
      return NextResponse.json({ error: "Payee not found" }, { status: 404 });
    }
    
    return NextResponse.json({ 
      message: "Payee restored successfully",
      payee: restoredPayee 
    });
  } catch (error) {
    console.error("Failed to restore payee:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}