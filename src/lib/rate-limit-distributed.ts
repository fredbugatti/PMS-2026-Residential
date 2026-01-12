// Distributed Rate Limiting using Vercel KV
// Replaces in-memory Map for serverless deployments

import { kv } from '@vercel/kv';

export interface RateLimitConfig {
    windowMs: number;      // Time window in milliseconds
    maxRequests: number;   // Max requests per window
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetIn: number;       // Milliseconds until reset
}

/**
 * Check rate limit using Vercel KV (distributed across instances)
 * Falls back to in-memory if KV is not available (local development)
 */
export async function checkDistributedRateLimit(
    namespace: string,
    identifier: string,
    config: RateLimitConfig
): Promise<RateLimitResult> {
    const key = `ratelimit:${namespace}:${identifier}`;
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
        // Try Vercel KV first (production on Vercel)
        if (process.env.KV_REST_API_URL) {
            // Get current count and timestamp
            const data = await kv.get<{ count: number; resetAt: number }>(key);

            if (!data || now > data.resetAt) {
                // Window expired or first request - reset
                await kv.set(key, { count: 1, resetAt: now + config.windowMs }, { px: config.windowMs });
                return {
                    allowed: true,
                    remaining: config.maxRequests - 1,
                    resetIn: config.windowMs
                };
            }

            if (data.count >= config.maxRequests) {
                // Rate limit exceeded
                return {
                    allowed: false,
                    remaining: 0,
                    resetIn: data.resetAt - now
                };
            }

            // Increment count
            await kv.set(key, { count: data.count + 1, resetAt: data.resetAt }, { px: data.resetAt - now });

            return {
                allowed: true,
                remaining: config.maxRequests - data.count - 1,
                resetIn: data.resetAt - now
            };
        }
    } catch (error) {
        console.error('[RateLimit] KV error, falling back to in-memory:', error);
    }

    // Fallback to in-memory for local development
    return checkInMemoryRateLimit(namespace, identifier, config);
}

// In-memory fallback for local development
const inMemoryStore = new Map<string, { count: number; resetAt: number }>();

function checkInMemoryRateLimit(
    namespace: string,
    identifier: string,
    config: RateLimitConfig
): RateLimitResult {
    const key = `${namespace}:${identifier}`;
    const now = Date.now();
    const data = inMemoryStore.get(key);

    if (!data || now > data.resetAt) {
        inMemoryStore.set(key, { count: 1, resetAt: now + config.windowMs });
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetIn: config.windowMs
        };
    }

    if (data.count >= config.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetIn: data.resetAt - now
        };
    }

    data.count++;
    return {
        allowed: true,
        remaining: config.maxRequests - data.count,
        resetIn: data.resetAt - now
    };
}

/**
 * Clean up expired in-memory entries (called periodically)
 */
export function cleanupInMemoryRateLimits() {
    const now = Date.now();
    for (const [key, data] of inMemoryStore.entries()) {
        if (now > data.resetAt) {
            inMemoryStore.delete(key);
        }
    }
}

// Clean up every 5 minutes
if (typeof setInterval !== 'undefined') {
    setInterval(cleanupInMemoryRateLimits, 5 * 60 * 1000);
}
