// app/api/chart-of-accounts/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ChartOfAccount from '@/models/ChartOfAccount';
import { softDelete } from '@/utils/softDelete';
import { requireAuthAndPermission } from "@/lib/auth-utils";

// GET - Fetch a single chart of account by ID
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { error } = await requireAuthAndPermission({
      chartOfAccounts: ["read"],
    });
    if (error) return error;

    await dbConnect();
    const account = await ChartOfAccount.findById(params.id);

    if (!account) {
      return NextResponse.json(
        { error: 'Chart of account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(account, { status: 200 });
  } catch (error) {
    console.error('Error fetching chart of account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart of account' },
      { status: 500 }
    );
  }
}

// PUT - Update a chart of account
export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const { error, session } = await requireAuthAndPermission({
      chartOfAccounts: ["update"],
    });
    if (error) return error;

    await dbConnect();

    const body = await request.json();
    const {
      accountName,
      groupName,
      subGroup,
      nature,
      description,
      isActive,
    } = body;

    const account = await ChartOfAccount.findById(params.id);

    if (!account) {
      return NextResponse.json(
        { error: 'Chart of account not found' },
        { status: 404 }
      );
    }

    // Update fields
    if (accountName !== undefined) account.accountName = accountName;
    if (groupName !== undefined) account.groupName = groupName;
    if (subGroup !== undefined) account.subGroup = subGroup;
    if (nature !== undefined) account.nature = nature;
    if (description !== undefined) account.description = description;
    if (isActive !== undefined) account.isActive = isActive;

    account.updatedBy = session.user.id;

    await account.save();

    return NextResponse.json(
      { message: 'Chart of account updated successfully', account },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error updating chart of account:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update chart of account' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a chart of account
export async function DELETE(
  request: NextRequest, 
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {

    const { error, session } = await requireAuthAndPermission({
      chartOfAccounts: ["soft_delete"],
    });
    if (error) return error;

    await dbConnect();

    const deletedAccount = await softDelete(
      ChartOfAccount,
      params.id,
      session.user.id
    );

    if (!deletedAccount) {
      return NextResponse.json(
        { error: 'Chart of account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: 'Chart of account moved to trash successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting chart of account:', error);
    return NextResponse.json(
      { error: 'Failed to delete chart of account' },
      { status: 500 }
    );
  }
}