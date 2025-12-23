// app/api/employees/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Employee from "@/models/Employee";
import { getActive } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all active (non-deleted) employees
 */
export async function GET() {
  try {
    // Check authentication and permission
    const { error, session } = await requireAuthAndPermission({
      employee: ["read"],
    });

    if (error) return error;

    await dbConnect();

    // Using the utility function to get only active records
    const employees = await getActive(Employee);

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

/**
 * POST - Create a new employee
 */
export async function POST(request: Request) {
  try {
    // Check auth and permission
    const { error, session } = await requireAuthAndPermission({
      employee: ["create"],
    });

    if (error) return error;
    
    await dbConnect();
    const body = await request.json();

    const newEmployee = new Employee({
      ...body,
      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
    });

    await newEmployee.save();
    return NextResponse.json(newEmployee, { status: 201 });
  } catch (error) {
    console.error("Failed to create employee:", error);
    return NextResponse.json({ error: "Failed to create employee" }, { status: 400 });
  }
}