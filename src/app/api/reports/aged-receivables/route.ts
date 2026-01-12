import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/reports/aged-receivables - Get Aged Accounts Receivable report
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const asOfDate = searchParams.get('asOfDate');
    const propertyId = searchParams.get('propertyId');

    // Default to today
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    asOf.setHours(23, 59, 59, 999);

    // Calculate aging bucket dates
    const day = 24 * 60 * 60 * 1000;
    const current = new Date(asOf);
    const thirtyDaysAgo = new Date(asOf.getTime() - 30 * day);
    const sixtyDaysAgo = new Date(asOf.getTime() - 60 * day);
    const ninetyDaysAgo = new Date(asOf.getTime() - 90 * day);

    // Get all active leases with their AR entries
    const leaseFilter: any = {
      status: 'ACTIVE',
      ...(propertyId ? { propertyId } : {})
    };

    const leases = await prisma.lease.findMany({
      where: leaseFilter,
      select: {
        id: true,
        tenantName: true,
        tenantEmail: true,
        tenantPhone: true,
        unitName: true,
        propertyName: true,
        propertyId: true,
        startDate: true,
        ledgerEntries: {
          where: {
            accountCode: '1200', // Accounts Receivable
            status: 'POSTED',
            entryDate: { lte: asOf }
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

    // Process each lease to calculate aged balances
    const agedReceivables = leases.map(lease => {
      // Calculate total balance and aging buckets
      // DR = increase AR (charges), CR = decrease AR (payments)
      let totalBalance = 0;
      let current = 0;
      let over30 = 0;
      let over60 = 0;
      let over90 = 0;

      // Track unpaid charges by date (FIFO - oldest charges paid first)
      const unpaidCharges: Array<{ date: Date; amount: number; description: string }> = [];

      for (const entry of lease.ledgerEntries) {
        const amount = Number(entry.amount);
        const entryDate = new Date(entry.entryDate);

        if (entry.debitCredit === 'DR') {
          // Charge - add to unpaid
          unpaidCharges.push({
            date: entryDate,
            amount: amount,
            description: entry.description
          });
          totalBalance += amount;
        } else {
          // Payment - apply to oldest unpaid first (FIFO)
          let paymentRemaining = amount;
          totalBalance -= amount;

          for (const charge of unpaidCharges) {
            if (paymentRemaining <= 0) break;
            if (charge.amount <= 0) continue;

            const applied = Math.min(charge.amount, paymentRemaining);
            charge.amount -= applied;
            paymentRemaining -= applied;
          }
        }
      }

      // Now categorize remaining unpaid charges by age
      for (const charge of unpaidCharges) {
        if (charge.amount <= 0) continue;

        const chargeDate = charge.date;
        const ageInDays = Math.floor((asOf.getTime() - chargeDate.getTime()) / day);

        if (ageInDays <= 30) {
          current += charge.amount;
        } else if (ageInDays <= 60) {
          over30 += charge.amount;
        } else if (ageInDays <= 90) {
          over60 += charge.amount;
        } else {
          over90 += charge.amount;
        }
      }

      // Get oldest unpaid charge date
      const oldestUnpaid = unpaidCharges.find(c => c.amount > 0);
      const oldestUnpaidDate = oldestUnpaid?.date || null;
      const daysOldest = oldestUnpaidDate
        ? Math.floor((asOf.getTime() - oldestUnpaidDate.getTime()) / day)
        : 0;

      return {
        leaseId: lease.id,
        tenantName: lease.tenantName,
        tenantEmail: lease.tenantEmail,
        tenantPhone: lease.tenantPhone,
        propertyName: lease.propertyName,
        unitName: lease.unitName,
        propertyId: lease.propertyId,
        totalBalance: Math.round(totalBalance * 100) / 100,
        aging: {
          current: Math.round(current * 100) / 100,
          over30: Math.round(over30 * 100) / 100,
          over60: Math.round(over60 * 100) / 100,
          over90: Math.round(over90 * 100) / 100
        },
        oldestUnpaidDate: oldestUnpaidDate?.toISOString().split('T')[0] || null,
        daysOutstanding: daysOldest
      };
    }).filter(ar => ar.totalBalance > 0.01); // Only include those with balances

    // Sort by total balance descending (highest owed first)
    agedReceivables.sort((a, b) => b.totalBalance - a.totalBalance);

    // Calculate totals
    const totals = agedReceivables.reduce((acc, ar) => ({
      totalBalance: acc.totalBalance + ar.totalBalance,
      current: acc.current + ar.aging.current,
      over30: acc.over30 + ar.aging.over30,
      over60: acc.over60 + ar.aging.over60,
      over90: acc.over90 + ar.aging.over90
    }), { totalBalance: 0, current: 0, over30: 0, over60: 0, over90: 0 });

    // Calculate percentages
    const percentages = totals.totalBalance > 0 ? {
      current: Math.round((totals.current / totals.totalBalance) * 1000) / 10,
      over30: Math.round((totals.over30 / totals.totalBalance) * 1000) / 10,
      over60: Math.round((totals.over60 / totals.totalBalance) * 1000) / 10,
      over90: Math.round((totals.over90 / totals.totalBalance) * 1000) / 10
    } : { current: 0, over30: 0, over60: 0, over90: 0 };

    // Risk assessment
    const highRiskTenants = agedReceivables.filter(ar => ar.aging.over60 > 0 || ar.aging.over90 > 0);
    const criticalTenants = agedReceivables.filter(ar => ar.aging.over90 > 0);

    return NextResponse.json({
      asOfDate: asOf.toISOString().split('T')[0],
      summary: {
        totalReceivables: Math.round(totals.totalBalance * 100) / 100,
        tenantsWithBalance: agedReceivables.length,
        averageBalance: agedReceivables.length > 0
          ? Math.round((totals.totalBalance / agedReceivables.length) * 100) / 100
          : 0,
        highRiskCount: highRiskTenants.length,
        criticalCount: criticalTenants.length
      },
      agingBuckets: {
        current: {
          amount: Math.round(totals.current * 100) / 100,
          percent: percentages.current,
          label: '0-30 Days'
        },
        over30: {
          amount: Math.round(totals.over30 * 100) / 100,
          percent: percentages.over30,
          label: '31-60 Days'
        },
        over60: {
          amount: Math.round(totals.over60 * 100) / 100,
          percent: percentages.over60,
          label: '61-90 Days'
        },
        over90: {
          amount: Math.round(totals.over90 * 100) / 100,
          percent: percentages.over90,
          label: '90+ Days'
        }
      },
      receivables: agedReceivables,
      riskAssessment: {
        highRisk: highRiskTenants.map(t => ({
          tenantName: t.tenantName,
          totalBalance: t.totalBalance,
          over60: t.aging.over60 + t.aging.over90
        })),
        critical: criticalTenants.map(t => ({
          tenantName: t.tenantName,
          totalBalance: t.totalBalance,
          over90: t.aging.over90,
          daysOutstanding: t.daysOutstanding
        }))
      }
    });

  } catch (error: any) {
    console.error('GET /api/reports/aged-receivables error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate Aged Receivables report' },
      { status: 500 }
    );
  }
}
