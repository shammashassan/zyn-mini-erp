// app/api/employees/[id]/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { requireAuthAndPermission } from "@/lib/auth-utils";
import Employee from "@/models/Employee";
import { softDelete } from "@/utils/softDelete";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

/**
 * PUT - Update an employee
 */
export async function PUT(request: Request, context: RequestContext) {
  try {
    // Check authentication
    const { error, session } = await requireAuthAndPermission({
      employee: ["update"],
    });

    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();

    // Get the current employee to check if it's deleted
    const currentEmployee = await Employee.findById(id);
    if (!currentEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Check if the employee is soft-deleted
    if (currentEmployee.isDeleted) {
      return NextResponse.json({
        error: "Cannot update a deleted employee. Please restore it first."
      }, { status: 400 });
    }

    const updatedEmployee = await Employee.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true
    });

    return NextResponse.json(updatedEmployee);
  } catch (error: any) {
    const params = await context.params;
    console.error(`Failed to update employee ${params.id}:`, error);

    if (error.name === 'ValidationError') {
      return NextResponse.json({
        error: "Validation failed",
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to update employee" }, { status: 400 });
  }
}

/**
 * DELETE - Soft delete an employee
 * Uses Better Auth to track who deleted it
 */
export async function DELETE(request: Request, context: RequestContext) {
  try {
    // Check authentication
    const { error, session } = await requireAuthAndPermission({
      employee: ["soft_delete"],
    });

    if (error) return error;

    await dbConnect();
    const { id } = await context.params;

    // softDelete utility automatically gets Better Auth user ID
    const deletedEmployee = await softDelete(Employee, id);

    if (!deletedEmployee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Employee soft deleted successfully",
      employee: deletedEmployee
    });
  } catch (error) {
    const params = await context.params;
    console.error(`Failed to delete employee ${params.id}:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}