import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export const dynamic = 'force-dynamic';

// GET /api/admin/webhooks/route.ts - List all webhook events with filtering
export async function GET(request: NextRequest) {
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
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status'); // 'failed', 'processed', 'pending'
        const limit = parseInt(searchParams.get('limit') || '50');

        const where: any = {};
        if (status === 'failed') {
            where.status = 'failed';
        } else if (status === 'processed') {
            where.processed = true;
        } else if (status === 'pending') {
            where.processed = false;
            where.status = { not: 'failed' };
        }

        const webhooks = await prisma.webhookEvent.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                stripeEventId: true,
                eventType: true,
                status: true,
                processed: true,
                processedAt: true,
                createdAt: true,
                leaseId: true,
                paymentIntentId: true,
                amount: true,
                errorMessage: true
            }
        });

        const stats = {
            total: await prisma.webhookEvent.count(),
            failed: await prisma.webhookEvent.count({ where: { status: 'failed' } }),
            processed: await prisma.webhookEvent.count({ where: { processed: true } }),
            pending: await prisma.webhookEvent.count({
                where: { processed: false, status: { not: 'failed' } }
            })
        };

        return NextResponse.json({
            webhooks,
            stats,
            showing: webhooks.length
        });

    } catch (error: any) {
        console.error('GET /api/admin/webhooks error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch webhooks' },
            { status: 500 }
        );
    }
}
