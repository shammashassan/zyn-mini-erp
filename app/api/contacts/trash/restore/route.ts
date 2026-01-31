
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Contact from "@/models/Contact";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * POST - Restore a soft-deleted contact
 * Body: { id: string }
 */
export async function POST(request: Request) {
    try {
        const { error, session } = await requireAuthAndPermission({
            contact: ["restore"],
        });
        if (error) return error;

        await dbConnect();
        const body = await request.json();

        const { error: validationError } = validateRequiredFields(body, ["id"]);
        if (validationError) return validationError;

        const { id } = body;

        const restoredContact = await restore(Contact, id, session.user.id);

        if (!restoredContact) {
            return NextResponse.json({ error: "Contact not found" }, { status: 404 });
        }

        return NextResponse.json({
            message: "Contact restored successfully",
            contact: restoredContact
        });
    } catch (error) {
        console.error("Failed to restore contact:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
