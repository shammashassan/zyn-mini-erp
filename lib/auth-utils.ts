// lib/auth-utils.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { forbidden } from "next/navigation";
import { APIError } from "better-auth/api";
import { cache } from "react";

// Import the role type from your permissions file
import type { user, manager, admin, owner } from "@/lib/permissions";

export type Role = typeof user | typeof manager | typeof admin | typeof owner;

export interface UserInfo {
  id: string | null;
  username: string | null;
  email: string | null;
  name: string | null;
  role?: string | null;
}

/**
 * Cached session fetcher that runs exactly once per-request.
 */
export const getCachedSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

/**
 * Get authenticated user info from session
 * Returns null values if not authenticated
 */
export async function getUserInfo(): Promise<UserInfo> {
  try {
    const session = await getCachedSession();

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
      role: session.user.role,
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
  const session = await getCachedSession();

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      session: null, // Removed 'as const'
    };
  }

  return { error: null, session };
}

/**
 * Check if user has specific permissions
 * Throws forbidden() if not allowed
 */
export async function requirePermission(
  permissions: Record<string, string[]>,
  role?: "user" | "admin" | "manager" | "owner"
) {
  try {
    const result = await auth.api.userHasPermission({
      body: {
        role,
        permissions,
      },
      headers: await headers(),
    });

    const isAllowed = typeof result === 'boolean' ?
      result :
      result?.success === true;

    if (!isAllowed) {
      forbidden();
    }

    return { success: true };
  } catch (error) {
    if (error instanceof APIError) {
      console.error('Permission check failed:', error.message);
    }
    forbidden();
    throw new Error('Forbidden');
  }
}

/**
 * Combined auth check: requires authentication + permission
 * Throws forbidden() if permission is missing
 */
export async function requireAuthAndPermission(
  permissions: Record<string, string[]>
) {
  // First check authentication
  const { error: authError, session } = await requireAuth();
  if (authError) {
    return { error: authError, session: null }; // Removed 'as const'
  }

  // Check permission - user's role is inferred from session
  await requirePermission(permissions);

  return { error: null, session };
}

/**
 * Check permission without throwing (for conditional rendering)
 */
export async function checkPermission(
  permissions: Record<string, string[]>,
  role?: "user" | "admin" | "manager" | "owner"
): Promise<boolean> {
  try {
    const result = await auth.api.userHasPermission({
      body: {
        role,
        permissions,
      },
      headers: await headers(),
    });

    return typeof result === 'boolean' ?
      result :
      result?.success === true;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

/**
 * Validate required fields in request body
 */
export function validateRequiredFields(
  body: unknown,
  fields: string[]
): { error: NextResponse | null; isValid: boolean } {
  if (!body || typeof body !== 'object') {
    return {
      error: NextResponse.json({ error: "Invalid request body" }, { status: 400 }),
      isValid: false,
    };
  }

  for (const field of fields) {
    const value = (body as Record<string, unknown>)[field];
    if (value === undefined || value === null || value === "") {
      return {
        error: NextResponse.json({ error: `${field} is required` }, { status: 400 }),
        isValid: false,
      };
    }
  }

  return { error: null, isValid: true };
}