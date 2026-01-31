
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Contact from '@/models/Contact';
import Party from '@/models/Party';
import { requireAuthAndPermission } from '@/lib/auth-utils';

export async function GET(request: Request) {
    try {
        const { error } = await requireAuthAndPermission({
            contact: ["read"]
        });
        if (error) return error;

        await dbConnect();
        const { searchParams } = new URL(request.url);
        const partyId = searchParams.get('partyId');
        const includeDeleted = searchParams.get('includeDeleted') === 'true';

        const query: any = {};

        if (!includeDeleted) {
            query.isDeleted = false;
        }

        if (partyId) {
            query.partyId = partyId;
        }

        const contacts = await Contact.find(query)
            .sort({ isPrimary: -1, name: 1 }) // Primary first
            .populate('partyId', 'company name')
            .lean();

        return NextResponse.json(contacts);
    } catch (error: any) {
        console.error('Error fetching contacts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch contacts' },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const { error, session } = await requireAuthAndPermission({
            contact: ["create"]
        });
        if (error) return error;

        await dbConnect();
        const body = await request.json();

        if (!body.partyId || !body.name) {
            return NextResponse.json(
                { error: 'Party ID and Name are required' },
                { status: 400 }
            );
        }

        // Verify party exists
        const party = await Party.findById(body.partyId);
        if (!party) {
            return NextResponse.json(
                { error: 'Invalid Party ID' },
                { status: 400 }
            );
        }

        // If setting as primary, unset others for this party
        if (body.isPrimary) {
            await Contact.updateMany(
                { partyId: body.partyId, isPrimary: true },
                { $set: { isPrimary: false } }
            );
        } else {
            // If this is the first contact, force it to be primary
            const count = await Contact.countDocuments({ partyId: body.partyId, isDeleted: false });
            if (count === 0) {
                body.isPrimary = true;
            }
        }

        const contact = await Contact.create({
            ...body,
            // Assuming Contact schema uses Mongoose timestamps. 
            // If creator tracking is needed, schema update required.
        });

        return NextResponse.json(contact, { status: 201 });
    } catch (error: any) {
        console.error('Error creating contact:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create contact' },
            { status: 500 }
        );
    }
}
