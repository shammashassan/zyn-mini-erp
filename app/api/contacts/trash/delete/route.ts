
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Contact from "@/models/Contact";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * DELETE - Permanently delete a contact
 * Body: { id: string }
 */
export async function DELETE(request: Request) {
    try {
        const { error } = await requireAuthAndPermission({
            contact: ["permanent_delete"],
        });
        if (error) return error;

        await dbConnect();
        const body = await request.json();

        const { error: validationError } = validateRequiredFields(body, ["id"]);
        if (validationError) return validationError;

        const { id } = body;

        const contact = await Contact.findById(id).setOptions({ includeDeleted: true });

        if (!contact) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        if (!contact.isDeleted) {
            return NextResponse.json({
                error: "Contact must be soft-deleted before permanent deletion"
            }, { status: 400 });
        }

        const deletedContact = await permanentDelete(Contact, id);

        return NextResponse.json({
            message: "Contact permanently deleted",
            contact: deletedContact
        });
    } catch (error) {
        console.error("Failed to permanently delete contact:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
