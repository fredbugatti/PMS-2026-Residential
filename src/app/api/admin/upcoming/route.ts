import { NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/admin/upcoming - Get upcoming events and scheduled actions
// Note: Protected by middleware (same-origin browser requests allowed)
export async function GET() {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // 1. Charges that will post this month (not yet posted)
  const pendingCharges = await prisma.scheduledCharge.findMany({
    where: {
      active: true,
      lease: { status: 'ACTIVE' },
      OR: [
        { lastChargedDate: null },
        {
          lastChargedDate: {
            lt: new Date(currentYear, currentMonth, 1)
          }
        }
      ]
    },
    include: {
      lease: {
        include: {
          unit: { include: { property: true } }
        }
      }
    },
    orderBy: { chargeDay: 'asc' }
  });

  const chargesThisMonth = pendingCharges.map(charge => ({
    id: charge.id,
    chargeDay: charge.chargeDay,
    willPostOn: charge.chargeDay <= currentDay ? 'Next cron run' : `Day ${charge.chargeDay}`,
    alreadyDue: charge.chargeDay <= currentDay,
    description: charge.description,
    amount: Number(charge.amount),
    tenant: charge.lease?.tenantName || 'Unknown',
    unit: charge.lease?.unit?.unitNumber || 'Unknown',
    property: charge.lease?.unit?.property?.name || 'Unknown'
  }));

  const totalPending = chargesThisMonth.reduce((sum, c) => sum + c.amount, 0);
  const dueNow = chargesThisMonth.filter(c => c.alreadyDue);
  const upcoming = chargesThisMonth.filter(c => !c.alreadyDue);

  // 2. Leases expiring soon (next 90 days)
  const ninetyDaysFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  const expiringLeases = await prisma.lease.findMany({
    where: {
      status: 'ACTIVE',
      endDate: {
        gte: today,
        lte: ninetyDaysFromNow
      }
    },
    include: {
      unit: { include: { property: true } },
      scheduledCharges: {
        where: { accountCode: '4000', active: true }
      }
    },
    orderBy: { endDate: 'asc' }
  });

  const leasesExpiringSoon = expiringLeases.map(lease => {
    const daysUntilExpiry = Math.ceil((lease.endDate!.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    const rentCharge = lease.scheduledCharges[0];
    return {
      id: lease.id,
      tenant: lease.tenantName || 'Unknown',
      unit: lease.unit?.unitNumber,
      property: lease.unit?.property?.name,
      endDate: lease.endDate,
      daysUntilExpiry,
      monthlyRent: rentCharge ? Number(rentCharge.amount) : null,
      urgency: daysUntilExpiry <= 30 ? 'high' : daysUntilExpiry <= 60 ? 'medium' : 'low'
    };
  });

  // 3. Open work orders
  const openWorkOrders = await prisma.workOrder.findMany({
    where: {
      status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] }
    },
    include: {
      unit: { include: { property: true } },
      vendor: true
    },
    orderBy: [
      { priority: 'desc' },
      { createdAt: 'asc' }
    ]
  });

  const workOrdersSummary = openWorkOrders.map(wo => ({
    id: wo.id,
    title: wo.title,
    status: wo.status,
    priority: wo.priority,
    unit: wo.unit?.unitNumber,
    property: wo.unit?.property?.name,
    vendor: wo.vendor?.name,
    createdAt: wo.createdAt,
    daysSinceCreated: Math.floor((today.getTime() - wo.createdAt.getTime()) / (24 * 60 * 60 * 1000))
  }));

  // 4. Tenants with balances (from ledger)
  const tenantBalances = await prisma.$queryRaw<Array<{
    lease_id: string;
    tenant_name: string;
    balance: number;
  }>>`
    SELECT
      l.id as lease_id,
      l.tenant_name as tenant_name,
      COALESCE(SUM(
        CASE
          WHEN le.debit_credit = 'DR' THEN le.amount
          ELSE -le.amount
        END
      ), 0) as balance
    FROM leases l
    LEFT JOIN ledger_entries le ON le.lease_id = l.id
    WHERE l.status = 'ACTIVE'
    GROUP BY l.id, l.tenant_name
    HAVING COALESCE(SUM(
      CASE
        WHEN le.debit_credit = 'DR' THEN le.amount
        ELSE -le.amount
      END
    ), 0) > 0
    ORDER BY balance DESC
  `;

  const tenantsWithBalances = tenantBalances.map(tb => ({
    leaseId: tb.lease_id,
    tenantName: tb.tenant_name,
    balance: Number(tb.balance)
  }));

  // 5. Cron job status
  const lastCronRun = await prisma.cronLog.findFirst({
    orderBy: { createdAt: 'desc' }
  });

  const cronStatus = {
    lastRun: lastCronRun ? {
      time: lastCronRun.createdAt,
      status: lastCronRun.status,
      chargesPosted: lastCronRun.chargesPosted,
      chargesSkipped: lastCronRun.chargesSkipped
    } : null,
    nextScheduledRun: '6:00 AM UTC daily',
    chargesDueNow: dueNow.length,
    chargesDueNowAmount: dueNow.reduce((sum, c) => sum + c.amount, 0)
  };

  return NextResponse.json({
    asOf: today.toISOString(),
    currentDay,

    charges: {
      pendingThisMonth: chargesThisMonth.length,
      totalAmount: totalPending,
      dueNow: {
        count: dueNow.length,
        amount: dueNow.reduce((sum, c) => sum + c.amount, 0),
        items: dueNow
      },
      upcoming: {
        count: upcoming.length,
        amount: upcoming.reduce((sum, c) => sum + c.amount, 0),
        items: upcoming
      }
    },

    leases: {
      expiringSoon: leasesExpiringSoon.length,
      expiringIn30Days: leasesExpiringSoon.filter(l => l.daysUntilExpiry <= 30).length,
      expiringIn60Days: leasesExpiringSoon.filter(l => l.daysUntilExpiry <= 60).length,
      items: leasesExpiringSoon
    },

    workOrders: {
      open: workOrdersSummary.length,
      highPriority: workOrdersSummary.filter(w => w.priority === 'HIGH' || w.priority === 'EMERGENCY').length,
      items: workOrdersSummary
    },

    receivables: {
      tenantsWithBalance: tenantsWithBalances.length,
      totalOutstanding: tenantsWithBalances.reduce((sum, t) => sum + t.balance, 0),
      items: tenantsWithBalances
    },

    cron: cronStatus
  });
}
