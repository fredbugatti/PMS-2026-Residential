import { NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { checkProductionEnv, isStripeConfigured } from '@/lib/env';

export const dynamic = 'force-dynamic';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  checks: {
    database: { status: 'ok' | 'error'; latencyMs?: number; error?: string };
    stripe: { status: 'ok' | 'not_configured' | 'error'; error?: string };
    environment: { status: 'ok' | 'warnings'; warnings?: string[] };
  };
}

const startTime = Date.now();

// GET /api/health - Health check endpoint for load balancers and monitoring
export async function GET() {
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    checks: {
      database: { status: 'ok' },
      stripe: { status: 'ok' },
      environment: { status: 'ok' }
    }
  };

  // Check database connectivity
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.checks.database.latencyMs = Date.now() - dbStart;
  } catch (error: any) {
    health.checks.database = {
      status: 'error',
      error: error.message || 'Database connection failed'
    };
    health.status = 'unhealthy';
  }

  // Check Stripe configuration
  if (!isStripeConfigured()) {
    health.checks.stripe = { status: 'not_configured' };
    // Not having Stripe is degraded, not unhealthy
    if (health.status === 'healthy') {
      health.status = 'degraded';
    }
  }

  // Check environment configuration
  const envCheck = checkProductionEnv();
  if (!envCheck.valid) {
    health.checks.environment = {
      status: 'warnings',
      warnings: envCheck.warnings
    };
    if (health.status === 'healthy') {
      health.status = 'degraded';
    }
  }

  // Return appropriate status code
  const statusCode = health.status === 'unhealthy' ? 503 : 200;

  return NextResponse.json(health, { status: statusCode });
}

// HEAD /api/health - Simple health check (just returns 200 or 503)
export async function HEAD() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new NextResponse(null, { status: 200 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
