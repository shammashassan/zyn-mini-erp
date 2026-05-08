
import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Contact from "@/models/Contact";
import { getTrash } from "@/utils/softDelete";
import { requireAuthAndPermission } from "@/lib/auth-utils";

/**
 * GET all soft-deleted contacts
 */
export async function GET() {
    try {
        const { error } = await requireAuthAndPermission({
            contact: ["view_trash"],
        });
        if (error) return error;

        await dbConnect();

        const trashedContacts = await getTrash(Contact, {}, "partyId");

        return NextResponse.json(trashedContacts);
    } catch (error) {
        console.error("Failed to fetch trashed contacts:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
