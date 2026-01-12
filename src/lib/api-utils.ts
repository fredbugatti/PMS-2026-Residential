import { NextRequest, NextResponse } from 'next/server';
import { ValidationError } from './validation';
import { Prisma } from '@prisma/client';

// Admin authentication secret
const ADMIN_SECRET = process.env.ADMIN_SECRET;

/**
 * Wrapper to require admin authentication on routes
 * Checks for ADMIN_SECRET in Authorization header or x-api-key header
 *
 * In development without ADMIN_SECRET set, allows requests but logs a warning
 */
export function withAdminAuth<T extends (...args: any[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (request: NextRequest, ...args: any[]) => {
    // Check for ADMIN_SECRET in environment
    if (!ADMIN_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[Auth] CRITICAL: ADMIN_SECRET not configured in production');
        return NextResponse.json(
          { error: 'Server misconfiguration' },
          { status: 500 }
        );
      }
      // Development warning - allow request but log
      console.warn('[Auth] WARNING: ADMIN_SECRET not set. Allowing request in dev mode.');
      return handler(request, ...args);
    }

    // Check Authorization header (Bearer token)
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      if (token === ADMIN_SECRET) {
        return handler(request, ...args);
      }
    }

    // Check x-api-key header
    const apiKey = request.headers.get('x-api-key');
    if (apiKey === ADMIN_SECRET) {
      return handler(request, ...args);
    }

    // Unauthorized
    console.warn('[Auth] Unauthorized admin access attempt');
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }) as T;
}

// Standard API error response structure
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

// Standard API success response structure
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data?: T;
  message?: string;
}

// Error codes for consistent error handling
export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE: 'DUPLICATE',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST'
} as const;

// Map error types to HTTP status codes
const errorStatusMap: Record<string, number> = {
  [ErrorCodes.VALIDATION_ERROR]: 400,
  [ErrorCodes.BAD_REQUEST]: 400,
  [ErrorCodes.UNAUTHORIZED]: 401,
  [ErrorCodes.FORBIDDEN]: 403,
  [ErrorCodes.NOT_FOUND]: 404,
  [ErrorCodes.DUPLICATE]: 409,
  [ErrorCodes.RATE_LIMITED]: 429,
  [ErrorCodes.INTERNAL_ERROR]: 500
};

// Handle errors consistently across all API routes
export function handleApiError(error: unknown, context?: string): NextResponse<ApiErrorResponse> {
  const prefix = context ? `[${context}] ` : '';

  // Validation errors
  if (error instanceof ValidationError) {
    console.warn(`${prefix}Validation error:`, error.message);
    return NextResponse.json(
      { error: error.message, code: ErrorCodes.VALIDATION_ERROR, details: error.errors },
      { status: 400 }
    );
  }

  // Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    console.error(`${prefix}Prisma error [${error.code}]:`, error.message);

    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return NextResponse.json(
          { error: 'This record already exists', code: ErrorCodes.DUPLICATE },
          { status: 409 }
        );
      case 'P2025': // Record not found
        return NextResponse.json(
          { error: 'Record not found', code: ErrorCodes.NOT_FOUND },
          { status: 404 }
        );
      case 'P2003': // Foreign key constraint failed
        return NextResponse.json(
          { error: 'Referenced record does not exist', code: ErrorCodes.BAD_REQUEST },
          { status: 400 }
        );
      default:
        return NextResponse.json(
          { error: 'Database error', code: ErrorCodes.INTERNAL_ERROR },
          { status: 500 }
        );
    }
  }

  // Generic errors
  if (error instanceof Error) {
    console.error(`${prefix}Error:`, error.message, error.stack);

    // Check for specific error messages
    if (error.message.includes('not found') || error.message.includes('Not found')) {
      return NextResponse.json(
        { error: error.message, code: ErrorCodes.NOT_FOUND },
        { status: 404 }
      );
    }

    if (error.message.includes('unauthorized') || error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message, code: ErrorCodes.UNAUTHORIZED },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred', code: ErrorCodes.INTERNAL_ERROR },
      { status: 500 }
    );
  }

  // Unknown error type
  console.error(`${prefix}Unknown error:`, error);
  return NextResponse.json(
    { error: 'An unexpected error occurred', code: ErrorCodes.INTERNAL_ERROR },
    { status: 500 }
  );
}

// Success response helper
export function apiSuccess<T>(data?: T, message?: string, status: number = 200): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ success: true, data, message }, { status });
}

// Created response helper (201)
export function apiCreated<T>(data?: T, message?: string): NextResponse<ApiSuccessResponse<T>> {
  return apiSuccess(data, message, 201);
}

// Simple in-memory rate limiting
// Note: For multi-instance deployments, use Redis or similar
const rateLimiters = new Map<string, Map<string, { count: number; resetTime: number }>>();

interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  maxRequests: number;  // Max requests per window
}

const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 60 * 1000,  // 1 minute
  maxRequests: 60  // 60 requests per minute
};

export function checkRateLimit(
  routeName: string,
  identifier: string,
  config: RateLimitConfig = defaultRateLimitConfig
): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();

  // Get or create rate limiter for this route
  if (!rateLimiters.has(routeName)) {
    rateLimiters.set(routeName, new Map());
  }
  const routeLimiter = rateLimiters.get(routeName)!;

  // Get or create record for this identifier
  const record = routeLimiter.get(identifier);

  if (!record || now > record.resetTime) {
    routeLimiter.set(identifier, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetIn: config.windowMs };
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return { allowed: true, remaining: config.maxRequests - record.count, resetIn: record.resetTime - now };
}

// Rate limit response helper
export function rateLimitResponse(resetIn: number): NextResponse<ApiErrorResponse> {
  const retryAfter = Math.ceil(resetIn / 1000);
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.', code: ErrorCodes.RATE_LIMITED },
    {
      status: 429,
      headers: {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': '0'
      }
    }
  );
}

// Get client identifier for rate limiting (IP address or fallback)
export function getClientIdentifier(request: Request): string {
  // Try various headers for client IP
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a default (not ideal but prevents crashes)
  return 'unknown-client';
}

// Clean up old rate limit entries periodically (call this occasionally)
export function cleanupRateLimiters(): void {
  const now = Date.now();
  for (const [routeName, routeLimiter] of rateLimiters) {
    for (const [identifier, record] of routeLimiter) {
      if (now > record.resetTime) {
        routeLimiter.delete(identifier);
      }
    }
    if (routeLimiter.size === 0) {
      rateLimiters.delete(routeName);
    }
  }
}
