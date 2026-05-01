// app/api/expenses/[id]/route.ts - UPDATED: Handle expenseDate in PUT

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Expense from "@/models/Expense";
import Payee from "@/models/Payee";
import Voucher from "@/models/Voucher";
import { softDelete } from "@/utils/softDelete";
import { getUserInfo } from "@/lib/auth-utils";
import { voidJournalsForReference } from '@/utils/journalManager';
import { handleExpenseStatusChange } from '@/utils/journalAutoCreate';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { createPayeeSnapshot } from "@/utils/partySnapshot";

interface RequestContext {
  params: Promise<{
    id: string;
  }>
}

function detectChanges(oldExpense: any, newData: any) {
  const changes: Array<{ field: string; oldValue: any; newValue: any }> = [];
  const fieldsToTrack = ['amount', 'category', 'paymentMethod', 'vendor', 'notes', 'description', 'expenseDate', 'status']; // ✅ UPDATED: Changed from 'date' to 'expenseDate'

  for (const field of fieldsToTrack) {
    if (newData[field] !== undefined && oldExpense[field] !== newData[field]) {
      changes.push({
        field,
        oldValue: oldExpense[field],
        newValue: newData[field],
      });
    }
  }
  return changes;
}

export async function GET(request: Request, context: RequestContext) {
  try {
    const { error } = await requireAuthAndPermission({
      expense: ["read"],
    });

    if (error) return error;

    await dbConnect();

    const _ensuremodel = [Payee, Voucher];
    const { id } = await context.params;
    const includeDeleted = request.headers.get('X-Include-Deleted') === 'true';

    const expenseQuery = Expense.findById(id)
      .populate({
        path: 'connectedDocuments.paymentIds',
        model: 'Voucher',
        select: 'invoiceNumber grandTotal voucherType documentType isDeleted',
        match: { isDeleted: false }
      })
      .populate({
        path: 'payeeId',
        model: 'Payee',
        select: 'name type email phone'
      });

    if (includeDeleted) {
      expenseQuery.setOptions({ includeDeleted: true });
    }

    const expense = await expenseQuery;

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (expense.isDeleted && !includeDeleted) {
      return NextResponse.json({
        error: "This expense has been deleted"
      }, { status: 410 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    console.error(`Failed to fetch expense:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: Request, context: RequestContext) {
  try {
    const { error } = await requireAuthAndPermission({
      expense: ["update"],
    });

    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    const body = await request.json();
    const user = await getUserInfo();

    const currentExpense = await Expense.findById(id);

    if (!currentExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    // Permission check for editing approved expenses
    const isSystemUpdate = Object.keys(body).every(k =>
      ['connectedDocuments', 'paidAmount', 'paymentStatus', 'status', 'remainingAmount'].includes(k)
    );

    if (currentExpense.status === 'approved' && !isSystemUpdate) {
      if (body.status === 'approved' || !body.status) {
        return NextResponse.json({
          error: `Cannot edit details of an approved expense. Please change status to Pending first.`
        }, { status: 400 });
      }
    }

    // ✅ Handle payee changes - update snapshot
    if (body.payeeName && body.payeeName.trim()) {
      const payee = await Payee.findOneAndUpdate(
        { name: body.payeeName.trim() },
        {
          $setOnInsert: {
            name: body.payeeName.trim(),
            type: 'individual',
            email: '',
            phone: '',
            address: '',
            isDeleted: false,
            createdBy: user.id,
          }
        },
        { upsert: true, new: true }
      );

      body.payeeId = payee._id;

      // ✅ Update snapshot when payee changes
      if (body.payeeId !== currentExpense.payeeId?.toString()) {
        console.log(`🔄 Payee changed for expense ${id}, updating snapshot`);
        body.payeeSnapshot = await createPayeeSnapshot(payee._id);

        console.log(`   Old Payee: ${currentExpense.payeeSnapshot?.name || 'None'}`);
        console.log(`   New Payee: ${body.payeeSnapshot?.name}`);
      }

      delete body.payeeName;
      delete body.vendor;
    }
    // Manual vendor - keep as is, clean up other fields
    else if (body.vendor !== undefined) {
      delete body.payeeId;
      delete body.payeeName;
      delete body.payeeSnapshot; // Clear snapshot for manual vendor
    }

    // ✅ Sync expenseDate with legacy date field
    if (body.expenseDate) {
      body.date = body.expenseDate;
    }

    const oldStatus = currentExpense.status;
    const newStatus = body.status || oldStatus;

    const changes = detectChanges(currentExpense.toObject(), body);

    if (changes.length > 0) {
      currentExpense.addAuditEntry(
        'Updated',
        user.id,
        user.username,
        changes
      );
    }

    currentExpense.set({
      ...body,
      updatedBy: user.id,
    });

    await currentExpense.save();

    // Status Change Logic
    if (oldStatus !== newStatus) {
      await handleExpenseStatusChange(
        currentExpense.toObject(),
        oldStatus,
        newStatus,
        user.id,
        user.username || user.name
      );
    }

    return NextResponse.json(currentExpense);
  } catch (error) {
    console.error(`Failed to update expense:`, error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 400 });
  }
}

export async function DELETE(request: Request, context: RequestContext) {
  try {
    const { error } = await requireAuthAndPermission({
      expense: ["soft_delete"],
    });

    if (error) return error;

    await dbConnect();
    const { id } = await context.params;
    const user = await getUserInfo();

    const expense = await Expense.findById(id);

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    if (expense.isDeleted) {
      return NextResponse.json({ error: "Expense already deleted" }, { status: 400 });
    }

    await voidJournalsForReference(
      expense._id,
      user.id,
      user.username,
      'Expense soft deleted'
    );

    const deletedExpense = await softDelete(Expense, id, user.id, user.username);

    return NextResponse.json({
      message: "Expense soft deleted successfully",
      expense: deletedExpense
    });
  } catch (error) {
    console.error(`Failed to delete expense:`, error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}