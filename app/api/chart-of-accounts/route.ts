// app/api/chart-of-accounts/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ChartOfAccount from '@/models/ChartOfAccount';
import { requireAuthAndPermission } from "@/lib/auth-utils";

// GET - Fetch all chart of accounts
export async function GET(request: NextRequest) {
  try {
    const { error } = await requireAuthAndPermission({
      chartOfAccounts: ["read"],
    });
    if (error) return error;

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const groupName = searchParams.get('groupName');
    const subGroup = searchParams.get('subGroup');
    const isActive = searchParams.get('isActive');

    let query: any = {};

    if (groupName) query.groupName = groupName;
    if (subGroup) query.subGroup = subGroup;
    if (isActive !== null) query.isActive = isActive === 'true';

    const accounts = await ChartOfAccount.find(query).sort({ accountCode: 1 });

    return NextResponse.json(accounts, { status: 200 });
  } catch (error) {
    console.error('Error fetching chart of accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chart of accounts' },
      { status: 500 }
    );
  }
}

// POST - Create a new chart of account
export async function POST(request: NextRequest) {
  try {

    const { error, session } = await requireAuthAndPermission({
      chartOfAccounts: ["create"],
    });
    if (error) return error;

    await dbConnect();

    const body = await request.json();
    const {
      accountCode,
      accountName,
      groupName,
      subGroup,
      nature,
      description,
      isActive,
    } = body;

    // Validation
    if (!accountCode || !accountName || !groupName || !subGroup || !nature) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check for duplicate account code
    const existingAccount = await ChartOfAccount.findOne({
      accountCode: accountCode.toUpperCase()
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: 'Account code already exists' },
        { status: 409 }
      );
    }

    // Create new chart of account
    const account = new ChartOfAccount({
      accountCode: accountCode.toUpperCase(),
      accountName,
      groupName,
      subGroup,
      nature,
      description,
      isActive: isActive !== undefined ? isActive : true,
      createdBy: session.user.id,
    });

    await account.save();

    return NextResponse.json(
      { message: 'Chart of account created successfully', account },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating chart of account:', error);

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Account code already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to create chart of account' },
      { status: 500 }
    );
  }
}