import { NextRequest, NextResponse } from 'next/server';
import { prisma, withLedgerTransaction } from '@/lib/accounting';
import { withQStashVerification } from '@/lib/qstash';

// Force dynamic rendering since we use request.headers
export const dynamic = 'force-dynamic';

// CRON_SECRET for internal calls (e.g., from daily-charges to daily-expenses)
const CRON_SECRET = process.env.CRON_SECRET;

// Core handler logic (wrapped with QStash verification)
async function handleDailyCharges(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Format month name for descriptions (e.g., "January 2025")
    const monthName = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Get active scheduled charges that are due today or earlier this month
    // Also filter by lease start date - only include leases that have started
    // IMPORTANT: startDate must be explicitly set and in the past (not null)
    const scheduledCharges = await prisma.scheduledCharge.findMany({
      where: {
        active: true,
        chargeDay: { lte: currentDay },
        lease: {
          status: 'ACTIVE',
          // Require startDate to be set AND in the past
          // This prevents charging leases with null startDate
          startDate: {
            not: null,
            lte: today
          }
        }
      },
      include: {
        lease: {
          select: {
            id: true,
            tenantName: true,
            unitName: true,
            propertyName: true,
            startDate: true
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

    // Also trigger daily-expenses
    let expensesResult = null;
    try {
      const baseUrl = process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : process.env.NEXTAUTH_URL || 'http://localhost:3000';

      const expensesResponse = await fetch(`${baseUrl}/api/cron/daily-expenses`, {
        method: 'GET',
        headers: CRON_SECRET ? { 'Authorization': `Bearer ${CRON_SECRET}` } : {},
      });
      expensesResult = await expensesResponse.json();
      console.log('[CRON] daily-expenses triggered:', expensesResult?.summary || expensesResult);
    } catch (expError: any) {
      console.error('[CRON] Failed to trigger daily-expenses:', expError.message);
    }

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
      results,
      expensesResult
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

// GET /api/cron/daily-charges - Called by QStash daily at 6 AM
export const GET = withQStashVerification(handleDailyCharges);

// POST /api/cron/daily-charges - QStash sends POST by default
export const POST = withQStashVerification(handleDailyCharges);
