import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/cron/logs - Fetch cron execution logs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const jobName = searchParams.get('jobName');

    const logs = await prisma.cronLog.findMany({
      where: jobName ? { jobName } : undefined,
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return NextResponse.json({
      logs: logs.map(log => ({
        id: log.id,
        createdAt: log.createdAt,
        jobName: log.jobName,
        status: log.status,
        chargesPosted: log.chargesPosted,
        chargesSkipped: log.chargesSkipped,
        chargesErrored: log.chargesErrored,
        totalAmount: log.totalAmount ? Number(log.totalAmount) : 0,
        duration: log.duration,
        errorMessage: log.errorMessage,
        details: log.details
      }))
    });

  } catch (error: any) {
    console.error('GET /api/cron/logs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch cron logs' },
      { status: 500 }
    );
  }
}
