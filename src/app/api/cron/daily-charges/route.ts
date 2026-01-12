import { NextRequest, NextResponse } from 'next/server';
import { prisma, withLedgerTransaction } from '@/lib/accounting';

// Force dynamic rendering since we use request.headers
export const dynamic = 'force-dynamic';

// Vercel Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

// GET /api/cron/daily-charges - Called by Vercel Cron daily at 6 AM
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // CRITICAL: Verify cron secret in production (fail-closed)
    if (process.env.NODE_ENV === 'production') {
      if (!CRON_SECRET) {
        console.error('[CRON] FATAL: CRON_SECRET must be set in production');
        return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
      }

      const authHeader = request.headers.get('authorization');
      if (authHeader !== `Bearer ${CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Format month name for descriptions (e.g., "January 2025")
    const monthName = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Get active scheduled charges that are due today or earlier this month
    const scheduledCharges = await prisma.scheduledCharge.findMany({
      where: {
        active: true,
        chargeDay: { lte: currentDay },
        lease: {
          status: 'ACTIVE'
        }
      },
      include: {
        lease: {
          select: {
            id: true,
            tenantName: true,
            unitName: true,
            propertyName: true
          }
        }
      }
    });

    const results: Array<{
      chargeId: string;
      leaseId: string;
      tenantName: string;
      description: string;
      amount: number;
      status: 'posted' | 'skipped' | 'error';
      message: string;
    }> = [];

    let totalAmountPosted = 0;

    for (const charge of scheduledCharges) {
      // Check if already charged this month
      if (charge.lastChargedDate) {
        const lastCharged = new Date(charge.lastChargedDate);
        if (
          lastCharged.getMonth() === currentMonth &&
          lastCharged.getFullYear() === currentYear
        ) {
          results.push({
            chargeId: charge.id,
            leaseId: charge.leaseId,
            tenantName: charge.lease.tenantName,
            description: charge.description,
            amount: Number(charge.amount),
            status: 'skipped',
            message: 'Already charged this month'
          });
          continue;
        }
      }

      try {
        // Create description with month (e.g., "Rent - January 2025")
        const entryDescription = `${charge.description} - ${monthName}`;
        const chargeAmount = Number(charge.amount);

        // Post both entries AND update lastChargedDate in a single transaction
        // If any part fails, everything rolls back - books stay balanced
        await withLedgerTransaction(async (tx, postEntry) => {
          // Post entry 1: DR Accounts Receivable (increase what tenant owes)
          await postEntry({
            accountCode: '1200',
            amount: chargeAmount,
            debitCredit: 'DR',
            description: entryDescription,
            entryDate: today,
            leaseId: charge.leaseId,
            postedBy: 'cron-daily'
          });

          // Post entry 2: CR Income (record revenue)
          await postEntry({
            accountCode: charge.accountCode,
            amount: chargeAmount,
            debitCredit: 'CR',
            description: entryDescription,
            entryDate: today,
            leaseId: charge.leaseId,
            postedBy: 'cron-daily'
          });

          // Update last charged date (within same transaction)
          await tx.scheduledCharge.update({
            where: { id: charge.id },
            data: { lastChargedDate: today }
          });
        });

        totalAmountPosted += chargeAmount;

        results.push({
          chargeId: charge.id,
          leaseId: charge.leaseId,
          tenantName: charge.lease.tenantName,
          description: charge.description,
          amount: chargeAmount,
          status: 'posted',
          message: `Posted ${charge.description} of $${chargeAmount.toFixed(2)}`
        });

      } catch (error: any) {
        // Check if it's a duplicate (idempotency key conflict)
        if (error.code === 'P2002') {
          results.push({
            chargeId: charge.id,
            leaseId: charge.leaseId,
            tenantName: charge.lease.tenantName,
            description: charge.description,
            amount: Number(charge.amount),
            status: 'skipped',
            message: 'Already posted (duplicate prevented)'
          });
        } else {
          results.push({
            chargeId: charge.id,
            leaseId: charge.leaseId,
            tenantName: charge.lease.tenantName,
            description: charge.description,
            amount: Number(charge.amount),
            status: 'error',
            message: error.message || 'Failed to post charge'
          });
        }
      }
    }

    const posted = results.filter(r => r.status === 'posted').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;
    const duration = Date.now() - startTime;

    // Determine overall status
    let status = 'SUCCESS';
    if (errors > 0 && posted === 0) {
      status = 'FAILED';
    } else if (errors > 0) {
      status = 'PARTIAL';
    }

    // Log the execution
    await prisma.cronLog.create({
      data: {
        jobName: 'daily-charges',
        status,
        chargesPosted: posted,
        chargesSkipped: skipped,
        chargesErrored: errors,
        totalAmount: totalAmountPosted,
        duration,
        errorMessage: errors > 0 ? results.filter(r => r.status === 'error').map(r => r.message).join('; ') : null,
        details: results as any
      }
    });

    console.log(`[CRON] daily-charges completed: ${posted} posted, ${skipped} skipped, ${errors} errors in ${duration}ms`);

    return NextResponse.json({
      success: true,
      status,
      summary: {
        total: results.length,
        posted,
        skipped,
        errors,
        totalAmountPosted,
        duration
      },
      results
    });

  } catch (error: any) {
    const duration = Date.now() - startTime;

    // Log the failure
    try {
      await prisma.cronLog.create({
        data: {
          jobName: 'daily-charges',
          status: 'FAILED',
          duration,
          errorMessage: error.message || 'Unknown error'
        }
      });
    } catch (logError) {
      console.error('[CRON] Failed to log error:', logError);
    }

    console.error('[CRON] daily-charges failed:', error);
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    );
  }
}
