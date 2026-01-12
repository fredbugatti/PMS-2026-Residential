import { NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null;
  amount: number;
  count: number;
  tenants: Array<{
    leaseId: string;
    tenantName: string;
    unitName: string;
    propertyName: string | null;
    amount: number;
    oldestChargeDate: string;
    daysPastDue: number;
  }>;
}

// GET /api/reports/aging - Get aging report with 30/60/90+ buckets
export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active leases with their AR ledger entries
    const leases = await prisma.lease.findMany({
      where: {
        status: { in: ['ACTIVE', 'DRAFT'] }
      },
      select: {
        id: true,
        tenantName: true,
        unitName: true,
        propertyName: true,
        ledgerEntries: {
          where: {
            accountCode: '1200', // AR account
            status: 'POSTED'
          },
          select: {
            id: true,
            amount: true,
            debitCredit: true,
            entryDate: true,
            description: true
          },
          orderBy: { entryDate: 'asc' }
        }
      },
      orderBy: { tenantName: 'asc' }
    });

    // Initialize buckets
    const buckets: AgingBucket[] = [
      { label: 'Current (0-30 days)', minDays: 0, maxDays: 30, amount: 0, count: 0, tenants: [] },
      { label: '31-60 days', minDays: 31, maxDays: 60, amount: 0, count: 0, tenants: [] },
      { label: '61-90 days', minDays: 61, maxDays: 90, amount: 0, count: 0, tenants: [] },
      { label: 'Over 90 days', minDays: 91, maxDays: null, amount: 0, count: 0, tenants: [] }
    ];

    let totalOutstanding = 0;
    let totalTenants = 0;

    for (const lease of leases) {
      // Separate charges (DR) and payments (CR)
      const charges: Array<{ date: Date; amount: number; remaining: number }> = [];
      let totalPayments = 0;

      for (const entry of lease.ledgerEntries) {
        const amount = Number(entry.amount);
        if (entry.debitCredit === 'DR') {
          charges.push({
            date: new Date(entry.entryDate),
            amount,
            remaining: amount
          });
        } else {
          totalPayments += amount;
        }
      }

      // Apply payments to oldest charges first (FIFO)
      let paymentsToApply = totalPayments;
      for (const charge of charges) {
        if (paymentsToApply <= 0) break;
        const apply = Math.min(paymentsToApply, charge.remaining);
        charge.remaining -= apply;
        paymentsToApply -= apply;
      }

      // Calculate total balance and find unpaid charges by age
      const unpaidCharges = charges.filter(c => c.remaining > 0.01);
      const totalBalance = unpaidCharges.reduce((sum, c) => sum + c.remaining, 0);

      if (totalBalance < 0.01) continue; // Skip tenants with no balance

      totalOutstanding += totalBalance;
      totalTenants++;

      // Find oldest unpaid charge to determine primary bucket
      const oldestUnpaid = unpaidCharges[0];
      if (!oldestUnpaid) continue;

      const daysPastDue = Math.floor(
        (today.getTime() - oldestUnpaid.date.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Determine which bucket this tenant falls into
      let bucketIndex = 0;
      if (daysPastDue > 90) bucketIndex = 3;
      else if (daysPastDue > 60) bucketIndex = 2;
      else if (daysPastDue > 30) bucketIndex = 1;

      buckets[bucketIndex].amount += totalBalance;
      buckets[bucketIndex].count++;
      buckets[bucketIndex].tenants.push({
        leaseId: lease.id,
        tenantName: lease.tenantName,
        unitName: lease.unitName,
        propertyName: lease.propertyName,
        amount: totalBalance,
        oldestChargeDate: oldestUnpaid.date.toISOString().split('T')[0],
        daysPastDue
      });
    }

    // Sort tenants within each bucket by amount (highest first)
    for (const bucket of buckets) {
      bucket.tenants.sort((a, b) => b.amount - a.amount);
    }

    return NextResponse.json({
      asOfDate: today.toISOString().split('T')[0],
      buckets,
      summary: {
        totalOutstanding,
        totalTenants,
        over30Days: buckets[1].amount + buckets[2].amount + buckets[3].amount,
        over60Days: buckets[2].amount + buckets[3].amount,
        over90Days: buckets[3].amount
      }
    });

  } catch (error: any) {
    console.error('GET /api/reports/aging error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate aging report' },
      { status: 500 }
    );
  }
}
