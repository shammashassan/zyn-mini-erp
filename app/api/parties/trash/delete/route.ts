
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Party from "@/models/Party";
import { permanentDelete } from "@/utils/softDelete";
import { requireAuthAndPermission, validateRequiredFields } from "@/lib/auth-utils";

/**
 * DELETE - Permanently delete a party
 * Body: { id: string }
 */
export async function DELETE(request: Request) {
    try {
        const { error } = await requireAuthAndPermission({
            party: ["permanent_delete"],
        });
        if (error) return error;

        await dbConnect();
        const body = await request.json();

        // Validate required fields
        const { error: validationError } = validateRequiredFields(body, ["id"]);
        if (validationError) return validationError;

        const { id } = body;

        // Check if the party is soft-deleted first
        const party = await Party.findById(id).setOptions({ includeDeleted: true });

        if (!party) {
            return NextResponse.json({ error: "Party not found" }, { status: 404 });
        }

        if (!party.isDeleted) {
            return NextResponse.json({
                error: "Party must be soft-deleted before permanent deletion"
            }, { status: 400 });
        }

        const deletedParty = await permanentDelete(Party, id);

        return NextResponse.json({
            message: "Party permanently deleted",
            party: deletedParty
        });
    } catch (error) {
        console.error("Failed to permanently delete party:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
