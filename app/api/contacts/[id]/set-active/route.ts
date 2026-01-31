
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Contact from "@/models/Contact";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

interface RequestContext {
    params: Promise<{
        id: string;
    }>
}

/**
 * POST - Set contact active/inactive
 * Body: { active: boolean }
 */
export async function POST(request: Request, context: RequestContext) {
    try {
        const { error } = await requireAuthAndPermission({
            contact: ["update"],
        });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;
        const body = await request.json();

        const { error: validationError } = validateRequiredFields(body, ["active"]);
        if (validationError) return validationError;

        const { active } = body;

        const contact = await Contact.findById(id);
        if (!contact) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        if (contact.isDeleted) {
            return NextResponse.json({ error: "Cannot modify a deleted contact" }, { status: 400 });
        }

        const updatedContact = await Contact.findByIdAndUpdate(
            id,
            { isActive: active },
            { new: true }
        );

        return NextResponse.json({
            message: `Contact ${active ? 'activated' : 'deactivated'} successfully`,
            contact: updatedContact
        });
    } catch (error) {
        const params = await context.params;
        console.error(`Failed to update contact status ${params.id}:`, error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
