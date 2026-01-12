import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

const ADMIN_SECRET = process.env.ADMIN_SECRET;

export const dynamic = 'force-dynamic';

// GET /api/admin/audit-logs - View audit logs with filtering
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
        const action = searchParams.get('action');
        const source = searchParams.get('source');
        const leaseId = searchParams.get('leaseId');
        const limit = parseInt(searchParams.get('limit') || '100');
        const offset = parseInt(searchParams.get('offset') || '0');

        const where: any = {};
        if (action) where.action = action;
        if (source) where.source = source;
        if (leaseId) where.leaseId = leaseId;

        const [logs, total] = await Promise.all([
            prisma.auditLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip: offset
            }),
            prisma.auditLog.count({ where })
        ]);

        return NextResponse.json({
            logs,
            pagination: {
                total,
                limit,
                offset,
                hasMore: offset + limit < total
            }
        });

    } catch (error: any) {
        console.error('GET /api/admin/audit-logs error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch audit logs' },
            { status: 500 }
        );
    }
}
