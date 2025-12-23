// lib/auth-helpers.ts
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

interface UserInfo {
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
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<UserInfo> {
  const user = await getUserInfo();
  
  if (!user.id) {
    throw new Error('Authentication required');
  }
  
  return user;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getUserInfo();
  return user.id !== null;
}