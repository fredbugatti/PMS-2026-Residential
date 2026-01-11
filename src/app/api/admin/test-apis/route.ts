import { NextResponse } from 'next/server';

// GET /api/admin/test-apis - Test all API endpoints
export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  const endpoints = [
    // Core Data
    { name: 'Properties List', method: 'GET', path: '/api/properties' },
    { name: 'Units List', method: 'GET', path: '/api/units' },
    { name: 'Leases List', method: 'GET', path: '/api/leases' },
    { name: 'Vendors List', method: 'GET', path: '/api/vendors' },
    { name: 'Work Orders List', method: 'GET', path: '/api/work-orders' },

    // Accounting
    { name: 'Chart of Accounts', method: 'GET', path: '/api/chart-of-accounts' },
    { name: 'Ledger Entries', method: 'GET', path: '/api/ledger' },
    { name: 'Scheduled Charges', method: 'GET', path: '/api/scheduled-charges' },
    { name: 'Monthly Revenue Summary', method: 'GET', path: '/api/scheduled-charges?summary=true' },
    { name: 'Pending Charges', method: 'GET', path: '/api/scheduled-charges/pending' },
    { name: 'Balances', method: 'GET', path: '/api/balances' },
    { name: 'Expenses', method: 'GET', path: '/api/expenses' },

    // Reports
    { name: 'Tenant Balances Report', method: 'GET', path: '/api/reports/tenant-balances' },
    { name: 'Income Breakdown', method: 'GET', path: '/api/reports/income-breakdown' },
    { name: 'Profit & Loss', method: 'GET', path: '/api/reports/profit-loss' },
    // Note: /api/reports/transactions requires accountCode param, not tested here
    // Note: /api/documents requires leaseId param, not tested here

    // Documents
    { name: 'Document Library', method: 'GET', path: '/api/library' },
    { name: 'Templates List', method: 'GET', path: '/api/templates' },

    // Rent Management
    { name: 'Rent Increases', method: 'GET', path: '/api/rent-increases' },
    { name: 'Pending Rent Increases', method: 'GET', path: '/api/rent-increases/pending' },

    // Admin & System
    { name: 'Health Check', method: 'GET', path: '/api/admin/health' },
    { name: 'Statistics', method: 'GET', path: '/api/admin/stats' },
    { name: 'Upcoming Events', method: 'GET', path: '/api/admin/upcoming' },
    { name: 'Cron Status', method: 'GET', path: '/api/cron/status' },
    { name: 'Cron Logs', method: 'GET', path: '/api/cron/logs' },
  ];

  const results: {
    name: string;
    path: string;
    status: 'ok' | 'error';
    httpStatus: number;
    responseTime: number;
    error?: string;
  }[] = [];

  for (const endpoint of endpoints) {
    const startTime = Date.now();
    try {
      const res = await fetch(`${baseUrl}${endpoint.path}`, {
        method: endpoint.method,
        headers: { 'Content-Type': 'application/json' }
      });

      const responseTime = Date.now() - startTime;

      results.push({
        name: endpoint.name,
        path: endpoint.path,
        status: res.ok ? 'ok' : 'error',
        httpStatus: res.status,
        responseTime,
        error: res.ok ? undefined : `HTTP ${res.status}`
      });
    } catch (error: any) {
      results.push({
        name: endpoint.name,
        path: endpoint.path,
        status: 'error',
        httpStatus: 0,
        responseTime: Date.now() - startTime,
        error: error.message
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
