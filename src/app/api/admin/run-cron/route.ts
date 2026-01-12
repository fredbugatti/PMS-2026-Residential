import { NextRequest, NextResponse } from 'next/server';
import { prisma, withLedgerTransaction } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// POST /api/admin/run-cron - Manually run cron jobs from admin panel
// This is a simplified version of the cron job that doesn't require QStash verification
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const { job } = await request.json().catch(() => ({ job: 'daily-charges' }));

  if (job === 'daily-charges') {
    return runDailyCharges(startTime);
  } else if (job === 'daily-expenses') {
    return runDailyExpenses(startTime);
  } else if (job === 'notifications') {
    return runNotifications(startTime);
  }

  return NextResponse.json({ error: 'Unknown job type' }, { status: 400 });
}

// GET also works for backwards compatibility
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const job = searchParams.get('job') || 'daily-charges';

  if (job === 'daily-charges') {
    return runDailyCharges(startTime);
  } else if (job === 'daily-expenses') {
    return runDailyExpenses(startTime);
  } else if (job === 'notifications') {
    return runNotifications(startTime);
  }

  return NextResponse.json({ error: 'Unknown job type' }, { status: 400 });
}

async function runDailyCharges(startTime: number): Promise<NextResponse> {
  try {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const monthName = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Get active scheduled charges that are due today or earlier this month
    const scheduledCharges = await prisma.scheduledCharge.findMany({
      where: {
        active: true,
        chargeDay: { lte: currentDay },
        lease: {
          status: 'ACTIVE',
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
        const entryDescription = `${charge.description} - ${monthName}`;
        const chargeAmount = Number(charge.amount);

        await withLedgerTransaction(async (tx, postEntry) => {
          // DR Accounts Receivable
          await postEntry({
            accountCode: '1200',
            amount: chargeAmount,
            debitCredit: 'DR',
            description: entryDescription,
            entryDate: today,
            leaseId: charge.leaseId,
            postedBy: 'admin-manual'
          });

          // CR Income
          await postEntry({
            accountCode: charge.accountCode,
            amount: chargeAmount,
            debitCredit: 'CR',
            description: entryDescription,
            entryDate: today,
            leaseId: charge.leaseId,
            postedBy: 'admin-manual'
          });

          // Update last charged date
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
        details: { ...results, source: 'admin-manual' } as any
      }
    });

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
    console.error('[ADMIN] daily-charges failed:', error);
    return NextResponse.json(
      { error: error.message || 'Cron job failed' },
      { status: 500 }
    );
  }
}

async function runDailyExpenses(startTime: number): Promise<NextResponse> {
  try {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const monthName = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Get active scheduled expenses that are due
    const scheduledExpenses = await prisma.scheduledExpense.findMany({
      where: {
        active: true,
        chargeDay: { lte: currentDay }
      },
      include: {
        property: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const results: Array<{
      expenseId: string;
      propertyId: string | null;
      propertyName: string | null;
      description: string;
      amount: number;
      status: 'posted' | 'skipped' | 'error';
      message: string;
    }> = [];

    let totalAmountPosted = 0;

    for (const expense of scheduledExpenses) {
      // Check if already posted this month
      if (expense.lastPostedDate) {
        const lastCharged = new Date(expense.lastPostedDate);
        if (
          lastCharged.getMonth() === currentMonth &&
          lastCharged.getFullYear() === currentYear
        ) {
          results.push({
            expenseId: expense.id,
            propertyId: expense.propertyId,
            propertyName: expense.property?.name || null,
            description: expense.description,
            amount: Number(expense.amount),
            status: 'skipped',
            message: 'Already posted this month'
          });
          continue;
        }
      }

      try {
        const entryDescription = `${expense.description} - ${monthName}`;
        const expenseAmount = Number(expense.amount);

        await withLedgerTransaction(async (tx, postEntry) => {
          // DR Expense account
          await postEntry({
            accountCode: expense.accountCode,
            amount: expenseAmount,
            debitCredit: 'DR',
            description: entryDescription,
            entryDate: today,
            postedBy: 'admin-manual'
          });

          // CR Accounts Payable or Cash
          await postEntry({
            accountCode: '2000', // Accounts Payable
            amount: expenseAmount,
            debitCredit: 'CR',
            description: entryDescription,
            entryDate: today,
            postedBy: 'admin-manual'
          });

          // Update last posted date
          await tx.scheduledExpense.update({
            where: { id: expense.id },
            data: { lastPostedDate: today }
          });
        });

        totalAmountPosted += expenseAmount;

        results.push({
          expenseId: expense.id,
          propertyId: expense.propertyId,
          propertyName: expense.property?.name || null,
          description: expense.description,
          amount: expenseAmount,
          status: 'posted',
          message: `Posted ${expense.description} of $${expenseAmount.toFixed(2)}`
        });

      } catch (error: any) {
        if (error.code === 'P2002') {
          results.push({
            expenseId: expense.id,
            propertyId: expense.propertyId,
            propertyName: expense.property?.name || null,
            description: expense.description,
            amount: Number(expense.amount),
            status: 'skipped',
            message: 'Already posted (duplicate prevented)'
          });
        } else {
          results.push({
            expenseId: expense.id,
            propertyId: expense.propertyId,
            propertyName: expense.property?.name || null,
            description: expense.description,
            amount: Number(expense.amount),
            status: 'error',
            message: error.message || 'Failed to post expense'
          });
        }
      }
    }

    const posted = results.filter(r => r.status === 'posted').length;
    const skipped = results.filter(r => r.status === 'skipped').length;
    const errors = results.filter(r => r.status === 'error').length;
    const duration = Date.now() - startTime;

    let status = 'SUCCESS';
    if (errors > 0 && posted === 0 && results.length > 0) {
      status = 'FAILED';
    } else if (errors > 0) {
      status = 'PARTIAL';
    }

    await prisma.cronLog.create({
      data: {
        jobName: 'daily-expenses',
        status,
        chargesPosted: posted,
        chargesSkipped: skipped,
        chargesErrored: errors,
        totalAmount: totalAmountPosted,
        duration,
        errorMessage: errors > 0 ? results.filter(r => r.status === 'error').map(r => r.message).join('; ') : null,
        details: { ...results, source: 'admin-manual' } as any
      }
    });

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
    console.error('[ADMIN] daily-expenses failed:', error);
    return NextResponse.json(
      { error: error.message || 'Daily expenses job failed' },
      { status: 500 }
    );
  }
}

async function runNotifications(startTime: number): Promise<NextResponse> {
  // Proxy to the notifications cron endpoint
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXTAUTH_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/cron/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CRON_SECRET ? { 'Authorization': `Bearer ${process.env.CRON_SECRET}` } : {})
      }
    });

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Notifications job failed' },
      { status: 500 }
    );
  }
}
