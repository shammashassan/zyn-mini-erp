// app/api/sessions/route.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { parseUserAgent } from "@/utils/device";

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all sessions for the current user
    const sessions = await auth.api.listSessions({
      headers: await headers(),
    });

    if (!sessions) {
      return NextResponse.json({ sessions: [] });
    }

    // Parse device info for each session
    const sessionsWithDeviceInfo = (Array.isArray(sessions) ? sessions : []).map((s: any) => {
      const deviceInfo = parseUserAgent(s.userAgent);
      return {
        ...s,
        ...deviceInfo,
        isCurrent: s.token === session.session.token,
      };
    });

    return NextResponse.json({ sessions: sessionsWithDeviceInfo });
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionToken = searchParams.get('token');
    const revokeAll = searchParams.get('all') === 'true';

    if (revokeAll) {
      // Revoke all sessions except current
      await auth.api.revokeSessions({
        headers: await headers(),
      });

      return NextResponse.json({ 
        success: true, 
        message: "All other sessions revoked" 
      });
    }

    if (!sessionToken) {
      return NextResponse.json(
        { error: "Session token required" },
        { status: 400 }
      );
    }

    // Revoke specific session
    await auth.api.revokeSession({
      body: {
        token: sessionToken,
      },
      headers: await headers(),
    });

    return NextResponse.json({ 
      success: true, 
      message: "Session revoked" 
    });
  } catch (error: any) {
    console.error("Error revoking session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to revoke session" },
      { status: 500 }
    );
  }
}