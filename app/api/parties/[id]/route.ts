
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Party from "@/models/Party";
import { softDelete } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

interface RequestContext {
    params: Promise<{
        id: string;
    }>
}

/**
 * PUT - Update a party
 */
export async function PUT(request: Request, context: RequestContext) {
    try {
        const { error, session } = await requireAuthAndPermission({
            party: ["update"],
        });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;
        const body = await request.json();

        // Get the current party to check if it's deleted
        const currentParty = await Party.findById(id);
        if (!currentParty) {
            return NextResponse.json({ error: "Party not found" }, { status: 404 });
        }

        // Check if the party is soft-deleted
        if (currentParty.isDeleted) {
            return NextResponse.json({
                error: "Cannot update a deleted party. Please restore it first."
            }, { status: 400 });
        }

        const updatedParty = await Party.findByIdAndUpdate(
            id,
            { ...body, updatedBy: session.user.id },
            { new: true }
        );

        return NextResponse.json(updatedParty);
    } catch (error) {
        const params = await context.params;
        console.error(`Failed to update party ${params.id}:`, error);
        return NextResponse.json({ error: "Failed to update party" }, { status: 400 });
    }
}

/**
 * DELETE - Soft delete a party
 */
export async function DELETE(request: Request, context: RequestContext) {
    try {
        const { error, session } = await requireAuthAndPermission({
            party: ["soft_delete"],
        });
        if (error) return error;

        await dbConnect();
        const { id } = await context.params;

        // softDelete utility automatically gets Better Auth user ID
        const deletedParty = await softDelete(Party, id, session.user.id);

        if (!deletedParty) {
            return NextResponse.json({ error: "Party not found" }, { status: 404 });
        }

        return NextResponse.json({
            message: "Party soft deleted successfully",
            party: deletedParty
        });
    } catch (error) {
        const params = await context.params;
        console.error(`Failed to delete party ${params.id}:`, error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
