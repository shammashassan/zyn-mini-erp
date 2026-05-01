// lib/auth-utils.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { forbidden } from "next/navigation";

export interface UserInfo {
  id: string | null;
  username: string | null;
  email: string | null;
  name: string | null;
}

/**
 * Get authenticated user info from session
 * Returns null values if not authenticated
 */
export async function getUserInfo(): Promise<UserInfo> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return { 
        id: null, 
        username: null,
        email: null,
        name: null 
      };
    }

    return {
      id: session.user.id,
      username: session.user.username || session.user.name || null,
      email: session.user.email,
      name: session.user.name,
    };
  } catch (error) {
    console.error('Auth error:', error);
    return { 
      id: null, 
      username: null,
      email: null,
      name: null 
    };
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getUserInfo();
  return user.id !== null;
}

/**
 * Check if user is authenticated
 * Returns session or error response for API routes
 */
export async function requireAuth() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null,
    };
  }

  return { error: null, session };
}

/**
 * Check if user has specific permissions
 * Throws forbidden() if not allowed (Next.js 16 approach)
 */
export async function requirePermission(
  userId: string,
  permissions: Record<string, string[]>
) {
  const result = await auth.api.userHasPermission({
    body: {
      userId,
      permissions,
    },
  });

  const isAllowed = typeof result === 'boolean' ? result : result?.success;

  if (!isAllowed) {
    forbidden();
  }

  return { error: null, hasPermission: true };
}

/**
 * Combined auth check: authentication + permission
 * Throws forbidden() if permission is missing
 */
export async function requireAuthAndPermission(
  permissions: Record<string, string[]>
) {
  // First check authentication
  const { error: authError, session } = await requireAuth();
  if (authError) {
    return { error: authError, session: null };
  }

  // Then check permission (this will throw forbidden() if unauthorized)
  await requirePermission(
    session!.user.id,
    permissions
  );

  return { error: null, session };
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: any,
  fields: string[]
): { error: NextResponse | null; isValid: boolean } {
  for (const field of fields) {
    const value = body[field];
    if (value === undefined || value === null || value === "") {
      return {
        error: NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        ),
        isValid: false,
      };
    }
  }

  return { error: null, isValid: true };
}