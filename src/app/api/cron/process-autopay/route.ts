import { NextRequest, NextResponse } from 'next/server';
import { prisma, withLedgerTransaction } from '@/lib/accounting';
import { chargeCustomer, isStripeConfigured } from '@/lib/stripe';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Vercel Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

// POST /api/cron/process-autopay - Process autopay payments
export async function POST(request: NextRequest) {
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

    if (!isStripeConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Stripe is not configured',
        processed: 0
      });
    }

    const today = new Date();
    const dayOfMonth = today.getDate();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD for idempotency

    // Find all active leases with autopay enabled for today
    const leasesToProcess = await prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        autopayEnabled: true,
        autopayDay: dayOfMonth,
        stripeCustomerId: { not: null },
        stripePaymentMethodId: { not: null }
      },
      include: {
        ledgerEntries: {
          where: {
            accountCode: '1200' // Only Accounts Receivable entries for tenant balance
          },
          select: {
            amount: true,
            debitCredit: true
          }
        }
      }
    });

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      details: [] as Array<{
        leaseId: string;
        tenantName: string;
        amount: number;
        status: 'succeeded' | 'processing' | 'failed' | 'skipped';
        error?: string;
      }>
    };

    for (const lease of leasesToProcess) {
      // Calculate current balance from ledger entries
      // Positive balance = tenant owes money (debits > credits)
      const currentBalance = lease.ledgerEntries.reduce((balance, entry) => {
        const amount = Number(entry.amount) || 0;
        return balance + (entry.debitCredit === 'DR' ? amount : -amount);
      }, 0);

      // Skip if no balance owed (balance is 0 or negative/credit)
      if (currentBalance <= 0) {
        results.skipped++;
        results.details.push({
          leaseId: lease.id,
          tenantName: lease.tenantName,
          amount: 0,
          status: 'skipped',
          error: currentBalance < 0 ? 'Tenant has credit balance' : 'No balance due'
        });
        continue;
      }

      // Round to 2 decimal places for currency
      const amount = Math.round(currentBalance * 100) / 100;

      // Check if payment was already processed today
      if (lease.stripeLastPaymentDate) {
        const lastPaymentDate = new Date(lease.stripeLastPaymentDate);
        if (
          lastPaymentDate.getFullYear() === today.getFullYear() &&
          lastPaymentDate.getMonth() === today.getMonth() &&
          lastPaymentDate.getDate() === today.getDate()
        ) {
          results.skipped++;
          results.details.push({
            leaseId: lease.id,
            tenantName: lease.tenantName,
            amount,
            status: 'skipped',
            error: 'Already processed today'
          });
          continue;
        }
      }

      results.processed++;

      // Generate idempotency key to prevent duplicate charges if cron retries
      // Format: autopay-{leaseId}-{date} ensures only one charge per lease per day
      const idempotencyKey = `autopay-${lease.id}-${dateStr}`;

      // Attempt to charge the customer
      const description = `Rent payment for ${lease.tenantName} - ${lease.propertyName || ''} ${lease.unitName}`;

      const chargeResult = await chargeCustomer(
        lease.stripeCustomerId!,
        lease.stripePaymentMethodId!,
        amount,
        description,
        {
          leaseId: lease.id,
          tenantName: lease.tenantName,
          propertyName: lease.propertyName || '',
          unitName: lease.unitName
        },
        idempotencyKey // Prevents duplicate charges on retry
      );

      if (chargeResult.success) {
        results.succeeded++;
        const paymentStatus = chargeResult.paymentIntent?.status || 'processing';

        // Only post to ledger for ACH payments that are processing or succeeded
        // ACH typically goes to 'processing' first, then webhook confirms 'succeeded'
        // We post immediately because the payment has been initiated

        // Post both ledger entries and lease update in a single transaction
        await withLedgerTransaction(async (tx, postEntry) => {
          const paymentDesc = `Autopay: ${description} [${idempotencyKey}]`;

          // Credit AR (reduce what tenant owes)
          await postEntry({
            entryDate: today,
            accountCode: '1200', // Accounts Receivable
            amount,
            debitCredit: 'CR',
            description: paymentDesc,
            leaseId: lease.id,
            postedBy: 'autopay'
          });

          // Debit Cash in Transit (payment initiated but not yet confirmed)
          await postEntry({
            entryDate: today,
            accountCode: '1001', // Cash in Transit (moves to 1000 on webhook success)
            amount,
            debitCredit: 'DR',
            description: paymentDesc,
            leaseId: lease.id,
            postedBy: 'autopay'
          });

          // Update lease with payment info
          await tx.lease.update({
            where: { id: lease.id },
            data: {
              stripeLastPaymentDate: today,
              stripeLastPaymentStatus: paymentStatus === 'succeeded' ? 'succeeded' : 'processing'
            }
          });
        });

        results.details.push({
          leaseId: lease.id,
          tenantName: lease.tenantName,
          amount,
          status: paymentStatus === 'succeeded' ? 'succeeded' : 'processing'
        });
      } else {
        results.failed++;

        // Update lease with failed status
        await prisma.lease.update({
          where: { id: lease.id },
          data: {
            stripeLastPaymentDate: today,
            stripeLastPaymentStatus: 'failed'
          }
        });

        results.details.push({
          leaseId: lease.id,
          tenantName: lease.tenantName,
          amount,
          status: 'failed',
          error: chargeResult.error
        });

        // TODO: Send notification email about failed payment
      }
    }

    return NextResponse.json({
      success: true,
      date: today.toISOString(),
      dayOfMonth,
      totalLeases: leasesToProcess.length,
      ...results
    });

  } catch (error: any) {
    console.error('Autopay processing error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to process autopay' },
      { status: 500 }
    );
  }
}

// GET handler for manual testing
export async function GET(request: NextRequest) {
  // For security, only allow GET in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Use POST method' }, { status: 405 });
  }

  // Forward to POST handler
  return POST(request);
}
