import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

// GET /api/deposits/status/[leaseId] - Get deposit status for a lease
export async function GET(
  request: NextRequest,
  { params }: { params: { leaseId: string } }
) {
  try {
    // Get all ledger entries for this lease on account 2100 (Deposits Held)
    const depositEntries = await prisma.ledgerEntry.findMany({
      where: {
        leaseId: params.leaseId,
        accountCode: '2100',
        status: 'POSTED'
      },
      orderBy: {
        entryDate: 'asc'
      }
    });

    // Calculate current deposit balance
    // CR increases liability (deposit held), DR decreases it (returned/deducted)
    let depositBalance = 0;
    let totalReceived = 0;
    let totalReturned = 0;
    let totalDeducted = 0;

    for (const entry of depositEntries) {
      const amount = Number(entry.amount);
      if (entry.debitCredit === 'CR') {
        depositBalance += amount;
        totalReceived += amount;
      } else {
        depositBalance -= amount;
        if (entry.description.includes('deduction')) {
          totalDeducted += amount;
        } else {
          totalReturned += amount;
        }
      }
    }

    // Get lease details
    const lease = await prisma.lease.findUnique({
      where: { id: params.leaseId },
      select: {
        securityDepositAmount: true,
        status: true
      }
    });

    return NextResponse.json({
      leaseId: params.leaseId,
      currentBalance: depositBalance,
      totalReceived: totalReceived,
      totalReturned: totalReturned,
      totalDeducted: totalDeducted,
      expectedAmount: lease?.securityDepositAmount ? Number(lease.securityDepositAmount) : null,
      status: depositBalance > 0 ? 'HELD' : totalReceived > 0 ? 'RETURNED' : 'NOT_RECEIVED',
      entries: depositEntries.map(entry => ({
        id: entry.id,
        date: entry.entryDate,
        amount: Number(entry.amount),
        type: entry.debitCredit,
        description: entry.description
      }))
    });

  } catch (error: any) {
    console.error(`GET /api/deposits/status/${params.leaseId} error:`, error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch deposit status' },
      { status: 500 }
    );
  }
}
