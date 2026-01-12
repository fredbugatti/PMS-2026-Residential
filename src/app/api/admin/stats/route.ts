import { NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/admin/stats - Get database statistics
// Note: Protected by middleware (same-origin browser requests allowed)
export async function GET() {
  try {
    // Get counts for all major entities
    const [
      properties,
      units,
      leases,
      vendors,
      workOrders,
      ledgerEntries,
      scheduledCharges,
      documents,
      cronLogs
    ] = await Promise.all([
      prisma.property.count(),
      prisma.unit.count(),
      prisma.lease.count(),
      prisma.vendor.count(),
      prisma.workOrder.count(),
      prisma.ledgerEntry.count(),
      prisma.scheduledCharge.count(),
      prisma.document.count(),
      prisma.cronLog.count()
    ]);

    // Count unique tenants from leases (tenant info is embedded in Lease)
    const tenants = await prisma.lease.groupBy({
      by: ['tenantName'],
      where: { tenantName: { not: '' } }
    }).then(results => results.length);

    // Get financial summary
    const ledgerSummary = await prisma.ledgerEntry.aggregate({
      _sum: { amount: true },
      _count: true
    });

    // Get lease status breakdown
    const leasesByStatus = await prisma.lease.groupBy({
      by: ['status'],
      _count: true
    });

    // Get work order status breakdown
    const workOrdersByStatus = await prisma.workOrder.groupBy({
      by: ['status'],
      _count: true
    });

    // Get monthly revenue from active scheduled charges
    const activeCharges = await prisma.scheduledCharge.findMany({
      where: { active: true, lease: { status: 'ACTIVE' } },
      select: { amount: true }
    });
    const monthlyRevenue = activeCharges.reduce((sum, c) => sum + Number(c.amount), 0);

    // Get recent activity
    const recentLeases = await prisma.lease.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    });
    const recentWorkOrders = await prisma.workOrder.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    });
    const recentLedgerEntries = await prisma.ledgerEntry.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    });

    return NextResponse.json({
      counts: {
        properties,
        units,
        leases,
        tenants,
        vendors,
        workOrders,
        ledgerEntries,
        scheduledCharges,
        documents,
        cronLogs
      },
      financial: {
        monthlyRevenue,
        totalLedgerAmount: ledgerSummary._sum.amount ? Number(ledgerSummary._sum.amount) : 0,
        ledgerEntryCount: ledgerSummary._count
      },
      breakdowns: {
        leasesByStatus: leasesByStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>),
        workOrdersByStatus: workOrdersByStatus.reduce((acc, item) => {
          acc[item.status] = item._count;
          return acc;
        }, {} as Record<string, number>)
      },
      recentActivity: {
        newLeases: recentLeases,
        newWorkOrders: recentWorkOrders,
        newLedgerEntries: recentLedgerEntries
      }
    });

  } catch (error: any) {
    console.error('GET /api/admin/stats error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
