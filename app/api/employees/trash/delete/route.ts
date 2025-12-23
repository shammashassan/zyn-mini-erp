// app/api/employees/trash/delete/route.ts

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";
import Employee from "@/models/Employee";
import { permanentDelete } from "@/utils/softDelete";

/*
 * DELETE - Permanently delete an employee
 */
export async function DELETE(request: Request) {
  try {
    await dbConnect();
    const body = await request.json();
    const { id } = body;

    // Validate required fields
    const { error: validationError } = validateRequiredFields(body, ["id"]);
    if (validationError) return validationError;

    // Check auth and permission
    const { error, session } = await requireAuthAndPermission({
      employee: ["permanent_delete"],
    });

    if (error) return error;

    // Check if the employee is soft-deleted first
    const employee = await Employee.findById(id).setOptions({ includeDeleted: true });
    
    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }
    
    if (!employee.isDeleted) {
      return NextResponse.json({ 
        error: "Employee must be soft-deleted before permanent deletion" 
      }, { status: 400 });
    }
    
    const deletedEmployee = await permanentDelete(Employee, id);
    
    return NextResponse.json({ 
      message: "Employee permanently deleted",
      employee: deletedEmployee 
    });
  } catch (error) {
    console.error("Failed to permanently delete employee:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}