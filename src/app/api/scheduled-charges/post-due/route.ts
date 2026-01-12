import { NextRequest, NextResponse } from 'next/server';
import { prisma, withLedgerTransaction } from '@/lib/accounting';

// POST /api/scheduled-charges/post-due - Post all due scheduled charges
// Can optionally pass leaseId to only process charges for a specific lease
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { leaseId } = body;

    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Format month name for descriptions (e.g., "January 2025")
    const monthName = today.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    // Get active scheduled charges that are due today or earlier
    const scheduledCharges = await prisma.scheduledCharge.findMany({
      where: {
        active: true,
        chargeDay: { lte: currentDay },
        ...(leaseId ? { leaseId } : {}),
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
            status: true
          }
        }
      }
    });

    const results: Array<{
      chargeId: string;
      leaseId: string;
      description: string;
      amount: number;
      status: 'posted' | 'skipped' | 'error';
      message: string;
    }> = [];

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

        // ATOMIC: Post both entries AND update lastChargedDate in a single transaction
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
            postedBy: 'scheduled'
          });

          // Post entry 2: CR Income (record revenue)
          await postEntry({
            accountCode: charge.accountCode,
            amount: chargeAmount,
            debitCredit: 'CR',
            description: entryDescription,
            entryDate: today,
            leaseId: charge.leaseId,
            postedBy: 'scheduled'
          });

          // Update last charged date (within same transaction)
          await tx.scheduledCharge.update({
            where: { id: charge.id },
            data: { lastChargedDate: today }
          });
        });

        results.push({
          chargeId: charge.id,
          leaseId: charge.leaseId,
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
            description: charge.description,
            amount: Number(charge.amount),
            status: 'skipped',
            message: 'Already posted (duplicate prevented)'
          });
        } else {
          results.push({
            chargeId: charge.id,
            leaseId: charge.leaseId,
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

    return NextResponse.json({
      success: true,
      summary: {
        total: results.length,
        posted,
        skipped,
        errors
      },
      results
    });

  } catch (error: any) {
    console.error('POST /api/scheduled-charges/post-due error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to post scheduled charges' },
      { status: 500 }
    );
  }
}
