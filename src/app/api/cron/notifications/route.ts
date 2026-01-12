import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { sendEmail, emailTemplates, getNotificationSettings } from '@/lib/email';

export const dynamic = 'force-dynamic';

// Verify cron secret in production
function verifyCronSecret(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true;

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true; // Allow if not configured

  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${cronSecret}`;
}

// POST /api/cron/notifications - Run notification cron jobs
export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results = {
    lateReminders: { sent: 0, skipped: 0, errors: 0 },
    leaseExpiry: { sent: 0, skipped: 0, errors: 0 }
  };

  try {
    const settings = await getNotificationSettings();

    // 1. Late Payment Reminders
    if (settings.latePaymentReminders) {
      const reminderResults = await sendLatePaymentReminders(settings.daysBeforeLateReminder);
      results.lateReminders = reminderResults;
    }

    // 2. Lease Expiry Warnings
    if (settings.leaseExpiryWarnings) {
      const expiryResults = await sendLeaseExpiryWarnings(settings.leaseExpiryDays);
      results.leaseExpiry = expiryResults;
    }

    // Log cron execution
    await prisma.cronLog.create({
      data: {
        jobName: 'notifications',
        status: 'SUCCESS',
        chargesPosted: results.lateReminders.sent + results.leaseExpiry.sent,
        chargesSkipped: results.lateReminders.skipped + results.leaseExpiry.skipped,
        chargesErrored: results.lateReminders.errors + results.leaseExpiry.errors,
        details: results
      }
    });

    return NextResponse.json({
      success: true,
      results
    });

  } catch (error: any) {
    console.error('Notification cron error:', error);

    await prisma.cronLog.create({
      data: {
        jobName: 'notifications',
        status: 'FAILED',
        errorMessage: error.message,
        details: results
      }
    });

    return NextResponse.json(
      { error: error.message, results },
      { status: 500 }
    );
  }
}

// GET endpoint for manual trigger
export async function GET(request: NextRequest) {
  return POST(request);
}

/**
 * Send late payment reminders
 */
async function sendLatePaymentReminders(daysLate: number): Promise<{ sent: number; skipped: number; errors: number }> {
  const results = { sent: 0, skipped: 0, errors: 0 };

  // Find leases with outstanding balances
  const activeLeases = await prisma.lease.findMany({
    where: {
      status: 'ACTIVE',
      tenantEmail: { not: null }
    },
    select: {
      id: true,
      tenantName: true,
      tenantEmail: true,
      propertyName: true,
      unitName: true,
      portalToken: true,
      gracePeriodDays: true
    }
  });

  for (const lease of activeLeases) {
    try {
      // Get AR balance
      const entries = await prisma.ledgerEntry.findMany({
        where: {
          leaseId: lease.id,
          accountCode: '1200',
          status: 'POSTED' as const
        }
      });

      const balance = entries.reduce((sum, e) => {
        const amt = Number(e.amount);
        return e.debitCredit === 'DR' ? sum + amt : sum - amt;
      }, 0);

      if (balance <= 0) {
        results.skipped++;
        continue;
      }

      // Find oldest unpaid charge
      const oldestCharge = await prisma.ledgerEntry.findFirst({
        where: {
          leaseId: lease.id,
          accountCode: '1200',
          debitCredit: 'DR',
          status: 'POSTED' as const
        },
        orderBy: { entryDate: 'asc' }
      });

      if (!oldestCharge) {
        results.skipped++;
        continue;
      }

      const daysPastDue = Math.floor(
        (Date.now() - new Date(oldestCharge.entryDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Use lease grace period or default
      const gracePeriod = lease.gracePeriodDays || daysLate;

      if (daysPastDue < gracePeriod) {
        results.skipped++;
        continue;
      }

      // Check if we already sent a reminder today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const existingReminder = await prisma.emailLog.findFirst({
        where: {
          leaseId: lease.id,
          templateType: 'late_reminder',
          createdAt: { gte: todayStart }
        }
      });

      if (existingReminder) {
        results.skipped++;
        continue;
      }

      // Send reminder
      const portalUrl = lease.portalToken
        ? `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/tenant/${lease.portalToken}`
        : undefined;

      const template = emailTemplates.latePaymentReminder({
        tenantName: lease.tenantName,
        amountDue: balance,
        daysLate: daysPastDue,
        dueDate: oldestCharge.entryDate,
        propertyAddress: lease.propertyName || 'N/A',
        unitName: lease.unitName,
        portalUrl
      });

      const result = await sendEmail({
        to: lease.tenantEmail!,
        toName: lease.tenantName,
        subject: template.subject,
        html: template.html,
        templateType: 'late_reminder',
        leaseId: lease.id,
        metadata: { balance, daysPastDue }
      });

      if (result.success) {
        results.sent++;
      } else {
        results.errors++;
      }

    } catch (error) {
      console.error(`Error processing lease ${lease.id}:`, error);
      results.errors++;
    }
  }

  return results;
}

/**
 * Send lease expiry warnings
 */
async function sendLeaseExpiryWarnings(warningDays: number[]): Promise<{ sent: number; skipped: number; errors: number }> {
  const results = { sent: 0, skipped: 0, errors: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const days of warningDays) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() + days);

    // Find leases expiring on this exact day
    const expiringLeases = await prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        tenantEmail: { not: null },
        endDate: {
          gte: targetDate,
          lt: new Date(targetDate.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      include: {
        scheduledCharges: {
          where: { active: true, accountCode: '4000' }
        }
      }
    });

    for (const lease of expiringLeases) {
      try {
        // Check if we already sent this warning
        const existingWarning = await prisma.emailLog.findFirst({
          where: {
            leaseId: lease.id,
            templateType: 'lease_expiry',
            metadata: {
              path: ['daysRemaining'],
              equals: days
            }
          }
        });

        if (existingWarning) {
          results.skipped++;
          continue;
        }

        const monthlyRent = lease.scheduledCharges[0]?.amount
          ? Number(lease.scheduledCharges[0].amount)
          : 0;

        const template = emailTemplates.leaseExpiryWarning({
          tenantName: lease.tenantName,
          expirationDate: lease.endDate!,
          daysRemaining: days,
          propertyAddress: lease.propertyName || 'N/A',
          unitName: lease.unitName,
          monthlyRent
        });

        const result = await sendEmail({
          to: lease.tenantEmail!,
          toName: lease.tenantName,
          subject: template.subject,
          html: template.html,
          templateType: 'lease_expiry',
          leaseId: lease.id,
          metadata: { daysRemaining: days, expirationDate: lease.endDate }
        });

        if (result.success) {
          results.sent++;
        } else {
          results.errors++;
        }

      } catch (error) {
        console.error(`Error processing lease ${lease.id}:`, error);
        results.errors++;
      }
    }
  }

  return results;
}
