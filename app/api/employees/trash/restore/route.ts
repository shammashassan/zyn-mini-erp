// app/api/employees/trash/restore/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";
import Employee from "@/models/Employee";
import { restore } from "@/utils/softDelete";

/**
 * POST - Restore a soft-deleted employee
 * Body: { id: string }
 */
export async function POST(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = body;

    // Validate required fields
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    // Check auth and permission
    const { error, session } = await requireAuthAndPermission({
      employee: ["restore"],
    });

    if (error) return error;

    const restoredEmployee = await restore(Employee, id);

    if (!restoredEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Employee restored successfully",
      employee: restoredEmployee
    });
  } catch (error) {
    console.error("Failed to restore employee:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}