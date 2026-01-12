import { Receiver } from '@upstash/qstash';
import { NextRequest, NextResponse } from 'next/server';

/**
 * QStash Cron Verification
 *
 * Verifies that incoming requests are from QStash using signature verification.
 * Falls back to CRON_SECRET for backward compatibility and local testing.
 *
 * Required env vars for QStash:
 * - QSTASH_CURRENT_SIGNING_KEY: Get from Upstash QStash dashboard
 * - QSTASH_NEXT_SIGNING_KEY: Get from Upstash QStash dashboard (for key rotation)
 *
 * Optional:
 * - CRON_SECRET: Fallback for local testing or non-QStash triggers
 */

const receiver = new Receiver({
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY || '',
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY || '',
});

export type CronHandler = (request: NextRequest) => Promise<NextResponse>;

/**
 * Wraps a cron handler with QStash signature verification.
 *
 * In production: Requires valid QStash signature OR CRON_SECRET
 * In development: Allows all requests (with warning if no auth)
 */
export function withQStashVerification(handler: CronHandler): CronHandler {
  return async (request: NextRequest) => {
    const CRON_SECRET = process.env.CRON_SECRET;

    // Check for QStash signature
    const signature = request.headers.get('upstash-signature');

    // Check for CRON_SECRET (fallback)
    const authHeader = request.headers.get('authorization');
    const hasCronSecret = authHeader === `Bearer ${CRON_SECRET}`;

    // Development mode: allow with warning
    if (process.env.NODE_ENV !== 'production') {
      if (!signature && !hasCronSecret) {
        console.warn('[CRON] Dev mode: No QStash signature or CRON_SECRET provided');
      }
      return handler(request);
    }

    // Production: require either QStash signature or CRON_SECRET

    // Try QStash signature first
    if (signature) {
      try {
        const body = await request.text();
        const isValid = await receiver.verify({
          signature,
          body,
          url: request.url,
        });

        if (isValid) {
          // Recreate request with body for handler
          const newRequest = new NextRequest(request.url, {
            method: request.method,
            headers: request.headers,
            body: body,
          });
          return handler(newRequest);
        }
      } catch (error: any) {
        console.error('[CRON] QStash signature verification failed:', error.message);
      }
    }

    // Fall back to CRON_SECRET
    if (CRON_SECRET && hasCronSecret) {
      return handler(request);
    }

    // No valid authentication
    if (!CRON_SECRET && !process.env.QSTASH_CURRENT_SIGNING_KEY) {
      console.error('[CRON] FATAL: Neither QSTASH_CURRENT_SIGNING_KEY nor CRON_SECRET is set');
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  };
}
