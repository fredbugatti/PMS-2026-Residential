import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// Simple in-memory rate limiting for tenant portal
// Note: In a multi-instance deployment, use Redis or similar
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 60; // 60 requests per minute per token

// IP-based rate limiting for failed token attempts
const failedAttemptMap = new Map<string, { count: number; resetTime: number }>();
const FAILED_ATTEMPT_WINDOW = 15 * 60 * 1000; // 15 minutes
const FAILED_ATTEMPT_MAX = 10; // 10 failed attempts per 15 minutes per IP

function checkRateLimit(token: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const record = rateLimitMap.get(token);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(token, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (record.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  record.count++;
  return { allowed: true, remaining: RATE_LIMIT_MAX - record.count };
}

// GET /api/tenant/[token] - Get tenant portal data
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Check rate limit before any database queries
    const rateLimit = checkRateLimit(token);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'Retry-After': '60',
            'X-RateLimit-Remaining': '0'
          }
        }
      );
    }

    // Get client IP for security logging
    const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown';

    // Find lease by portal token
    const lease = await prisma.lease.findUnique({
      where: { portalToken: token },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            zipCode: true
          }
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
            dockDoors: true,
            clearHeight: true
          }
        },
        scheduledCharges: {
          where: { accountCode: '4000', active: true }
        },
        workOrders: {
          where: {
            status: {
              in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            priority: true,
            status: true,
            createdAt: true,
            scheduledDate: true,
            completedDate: true,
            photos: true
          }
        },
        ledgerEntries: {
          where: { status: 'POSTED' },
          include: {
            account: {
              select: {
                code: true,
                name: true,
                type: true
              }
            }
          },
          orderBy: [
            { entryDate: 'desc' },
            { createdAt: 'desc' }
          ]
        },
        documents: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    if (!lease) {
      // Track failed attempt by IP
      const now = Date.now();
      const failedRecord = failedAttemptMap.get(clientIP);

      if (!failedRecord || now > failedRecord.resetTime) {
        failedAttemptMap.set(clientIP, { count: 1, resetTime: now + FAILED_ATTEMPT_WINDOW });
      } else {
        failedRecord.count++;
        if (failedRecord.count >= FAILED_ATTEMPT_MAX) {
          return NextResponse.json(
            { error: 'Too many failed attempts. Please try again in 15 minutes.' },
            { status: 429 }
          );
        }
      }

      return NextResponse.json(
        { error: 'Invalid or expired portal link' },
        { status: 404 }
      );
    }

    // Check token expiry
    if (lease.portalTokenExpiresAt && new Date() > lease.portalTokenExpiresAt) {
      return NextResponse.json(
        {
          error: 'Portal link has expired',
          message: 'Please contact your property manager for a new link'
        },
        { status: 403 }
      );
    }

    // Check if lease is active
    if (lease.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'This lease is no longer active' },
        { status: 403 }
      );
    }

    // Audit log successful token access (non-blocking)
    import('./../../../../lib/audit').then(({ logAudit }) => {
      logAudit({
        source: 'tenant_portal',
        action: 'portal_access',
        entityType: 'lease',
        entityId: lease.id,
        leaseId: lease.id,
        description: `Tenant portal accessed`,
        request,
        metadata: { token: token.substring(0, 8) + '...', userAgent: request.headers.get('user-agent') }
      });
    }).catch(err => console.error('[Audit] Failed:', err.message));

    // Update last access time
    await prisma.lease.update({
      where: { id: lease.id },
      data: { portalLastAccess: new Date() }
    });

    // Calculate balance from AR account (1200)
    let balance = 0;
    for (const entry of lease.ledgerEntries) {
      if (entry.accountCode === '1200') { // AR account
        const amount = Number(entry.amount);
        balance += entry.debitCredit === 'DR' ? amount : -amount;
      }
    }

    // Get rent from scheduled charge
    const rentCharge = lease.scheduledCharges[0];
    const monthlyRentAmount = rentCharge ? Number(rentCharge.amount) : null;

    // Return tenant portal data
    return NextResponse.json({
      lease: {
        id: lease.id,
        tenantName: lease.tenantName,
        tenantEmail: lease.tenantEmail,
        tenantPhone: lease.tenantPhone,
        startDate: lease.startDate,
        endDate: lease.endDate,
        monthlyRentAmount,
        securityDepositAmount: lease.securityDepositAmount,
        status: lease.status,
        chargeDay: lease.chargeDay
      },
      property: lease.property,
      unit: lease.unit,
      workOrders: lease.workOrders,
      balance: balance,
      ledgerEntries: lease.ledgerEntries,
      documents: lease.documents,
      autopay: {
        enabled: lease.autopayEnabled,
        day: lease.autopayDay,
        method: lease.autopayMethod,
        last4: lease.autopayLast4
      }
    });

  } catch (error: any) {
    console.error('GET /api/tenant/[token] error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load portal data' },
      { status: 500 }
    );
  }
}
