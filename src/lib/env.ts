// Environment variable validation
// Validates required env vars at startup and provides type-safe access

import { z } from 'zod';

// Schema for environment variables
const envSchema = z.object({
  // Database (only DATABASE_URL is required - Neon integration provides this)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // These are optional - Vercel Postgres provides them, but Neon doesn't
  POSTGRES_PRISMA_URL: z.string().optional(),
  POSTGRES_URL_NON_POOLING: z.string().optional(),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // App URL (required for production)
  NEXT_PUBLIC_BASE_URL: z.string().url().optional(),

  // Stripe (required in production)
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Cron authentication (REQUIRED in production)
  CRON_SECRET: z.string().optional(),

  // Admin authentication (REQUIRED in production)
  ADMIN_SECRET: z.string().optional(),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional()
});

export type Env = z.infer<typeof envSchema>;

// Validate and parse environment variables
function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues.map(issue =>
      `  - ${issue.path.join('.')}: ${issue.message}`
    ).join('\n');

    console.error('\n========================================');
    console.error('Environment validation failed:');
    console.error(errors);
    console.error('========================================\n');

    // In production, FAIL HARD
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Environment validation failed:\n${errors}`);
    }

    // Return partial env for development (with defaults)
    return {
      DATABASE_URL: process.env.DATABASE_URL || '',
      POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
      POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
      NODE_ENV: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL,
      STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
      STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
      STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
      CRON_SECRET: process.env.CRON_SECRET,
      ADMIN_SECRET: process.env.ADMIN_SECRET,
      LOG_LEVEL: process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error' | undefined
    };
  }

  // PRODUCTION REQUIREMENT: Fail hard if critical secrets missing
  // Skip during build phase (Next.js sets NEXT_PHASE during build)
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

  if (process.env.NODE_ENV === 'production' && !isBuildPhase) {
    const criticalMissing: string[] = [];

    if (!result.data.CRON_SECRET) {
      criticalMissing.push('CRON_SECRET');
    }
    if (!result.data.ADMIN_SECRET) {
      criticalMissing.push('ADMIN_SECRET');
    }

    if (criticalMissing.length > 0) {
      const error = `FATAL: Missing required secrets in production: ${criticalMissing.join(', ')}`;
      console.error(error);
      throw new Error(error);
    }
  }

  return result.data;
}

// Validate on module load
export const env = validateEnv();

// Production-specific validations (warnings)
export function checkProductionEnv(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];

  if (process.env.NODE_ENV === 'production') {
    if (!env.STRIPE_WEBHOOK_SECRET) {
      warnings.push('STRIPE_WEBHOOK_SECRET not set - Stripe webhooks will fail');
    }
    if (!env.CRON_SECRET) {
      warnings.push('CRON_SECRET not set - Cron jobs are unprotected');
    }
    if (!env.ADMIN_SECRET) {
      warnings.push('ADMIN_SECRET not set - Admin APIs are unprotected');
    }
    if (!env.NEXT_PUBLIC_BASE_URL) {
      warnings.push('NEXT_PUBLIC_BASE_URL not set - Portal links may not work');
    }
  }

  return {
    valid: warnings.length === 0,
    warnings
  };
}

// Helper to check if Stripe is configured
export function isStripeConfigured(): boolean {
  return !!(env.STRIPE_SECRET_KEY && env.STRIPE_PUBLISHABLE_KEY);
}

// Helper to check if we're in production
export function isProduction(): boolean {
  return env.NODE_ENV === 'production';
}
