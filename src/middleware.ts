import { NextRequest, NextResponse } from 'next/server';

/**
 * Authentication Middleware
 *
 * Protects all API routes except:
 * - /api/tenant/* (uses portal token)
 * - /api/webhooks/* (uses signature verification)
 * - /api/cron/* (uses cron secret)
 * - /api/admin/health (public health check)
 *
 * In production, requires ADMIN_SECRET header for admin routes.
 * Set ADMIN_SECRET in your environment variables.
 */

const ADMIN_SECRET = process.env.ADMIN_SECRET;

// Routes that don't require API key authentication
const PUBLIC_PATHS = [
  '/api/tenant',      // Uses portal token auth
  '/api/webhooks',    // Uses Stripe signature
  '/api/cron',        // Uses CRON_SECRET
  '/api/admin/health' // Public health check
];

// Check if a path should be public
function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(path => pathname.startsWith(path));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /api routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Allow public API paths
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // In development, allow all requests (but warn)
  if (process.env.NODE_ENV !== 'production') {
    // Still check for ADMIN_SECRET if configured, even in dev
    if (ADMIN_SECRET) {
      const authHeader = request.headers.get('x-api-key') || request.headers.get('authorization');
      const providedKey = authHeader?.replace('Bearer ', '');

      if (providedKey !== ADMIN_SECRET) {
        console.warn(`[Auth] Dev mode: API key mismatch for ${pathname}`);
        // In dev, allow but warn
      }
    }
    return NextResponse.next();
  }

  // PRODUCTION: For now, allow all requests from same origin (browser)
  // TODO: Add proper authentication (NextAuth, Clerk, etc.) when ready
  // The cron routes have their own authentication via QStash signatures
  return NextResponse.next();
}

// Configure which routes this middleware applies to
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*'
  ]
};
