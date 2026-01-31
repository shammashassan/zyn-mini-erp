
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Contact from "@/models/Contact";
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RequestContext {
    params: Promise<{
        id: string;
    }>
}

/**
 * POST - Set contact as primary
 */
export async function POST(request: Request, context: RequestContext) {
    try {
        const { error } = await requireAuthAndPermission({
            contact: ["update"],
        });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;

        const contact = await Contact.findById(id);
        if (!contact) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        if (contact.isDeleted) {
            return NextResponse.json({ error: "Cannot modify a deleted contact" }, { status: 400 });
        }

        // Unset other primary contacts for the same party
        await Contact.updateMany(
            { partyId: contact.partyId, isPrimary: true },
            { $set: { isPrimary: false } }
        );

        // Set this contact as primary
        const updatedContact = await Contact.findByIdAndUpdate(
            id,
            { isPrimary: true },
            { new: true }
        );

        return NextResponse.json({
            message: "Contact set as primary successfully",
            contact: updatedContact
        });
    } catch (error) {
        const params = await context.params;
        console.error(`Failed to set contact primary ${params.id}:`, error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
