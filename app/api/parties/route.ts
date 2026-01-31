
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Party from '@/models/Party';
import { requireAuthAndPermission } from '@/lib/auth-utils';

export async function GET(request: Request) {
    try {
        const { error, session } = await requireAuthAndPermission({
            party: ["read"]
        });
        if (error) return error;

        await dbConnect();
        const { searchParams } = new URL(request.url);
        const role = searchParams.get('role'); // 'customer' | 'supplier'
        const search = searchParams.get('search');

        // Default to NOT showing deleted unless explicitly asked (and maybe check View Trash permission? But trash route handles that)
        // Usually main list should NOT show deleted.
        const includeDeleted = searchParams.get('includeDeleted') === 'true';

        const query: any = {};

        if (!includeDeleted) {
            query.isDeleted = false;
        }

        if (role === 'customer') {
            query['roles.customer'] = true;
        } else if (role === 'supplier') {
            query['roles.supplier'] = true;
        }

        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { company: searchRegex },
                { name: searchRegex },
                { phone: searchRegex },
                { email: searchRegex },
                { vatNumber: searchRegex }
            ];
        }

        const parties = await Party.find(query)
            .sort({ createdAt: -1 })
            .lean();

        // Transform for UI consistency if needed
        const formattedParties = parties.map(party => ({
            ...party,
            displayName: party.company || party.name
        }));

        return NextResponse.json(formattedParties);
    } catch (error: any) {
        console.error('Error fetching parties:', error);
        return NextResponse.json(
            { error: 'Failed to fetch parties' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const { error, session } = await requireAuthAndPermission({
            party: ["create"]
        });
        if (error) return error;

        await dbConnect();
        const body = await request.json();

        // Check for duplicate company name if provided
        if (body.company) {
            const existing = await Party.findOne({
                company: new RegExp(`^${body.company}$`, 'i'),
                isDeleted: false
            });
            if (existing) {
                return NextResponse.json(
                    { error: 'A party with this company name already exists' },
                    { status: 400 }
                );
            }
        }

        const party = await Party.create({
            ...body,
            createdBy: session.user.id, // Using ID consistently
        });

        return NextResponse.json(party, { status: 201 });
    } catch (error: any) {
        console.error('Error creating party:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create party' },
            { status: 500 }
        );
    }
}
