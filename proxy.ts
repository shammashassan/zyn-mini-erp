import { NextRequest, NextResponse } from "next/server";
import { ratelimit } from "@/utils/rateLimit";
import { getSessionCookie } from "better-auth/cookies";

// Define public routes that don't require authentication
const PUBLIC_ROUTES = ['/login'];

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ⚡ STATIC ASSET GUARD — must be first, before any auth logic.
  // If the matcher config is not excluding these correctly, this catches them.
  // _next/static, _next/image, and any file with an extension must always pass through.
  if (
    path.startsWith('/_next/') ||
    path.startsWith('/favicon') ||
    (!path.startsWith('/api/') && /\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)$/i.test(path))
  ) {
    return NextResponse.next();
  }

  // 🛡️ RATE LIMITING LOGIC
  // Narrow rate limiting strictly to sensitive authentication routes under /api/auth/ (POST only)
  // to avoid hitting Upstash Redis on standard business transactions.
  if (path.startsWith('/api/auth/') && request.method === 'POST') {
    try {
      // 1. Safe IP Detection
      const forwardedFor = request.headers.get("x-forwarded-for");
      const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
      // 2. Rate Limit Check
      const { success } = await ratelimit.limit(ip);

      if (!success) {
        return NextResponse.json(
          { error: "Too many requests. Please try again later." },
          { status: 429 }
        );
      }
    } catch (error) {
      // Fail open: If Redis fails, let the request through
      console.error("Rate limit error:", error);
    }
  }


  // 🔴 API ROUTES: Skip proxy
  // Let the API route handlers verify the token/permissions themselves.
  // They are better equipped to return JSON 401/403 errors than the proxy.
  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }

  // 1. OPTIMISTIC SESSION CHECK (No Database Call)
  // Instead of calling auth.api.getSession() which hits the DB,
  // we simply check if the session cookie exists using Better Auth's helper.
  const sessionCookie = getSessionCookie(request);

  const isLikelyAuthenticated = !!sessionCookie;

  // 2. Handle Root Path "/"
  if (path === "/") {
    if (isLikelyAuthenticated) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    } else {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // 3. Handle Public Routes (Login, Register, etc.)
  // If user is already logged in, redirect them to dashboard.
  // HOWEVER, if the user was explicitly redirected here by a client-side auth guard
  // (indicated by callbackURL), we bypass this to prevent infinite redirect loops on stale cookies.
  if (PUBLIC_ROUTES.some(route => path.startsWith(route))) {
    if (isLikelyAuthenticated && !request.nextUrl.searchParams.has("callbackURL")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 4. GLOBAL AUTH GUARD (UI Pages Only)
  // If no cookie is found, force login. 
  // We don't check permissions here; the specific Page component will handle 
  // "Access Denied" if the user has a valid session but wrong role.
  if (!isLikelyAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackURL", path);
    return NextResponse.redirect(loginUrl);
  }

  // Allow request to proceed
  return NextResponse.next();
}

export const proxyConfig = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files — CSS, JS chunks)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Files with extensions (images, fonts, etc.)
     * - api routes (handled separately)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2|ttf|otf)).*)',
  ],
};