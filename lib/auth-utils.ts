// lib/auth-utils.ts
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

/**
 * Check if user is authenticated
 * Returns session or error response
 */
export async function requireAuth() {
  // Use auth.api.getSession to leverage server-side caching mechanisms
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
 * Returns boolean or error response
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
    return {
      error: NextResponse.json(
        { error: "Forbidden: You don't have permission to perform this action" },
        { status: 403 }
      ),
      hasPermission: false,
    };
  }

  return { error: null, hasPermission: true };
}

/**
 * Combined auth check: authentication + permission
 * Returns session or error response
 */
export async function requireAuthAndPermission(
  permissions: Record<string, string[]>
) {
  // First check authentication
  const { error: authError, session } = await requireAuth();
  if (authError) {
    return { error: authError, session: null };
  }

  // Then check permission
  const { error: permError } = await requirePermission(
    session!.user.id,
    permissions
  );
  if (permError) {
    return { error: permError, session: null };
  }

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