import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import crypto from 'crypto';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

// POST /api/tenant/[token]/refresh - Refresh portal token
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ token: string }> }
) {
    // CRITICAL: Verify admin secret in production
    if (process.env.NODE_ENV === 'production') {
        if (!ADMIN_SECRET) {
            console.error('[ADMIN] FATAL: ADMIN_SECRET must be set in production');
            return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
        }

        const authHeader = request.headers.get('authorization');
        if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        const { token } = await params;
        const body = await request.json().catch(() => ({}));
        const { expiryDays = 90 } = body; // Default 90 days

        // Find lease by current token
        const lease = await prisma.lease.findUnique({
            where: { portalToken: token }
        });

        if (!lease) {
            return NextResponse.json(
                { error: 'Invalid token' },
                { status: 404 }
            );
        }

        // Generate new token
        const newToken = crypto.randomBytes(32).toString('hex');
        const newExpiry = new Date();
        newExpiry.setDate(newExpiry.getDate() + expiryDays);

        // Update lease with new token
        const updatedLease = await prisma.lease.update({
            where: { id: lease.id },
            data: {
                portalToken: newToken,
                portalTokenExpiresAt: newExpiry
            }
        });

        // Audit log
        import('./../../../../../lib/audit').then(({ logAudit }) => {
            logAudit({
                source: 'admin',
                action: 'token_refreshed',
                entityType: 'lease',
                entityId: lease.id,
                leaseId: lease.id,
                description: `Portal token refreshed, expires ${newExpiry.toISOString()}`,
                request,
                metadata: { oldToken: token.substring(0, 8) + '...', newToken: newToken.substring(0, 8) + '...' }
            });
        }).catch(err => console.error('[Audit] Failed:', err.message));

        return NextResponse.json({
            success: true,
            newToken,
            expiresAt: newExpiry.toISOString(),
            leaseId: lease.id,
            tenantName: lease.tenantName
        });

    } catch (error: any) {
        console.error('POST /api/tenant/[token]/refresh error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to refresh token' },
            { status: 500 }
        );
    }
}
