
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Party from "@/models/Party";
import { restore } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * POST - Restore a soft-deleted party
 * Body: { id: string }
 */
export async function POST(request: Request) {
    try {
        const { error, session } = await requireAuthAndPermission({
            party: ["restore"],
        });
        if (error) return error;

        await dbConnect();
        const body = await request.json();

        const { error: validationError } = validateRequiredFields(body, ["id"]);
        if (validationError) return validationError;

        const { id } = body;

        if (!id) {
            return NextResponse.json({ error: "Party ID is required" }, { status: 400 });
        }

        const restoredParty = await restore(Party, id, session.user.id);

        if (!restoredParty) {
            return NextResponse.json({ error: "Party not found" }, { status: 404 });
        }

        return NextResponse.json({
            message: "Party restored successfully",
            party: restoredParty
        });
    } catch (error) {
        console.error("Failed to restore party:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
