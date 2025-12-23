// app/api/employees/trash/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import Employee from "@/models/Employee";
import { getTrash } from "@/utils/softDelete";

/**
 * GET all soft-deleted employees
 */
export async function GET() {
  try {
    // Check authentication
    const { error, session } = await requireAuthAndPermission({
      employee: ["view_trash"],
    });

    if (error) return error;

    await dbConnect();

    // Using the utility function to get only soft-deleted records
    const trashedEmployees = await getTrash(Employee);

    return NextResponse.json(trashedEmployees);
  } catch (error) {
    console.error("Failed to fetch trashed employees:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}