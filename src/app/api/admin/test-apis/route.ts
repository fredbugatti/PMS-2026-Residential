import { NextResponse } from 'next/server';
import { prisma } from '@/lib/accounting';

export const dynamic = 'force-dynamic';

// GET /api/admin/test-apis - Test all database tables and API functionality
// Note: Protected by middleware (same-origin browser requests allowed)
export async function GET() {
  const results: {
    name: string;
    path: string;
    status: 'ok' | 'error';
    responseTime: number;
    count?: number;
    error?: string;
  }[] = [];

  // Test each table/model directly via Prisma
  const tests = [
    { name: 'Properties List', path: '/api/properties', test: () => prisma.property.count() },
    { name: 'Units List', path: '/api/units', test: () => prisma.unit.count() },
    { name: 'Leases List', path: '/api/leases', test: () => prisma.lease.count() },
    { name: 'Vendors List', path: '/api/vendors', test: () => prisma.vendor.count() },
    { name: 'Work Orders List', path: '/api/work-orders', test: () => prisma.workOrder.count() },
    { name: 'Chart of Accounts', path: '/api/chart-of-accounts', test: () => prisma.chartOfAccounts.count() },
    { name: 'Ledger Entries', path: '/api/ledger', test: () => prisma.ledgerEntry.count() },
    { name: 'Scheduled Charges', path: '/api/scheduled-charges', test: () => prisma.scheduledCharge.count() },
    { name: 'Rent Increases', path: '/api/rent-increases', test: () => prisma.rentIncrease.count() },
    { name: 'Documents', path: '/api/documents', test: () => prisma.document.count() },
    { name: 'Document Library', path: '/api/library', test: () => prisma.documentLibrary.count() },
    { name: 'Document Templates', path: '/api/templates', test: () => prisma.documentTemplate.count() },
    { name: 'Cron Logs', path: '/api/cron/logs', test: () => prisma.cronLog.count() },
    { name: 'Webhook Events', path: '/api/webhooks', test: () => prisma.webhookEvent.count() },
  ];

  for (const { name, path, test } of tests) {
    const startTime = Date.now();
    try {
      const count = await test();
      results.push({
        name,
        path,
        status: 'ok',
        responseTime: Date.now() - startTime,
        count,
      });
    } catch (error: any) {
      results.push({
        name,
        path,
        status: 'error',
        responseTime: Date.now() - startTime,
        error: error.message,
      });
    }
  }

  const passed = results.filter(r => r.status === 'ok').length;
  const failed = results.filter(r => r.status === 'error').length;
  const avgResponseTime = Math.round(results.reduce((sum, r) => sum + r.responseTime, 0) / results.length);

  return NextResponse.json({
    summary: {
      total: results.length,
      passed,
      failed,
      avgResponseTime
    },
    results
  });
}
