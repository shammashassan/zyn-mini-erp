
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Contact from "@/models/Contact";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RequestContext {
    params: Promise<{
        id: string;
    }>
}

/**
 * PUT - Update a contact
 */
export async function PUT(request: Request, context: RequestContext) {
    try {
        const { error, session } = await requireAuthAndPermission({
            contact: ["update"],
        });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;
        const body = await request.json();

        // Get the current contact
        const currentContact = await Contact.findById(id);
        if (!currentContact) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        if (currentContact.isDeleted) {
            return NextResponse.json({
                error: "Cannot update a deleted contact. Please restore it first."
            }, { status: 400 });
        }

        // Handle primary contact logic if changing isPrimary to true
        if (body.isPrimary && !currentContact.isPrimary) {
            await Contact.updateMany(
                { partyId: currentContact.partyId, isPrimary: true },
                { $set: { isPrimary: false } }
            );
        }

        const updatedContact = await Contact.findByIdAndUpdate(
            id,
            { ...body }, // Contact schema doesn't track updatedBy usually, but if added later, add here
            { new: true }
        );

        return NextResponse.json(updatedContact);
    } catch (error) {
        const params = await context.params;
        console.error(`Failed to update contact ${params.id}:`, error);
        return NextResponse.json({ error: "Failed to update contact" }, { status: 400 });
    }
}

/**
 * DELETE - Soft delete a contact
 */
export async function DELETE(request: Request, context: RequestContext) {
    try {
        const { error, session } = await requireAuthAndPermission({
            contact: ["soft_delete"],
        });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;

        const deletedContact = await softDelete(Contact, id, session.user.id);

        if (!deletedContact) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        return NextResponse.json({
            message: "Contact soft deleted successfully",
            contact: deletedContact
        });
    } catch (error) {
        const params = await context.params;
        console.error(`Failed to delete contact ${params.id}:`, error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
