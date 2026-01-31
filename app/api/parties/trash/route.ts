
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Party from "@/models/Party";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all soft-deleted parties
 */
export async function GET() {
    try {
        const { error } = await requireAuthAndPermission({
            party: ["view_trash"],
        });
        if (error) return error;

        await dbConnect();

        // Using the utility function to get only soft-deleted records
        const trashedParties = await getTrash(Party);

        return NextResponse.json(trashedParties);
    } catch (error) {
        console.error("Failed to fetch trashed parties:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
