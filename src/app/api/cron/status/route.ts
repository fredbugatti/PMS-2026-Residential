import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/cron/status - Check if daily charges cron ran successfully today
export async function GET(request: NextRequest) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's cron execution for daily-charges
    const todaysCronRun = await prisma.cronLog.findFirst({
      where: {
        jobName: 'daily-charges',
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get pending charges count (charges due today that haven't been posted)
    const currentDay = new Date().getDate();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const pendingCharges = await prisma.scheduledCharge.findMany({
      where: {
        active: true,
        chargeDay: { lte: currentDay },
        lease: {
          status: 'ACTIVE'
        },
        OR: [
          { lastChargedDate: null },
          {
            lastChargedDate: {
              lt: new Date(currentYear, currentMonth, 1)
            }
          }
        ]
      },
      select: {
        id: true,
        amount: true
      }
    });

    const pendingCount = pendingCharges.length;
    const pendingAmount = pendingCharges.reduce((sum, c) => sum + Number(c.amount), 0);

    // Determine if there's an issue
    const currentHour = new Date().getHours();
    const cronShouldHaveRun = currentHour >= 6; // Cron runs at 6 AM

    let status: 'ok' | 'warning' | 'pending' = 'ok';
    let message = '';

    if (cronShouldHaveRun && !todaysCronRun && pendingCount > 0) {
      status = 'warning';
      message = `Cron hasn't run today. ${pendingCount} charges ($${pendingAmount.toFixed(2)}) pending.`;
    } else if (todaysCronRun?.status === 'FAILED') {
      status = 'warning';
      message = `Cron failed: ${todaysCronRun.errorMessage || 'Unknown error'}`;
    } else if (todaysCronRun?.status === 'PARTIAL') {
      status = 'warning';
      message = `Cron had errors: ${todaysCronRun.chargesErrored} charges failed to post.`;
    } else if (pendingCount > 0 && !cronShouldHaveRun) {
      status = 'pending';
      message = `${pendingCount} charges scheduled. Cron runs at 6 AM.`;
    } else if (todaysCronRun?.status === 'SUCCESS') {
      message = `Cron ran successfully at ${todaysCronRun.createdAt.toLocaleTimeString()}. Posted ${todaysCronRun.chargesPosted} charges.`;
    } else if (pendingCount === 0) {
      message = 'No charges due today.';
    }

    return NextResponse.json({
      status,
      message,
      cronRanToday: !!todaysCronRun,
      lastRun: todaysCronRun ? {
        time: todaysCronRun.createdAt,
        status: todaysCronRun.status,
        posted: todaysCronRun.chargesPosted,
        skipped: todaysCronRun.chargesSkipped,
        errors: todaysCronRun.chargesErrored,
        amount: todaysCronRun.totalAmount ? Number(todaysCronRun.totalAmount) : 0
      } : null,
      pendingCharges: {
        count: pendingCount,
        amount: pendingAmount
      }
    });

  } catch (error: any) {
    console.error('GET /api/cron/status error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check cron status' },
      { status: 500 }
    );
  }
}
