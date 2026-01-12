import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/notifications/logs - Get email logs with pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const leaseId = searchParams.get('leaseId');
    const templateType = searchParams.get('templateType');
    const status = searchParams.get('status');

    const where: any = {};

    if (leaseId) {
      where.leaseId = leaseId;
    }

    if (templateType) {
      where.templateType = templateType;
    }

    if (status) {
      where.status = status;
    }

    const [logs, total] = await Promise.all([
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset
      }),
      prisma.emailLog.count({ where })
    ]);

    return NextResponse.json({
      logs,
      total,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('GET /api/notifications/logs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get email logs' },
      { status: 500 }
    );
  }
}
