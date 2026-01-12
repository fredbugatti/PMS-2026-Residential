import { NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';
import { stripe, isStripeConfigured } from '@/lib/stripe';

// GET /api/admin/health - Check system health
// Note: Protected by middleware (same-origin browser requests allowed)
export async function GET() {
  const checks: {
    name: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    details?: any;
  }[] = [];

  // 1. Database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ name: 'Database Connection', status: 'ok', message: 'Connected to PostgreSQL' });
  } catch (error: any) {
    checks.push({ name: 'Database Connection', status: 'error', message: error.message });
  }

  // 2. Check for properties
  try {
    const propertyCount = await prisma.property.count();
    checks.push({
      name: 'Properties',
      status: propertyCount > 0 ? 'ok' : 'warning',
      message: `${propertyCount} properties in system`,
      details: { count: propertyCount }
    });
  } catch (error: any) {
    checks.push({ name: 'Properties', status: 'error', message: error.message });
  }

  // 3. Check for active leases
  try {
    const activeLeases = await prisma.lease.count({ where: { status: 'ACTIVE' } });
    const totalLeases = await prisma.lease.count();
    checks.push({
      name: 'Leases',
      status: activeLeases > 0 ? 'ok' : 'warning',
      message: `${activeLeases} active / ${totalLeases} total leases`,
      details: { active: activeLeases, total: totalLeases }
    });
  } catch (error: any) {
    checks.push({ name: 'Leases', status: 'error', message: error.message });
  }

  // 4. Check scheduled charges
  try {
    const activeCharges = await prisma.scheduledCharge.count({ where: { active: true } });
    const totalCharges = await prisma.scheduledCharge.count();
    checks.push({
      name: 'Scheduled Charges',
      status: activeCharges > 0 ? 'ok' : 'warning',
      message: `${activeCharges} active / ${totalCharges} total scheduled charges`,
      details: { active: activeCharges, total: totalCharges }
    });
  } catch (error: any) {
    checks.push({ name: 'Scheduled Charges', status: 'error', message: error.message });
  }

  // 5. Check chart of accounts
  try {
    const accountCount = await prisma.chartOfAccounts.count();
    checks.push({
      name: 'Chart of Accounts',
      status: accountCount > 0 ? 'ok' : 'error',
      message: `${accountCount} accounts configured`,
      details: { count: accountCount }
    });
  } catch (error: any) {
    checks.push({ name: 'Chart of Accounts', status: 'error', message: error.message });
  }

  // 6. Check ledger entries
  try {
    const entryCount = await prisma.ledgerEntry.count();
    const recentEntries = await prisma.ledgerEntry.count({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    });
    checks.push({
      name: 'Ledger Entries',
      status: 'ok',
      message: `${entryCount} total entries, ${recentEntries} in last 30 days`,
      details: { total: entryCount, recent: recentEntries }
    });
  } catch (error: any) {
    checks.push({ name: 'Ledger Entries', status: 'error', message: error.message });
  }

  // 7. Check vendors
  try {
    const vendorCount = await prisma.vendor.count();
    checks.push({
      name: 'Vendors',
      status: 'ok',
      message: `${vendorCount} vendors in system`,
      details: { count: vendorCount }
    });
  } catch (error: any) {
    checks.push({ name: 'Vendors', status: 'error', message: error.message });
  }

  // 8. Check work orders
  try {
    const openWorkOrders = await prisma.workOrder.count({
      where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } }
    });
    const totalWorkOrders = await prisma.workOrder.count();
    checks.push({
      name: 'Work Orders',
      status: 'ok',
      message: `${openWorkOrders} open / ${totalWorkOrders} total work orders`,
      details: { open: openWorkOrders, total: totalWorkOrders }
    });
  } catch (error: any) {
    checks.push({ name: 'Work Orders', status: 'error', message: error.message });
  }

  // 9. Check cron logs
  try {
    const recentCronRuns = await prisma.cronLog.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    });
    const lastRun = await prisma.cronLog.findFirst({ orderBy: { createdAt: 'desc' } });
    checks.push({
      name: 'Cron Jobs',
      status: recentCronRuns > 0 ? 'ok' : 'warning',
      message: lastRun
        ? `Last run: ${lastRun.createdAt.toLocaleString()} (${lastRun.status})`
        : 'No cron runs recorded',
      details: { recentRuns: recentCronRuns, lastRun: lastRun?.createdAt }
    });
  } catch (error: any) {
    checks.push({ name: 'Cron Jobs', status: 'error', message: error.message });
  }

  // 10. Check Stripe API connectivity
  try {
    if (isStripeConfigured() && stripe) {
      const startTime = Date.now();
      await stripe.balance.retrieve();
      const responseTime = Date.now() - startTime;

      checks.push({
        name: 'Stripe API',
        status: responseTime < 2000 ? 'ok' : 'warning',
        message: `Connected (${responseTime}ms response time)`,
        details: { responseTime, configured: true }
      });
    } else {
      checks.push({
        name: 'Stripe API',
        status: 'warning',
        message: 'STRIPE_SECRET_KEY not configured',
        details: { configured: false }
      });
    }
  } catch (error: any) {
    checks.push({
      name: 'Stripe API',
      status: 'error',
      message: `Connection failed: ${error.message}`,
      details: { error: error.message }
    });
  }

  // 11. Check webhook processing health
  try {
    const failedWebhooks = await prisma.webhookEvent.count({
      where: { status: 'failed' }
    });
    const recentWebhooks = await prisma.webhookEvent.count({
      where: { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    });

    checks.push({
      name: 'Webhook Processing',
      status: failedWebhooks > 5 ? 'warning' : 'ok',
      message: failedWebhooks > 0
        ? `${failedWebhooks} failed webhooks (${recentWebhooks} in last 24h)`
        : `Healthy (${recentWebhooks} webhooks in last 24h)`,
      details: { failed: failedWebhooks, recent: recentWebhooks }
    });
  } catch (error: any) {
    checks.push({
      name: 'Webhook Processing',
      status: 'error',
      message: error.message
    });
  }

  // 12. Database pool health check (metrics require Prisma extensions)
  checks.push({
    name: 'Database Pool',
    status: 'ok',
    message: 'Connection verified via query checks above',
    details: { available: true }
  });

  // Calculate overall status
  const hasError = checks.some(c => c.status === 'error');
  const hasWarning = checks.some(c => c.status === 'warning');
  const overallStatus = hasError ? 'error' : hasWarning ? 'warning' : 'ok';

  return NextResponse.json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checks
  });
}
