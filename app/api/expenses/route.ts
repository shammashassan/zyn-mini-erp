// app/api/expenses/route.ts - UPDATED: Using expenseDate for filtering and sorting

import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Expense from "@/models/Expense";
import Payee from "@/models/Payee";
import Voucher from "@/models/Voucher";
import { getActive } from "@/utils/softDelete";
import { getUserInfo } from "@/lib/auth-helpers";
import { createJournalForExpense } from '@/utils/journalAutoCreate';
import generateInvoiceNumber from '@/utils/invoiceNumber';
import { requireAuthAndPermission } from "@/lib/auth-utils";
import { createPayeeSnapshot } from "@/utils/partySnapshot";

/**
 * GET all active expenses with manual server-side pagination and date filtering
 */
export async function GET(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      expense: ["read"],
    });

    if (error) return error;

    await dbConnect();

    const _ensureModels = [Payee, Voucher];

    const { searchParams } = new URL(request.url);

    // Detect server-side mode parameters
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '10');
    const populate = searchParams.get('populate') === 'true';
    const type = searchParams.get('type');
    const sortParam = searchParams.get('sort');
    const filtersParam = searchParams.get('filters');

    // Extract date params (support both naming conventions)
    const startDateParam = searchParams.get('startDate') || searchParams.get('from');
    const endDateParam = searchParams.get('endDate') || searchParams.get('to');

    // Build Query
    const query: any = { isDeleted: false };

    // 1. Handle Type Filter
    if (type && type !== 'all') {
      query.type = type;
    }

    // 2. ✅ UPDATED: Handle Date Range Filter using expenseDate
    if (startDateParam || endDateParam) {
      query.expenseDate = {}; // Changed from createdAt to expenseDate
      if (startDateParam) {
        query.expenseDate.$gte = new Date(startDateParam);
      }
      if (endDateParam) {
        const end = new Date(endDateParam);
        end.setHours(23, 59, 59, 999);
        query.expenseDate.$lte = end;
      }
    }

    // 3. Handle Column Filters (safe parsing)
    if (filtersParam) {
      try {
        const filters = JSON.parse(filtersParam);
        if (Array.isArray(filters)) {
          filters.forEach((filter: any) => {
            if (filter?.id && filter?.value) {

              // ✅ Handle 'vendor' filter (searches vendor OR payeeSnapshot.name)
              if (filter.id === 'vendor') {
                const searchRegex = { $regex: filter.value, $options: 'i' };
                query.$or = [
                  { vendor: searchRegex },
                  { 'payeeSnapshot.name': searchRegex }
                ];
                return; // Skip default handling
              }

              // Regex search for string fields
              if (['referenceNumber', 'category', 'description', 'status', 'paymentStatus'].includes(filter.id)) {
                if (Array.isArray(filter.value)) {
                  query[filter.id] = { $in: filter.value };
                } else {
                  query[filter.id] = { $regex: filter.value, $options: 'i' };
                }
              }
            }
          });
        }
      } catch (e) {
        console.error("Error parsing filters:", e);
      }
    }

    // 4. ✅ UPDATED: Handle Sorting (default to expenseDate)
    let sortQuery: any = { expenseDate: -1 }; // Changed from createdAt to expenseDate
    if (sortParam) {
      try {
        const sorting = JSON.parse(sortParam);
        if (Array.isArray(sorting) && sorting.length > 0) {
          sortQuery = {}; // Reset default
          sorting.forEach((sort: any) => {
            if (sort?.id) {
              sortQuery[sort.id] = sort.desc ? -1 : 1;
            }
          });
        }
      } catch (e) {
        console.error("Error parsing sort:", e);
      }
    }

    // 5. Calculate Skip
    const skip = (page - 1) * pageSize;

    // 6. Execute Count & Find
    const totalCount = await Expense.countDocuments(query);

    let expensesQuery = Expense.find(query)
      .sort(sortQuery)
      .skip(skip)
      .limit(pageSize);

    // Always populate party references
    expensesQuery = expensesQuery

      .populate({
        path: 'payeeId',
        model: 'Payee',
        select: 'name type email phone'
      })

    // 7. Handle Connected Documents Population
    if (populate) {
      expensesQuery = expensesQuery.populate({
        path: 'connectedDocuments.paymentIds',
        model: 'Voucher',
        select: 'invoiceNumber grandTotal voucherType documentType isDeleted',
        match: { isDeleted: false }
      });
    }

    const expenses = await expensesQuery.exec();

    return NextResponse.json({
      data: expenses,
      pageCount: Math.ceil(totalCount / pageSize),
      totalCount,
      currentPage: page,
      pageSize,
    });

  } catch (error: any) {
    console.error("Failed to fetch expenses:", error);
    return NextResponse.json({
      error: "Server error",
      details: error.message
    }, { status: 500 });
  }
}

/**
 * POST - Create a new expense with payee snapshot support
 */
export async function POST(request: Request) {
  try {
    const { error } = await requireAuthAndPermission({
      expense: ["create"],
    });

    if (error) return error;

    await dbConnect();
    const body = await request.json();
    const user = await getUserInfo();

    // Handle restore action
    if (body.action === 'restore') {
      const { _id, ...restoreData } = body.payload;
      const restoredExpense = new Expense({
        ...restoreData,
        isDeleted: false,
        deletedAt: null,
        deletedBy: null,
      });
      await restoredExpense.save();
      return NextResponse.json(restoredExpense, { status: 201 });
    }

    console.log("Incoming expense data:", body);

    // ✅ AUTO-CREATE PAYEE if payeeName is provided
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
      delete body.vendor;
      delete body.payeeName;
    }
    // Manual vendor - just a string, no relation
    else if (body.vendor) {
      delete body.payeeId;
      delete body.payeeName;
    } else {
      // If absolutely nothing provided
      return NextResponse.json({ error: "Payee Name or Vendor Name is required" }, { status: 400 });
    }

    // ✅ Validate expenseDate
    if (!body.expenseDate) {
      return NextResponse.json({
        error: 'Expense date is required'
      }, { status: 400 });
    }

    // ✅ Create immutable snapshot of payee (if payeeId exists)
    let payeeSnapshot = null;
    if (body.payeeId) {
      payeeSnapshot = await createPayeeSnapshot(body.payeeId);
    }

    const referenceNumber = await generateInvoiceNumber('expense');

    const existingExpense = await Expense.findOne({
      referenceNumber,
      isDeleted: false
    });

    if (existingExpense) {
      return NextResponse.json({
        error: 'Failed to generate unique reference number. Please try again.',
        details: 'Reference number collision detected'
      }, { status: 500 });
    }

    // ✅ Set both date and expenseDate for backward compatibility
    const newExpense = new Expense({
      ...body,
      referenceNumber,
      expenseDate: new Date(body.expenseDate),
      date: new Date(body.expenseDate), // Sync legacy field

      // ✅ Add snapshot (legal/historical truth)
      payeeSnapshot,

      isDeleted: false,
      deletedAt: null,
      deletedBy: null,
      createdBy: user.id,
      updatedBy: user.id,
    });

    newExpense.addAuditEntry('Created', user.id, user.username);

    await newExpense.save();

    console.log(`✅ Successfully created expense: ${newExpense.referenceNumber}`);
    if (payeeSnapshot) {
      console.log(`   Payee: ${payeeSnapshot.name}`);
    } else if (body.vendor) {
      console.log(`   Vendor: ${body.vendor}`);
    }

    // Conditional journal entry creation - only for APPROVED expenses
    if (newExpense.status === 'approved') {
      console.log('📊 Creating journal for APPROVED expense');
      try {
        await createJournalForExpense(
          newExpense.toObject(),
          user.id,
          user.username || user.name
        );
      } catch (journalError) {
        console.error('Failed to create journal entry:', journalError);
      }
    }

    return NextResponse.json({ expense: newExpense }, { status: 201 });
  } catch (error) {
    console.error("Failed to create expense:", error);
    return NextResponse.json({ error: "Failed to create expense" }, { status: 400 });
  }
}