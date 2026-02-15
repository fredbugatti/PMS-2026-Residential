'use client';

import React, { useState, useEffect, ReactNode } from 'react';
import Link from 'next/link';
import { BarChart3, Calendar, Search, Plug, Settings, Database, DollarSign, FileText, Wrench, AlertTriangle } from 'lucide-react';

interface HealthCheck {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: any;
}

interface ApiTest {
  name: string;
  path: string;
  status: 'ok' | 'error';
  httpStatus: number;
  responseTime: number;
  error?: string;
}

interface IntegrityCheck {
  name: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  details?: any;
}

interface UpcomingCharge {
  id: string;
  chargeDay: number;
  willPostOn: string;
  alreadyDue: boolean;
  description: string;
  amount: number;
  tenant: string;
  unit: string;
  property: string;
}

interface ExpiringLease {
  id: string;
  tenant: string;
  unit: string;
  property: string;
  endDate: string;
  daysUntilExpiry: number;
  monthlyRent: number;
  urgency: 'high' | 'medium' | 'low';
}

interface OpenWorkOrder {
  id: string;
  title: string;
  status: string;
  priority: string;
  unit: string;
  property: string;
  vendor: string;
  daysSinceCreated: number;
}

interface TenantBalance {
  leaseId: string;
  tenantName: string;
  balance: number;
}

interface CronLog {
  id: string;
  createdAt: string;
  jobName: string;
  status: string;
  chargesPosted: number;
  chargesSkipped: number;
  chargesErrored: number;
  totalAmount: number;
  duration: number | null;
  errorMessage: string | null;
  details: any;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'upcoming' | 'integrity' | 'apis' | 'cron' | 'data'>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [health, setHealth] = useState<{ status: string; checks: HealthCheck[] } | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [apiTests, setApiTests] = useState<{ summary: any; results: ApiTest[] } | null>(null);
  const [integrity, setIntegrity] = useState<{ summary: any; checks: IntegrityCheck[] } | null>(null);
  const [upcoming, setUpcoming] = useState<any>(null);
  const [cronLogs, setCronLogs] = useState<CronLog[]>([]);

  // Action states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [resetting, setResetting] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetResult, setResetResult] = useState<any>(null);
  const [runningApiTests, setRunningApiTests] = useState(false);
  const [runningIntegrity, setRunningIntegrity] = useState(false);

  const fetchAllData = async () => {
    try {
      const [healthRes, statsRes, cronRes, upcomingRes] = await Promise.all([
        fetch('/api/admin/health'),
        fetch('/api/admin/stats'),
        fetch('/api/cron/logs?limit=10'),
        fetch('/api/admin/upcoming')
      ]);

      if (healthRes.ok) setHealth(await healthRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
      if (cronRes.ok) setCronLogs((await cronRes.json()).logs || []);
      if (upcomingRes.ok) setUpcoming(await upcomingRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const refresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const runApiTests = async () => {
    setRunningApiTests(true);
    setApiTests(null);
    try {
      const res = await fetch('/api/admin/test-apis');
      if (res.ok) setApiTests(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setRunningApiTests(false);
    }
  };

  const runIntegrityChecks = async () => {
    setRunningIntegrity(true);
    setIntegrity(null);
    try {
      const res = await fetch('/api/admin/integrity');
      if (res.ok) setIntegrity(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setRunningIntegrity(false);
    }
  };

  const runManualCron = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/run-cron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'daily-charges' })
      });
      setTestResult(await res.json());
      fetchAllData();
    } catch (error: any) {
      setTestResult({ error: error.message });
    } finally {
      setTesting(false);
    }
  };

  const resetTestData = async () => {
    if (resetConfirm !== 'RESET') return;
    setResetting(true);
    setResetResult(null);
    try {
      const res = await fetch('/api/admin/reset-test-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'RESET' })
      });
      setResetResult(await res.json());
      setResetConfirm('');
      fetchAllData();
    } catch (error: any) {
      setResetResult({ error: error.message });
    } finally {
      setResetting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok': case 'SUCCESS': return '✓';
      case 'warning': case 'PARTIAL': return '⚠';
      case 'error': case 'FAILED': return '✗';
      default: return '○';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'ok': case 'SUCCESS': case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': case 'PARTIAL': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error': case 'FAILED': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();
  const formatCurrency = (amount: number) => `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 sm:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading system status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-3 md:py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">System Admin</h1>
              <p className="text-sm text-slate-500">Complete system monitoring and control</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={refresh}
                disabled={refreshing}
                className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-2"
              >
                {refreshing ? (
                  <span className="animate-spin">↻</span>
                ) : (
                  <span>↻</span>
                )}
                Refresh
              </button>
              <Link href="/" className="text-blue-600 hover:underline text-sm">
                ← Dashboard
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-4 flex gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
              { id: 'upcoming', label: 'Upcoming', icon: <Calendar className="h-4 w-4" /> },
              { id: 'integrity', label: 'Data Integrity', icon: <Search className="h-4 w-4" /> },
              { id: 'apis', label: 'API Tests', icon: <Plug className="h-4 w-4" /> },
              { id: 'cron', label: 'Automation', icon: <Settings className="h-4 w-4" /> },
              { id: 'data', label: 'Test Data', icon: <Database className="h-4 w-4" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Quick Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
              <div className={`p-4 rounded-lg border-2 ${health?.status === 'ok' ? 'bg-green-50 border-green-300' : health?.status === 'warning' ? 'bg-yellow-50 border-yellow-300' : 'bg-red-50 border-red-300'}`}>
                <div className="text-3xl mb-1">{getStatusIcon(health?.status || '')}</div>
                <div className="font-semibold">System Health</div>
                <div className="text-sm text-slate-600">{health?.checks.filter(c => c.status === 'ok').length}/{health?.checks.length} checks passed</div>
              </div>

              <div className={`p-4 rounded-lg border-2 ${(upcoming?.charges.dueNow.count || 0) > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
                <DollarSign className="h-8 w-8 mb-1" />
                <div className="font-semibold">Pending Charges</div>
                <div className="text-sm text-slate-600">{upcoming?.charges.dueNow.count || 0} due now ({formatCurrency(upcoming?.charges.dueNow.amount || 0)})</div>
              </div>

              <div className={`p-4 rounded-lg border-2 ${(upcoming?.leases.expiringIn30Days || 0) > 0 ? 'bg-orange-50 border-orange-300' : 'bg-green-50 border-green-300'}`}>
                <FileText className="h-8 w-8 mb-1" />
                <div className="font-semibold">Expiring Leases</div>
                <div className="text-sm text-slate-600">{upcoming?.leases.expiringIn30Days || 0} in 30 days, {upcoming?.leases.expiringSoon || 0} in 90 days</div>
              </div>

              <div className={`p-4 rounded-lg border-2 ${(upcoming?.workOrders.highPriority || 0) > 0 ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}>
                <Wrench className="h-8 w-8 mb-1" />
                <div className="font-semibold">Open Work Orders</div>
                <div className="text-sm text-slate-600">{upcoming?.workOrders.open || 0} open, {upcoming?.workOrders.highPriority || 0} high priority</div>
              </div>
            </div>

            {/* Stats Grid */}
            {stats && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Database Statistics</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-4">
                  {[
                    { label: 'Properties', value: stats.counts.properties },
                    { label: 'Units', value: stats.counts.units },
                    { label: 'Active Leases', value: stats.breakdowns.leasesByStatus['ACTIVE'] || 0 },
                    { label: 'Tenants', value: stats.counts.tenants },
                    { label: 'Vendors', value: stats.counts.vendors },
                    { label: 'Work Orders', value: stats.counts.workOrders },
                    { label: 'Scheduled Charges', value: stats.counts.scheduledCharges },
                    { label: 'Ledger Entries', value: stats.counts.ledgerEntries },
                    { label: 'Documents', value: stats.counts.documents },
                    { label: 'Monthly Revenue', value: formatCurrency(stats.financial.monthlyRevenue) },
                  ].map(stat => (
                    <div key={stat.label} className="text-center p-3 bg-slate-50 rounded">
                      <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
                      <div className="text-xs text-slate-500">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Health Checks */}
            {health && (
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b flex justify-between items-center">
                  <h2 className="text-lg font-semibold">Health Checks</h2>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBg(health.status)}`}>
                    {health.status.toUpperCase()}
                  </span>
                </div>
                <div className="divide-y">
                  {health.checks.map((check, i) => (
                    <div key={i} className="p-3 flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${getStatusBg(check.status)}`}>
                        {getStatusIcon(check.status)}
                      </span>
                      <div className="flex-1">
                        <span className="font-medium">{check.name}</span>
                        <span className="text-slate-500 text-sm ml-2">— {check.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* UPCOMING TAB */}
        {activeTab === 'upcoming' && upcoming && (
          <div className="space-y-6">
            {/* Charges Due */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Charges Due This Month</h2>
                <p className="text-sm text-slate-500">Day {upcoming.currentDay} of the month • {upcoming.charges.pendingThisMonth} charges pending • {formatCurrency(upcoming.charges.totalAmount)} total</p>
              </div>

              {upcoming.charges.dueNow.count > 0 && (
                <div className="p-4 bg-yellow-50 border-b">
                  <h3 className="font-medium text-yellow-800 mb-2">{upcoming.charges.dueNow.count} charges ready to post ({formatCurrency(upcoming.charges.dueNow.amount)})</h3>
                  <div className="space-y-1 text-sm">
                    {upcoming.charges.dueNow.items.slice(0, 5).map((c: UpcomingCharge) => (
                      <div key={c.id} className="flex justify-between">
                        <span>{c.tenant} - {c.description} ({c.unit})</span>
                        <span className="font-medium">{formatCurrency(c.amount)}</span>
                      </div>
                    ))}
                    {upcoming.charges.dueNow.items.length > 5 && (
                      <div className="text-slate-500">...and {upcoming.charges.dueNow.items.length - 5} more</div>
                    )}
                  </div>
                </div>
              )}

              {upcoming.charges.upcoming.count > 0 && (
                <div className="p-4">
                  <h3 className="font-medium mb-2">Upcoming charges ({upcoming.charges.upcoming.count})</h3>
                  <div className="space-y-1 text-sm">
                    {upcoming.charges.upcoming.items.slice(0, 10).map((c: UpcomingCharge) => (
                      <div key={c.id} className="flex justify-between text-slate-600">
                        <span>Day {c.chargeDay}: {c.tenant} - {c.description}</span>
                        <span>{formatCurrency(c.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {upcoming.charges.pendingThisMonth === 0 && (
                <div className="p-8 text-center text-slate-500">
                  All charges for this month have been posted ✓
                </div>
              )}
            </div>

            {/* Expiring Leases */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Leases Expiring Soon</h2>
                <p className="text-sm text-slate-500">{upcoming.leases.expiringSoon} leases expiring in next 90 days</p>
              </div>
              {upcoming.leases.items.length > 0 ? (
                <div className="divide-y">
                  {upcoming.leases.items.map((lease: ExpiringLease) => (
                    <div key={lease.id} className={`p-4 flex items-center justify-between ${
                      lease.urgency === 'high' ? 'bg-red-50' :
                      lease.urgency === 'medium' ? 'bg-yellow-50' : ''
                    }`}>
                      <div>
                        <div className="font-medium">{lease.tenant}</div>
                        <div className="text-sm text-slate-500">{lease.property} - Unit {lease.unit}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-medium ${
                          lease.urgency === 'high' ? 'text-red-600' :
                          lease.urgency === 'medium' ? 'text-yellow-600' : 'text-slate-600'
                        }`}>
                          {lease.daysUntilExpiry} days
                        </div>
                        <div className="text-sm text-slate-500">{formatCurrency(lease.monthlyRent)}/mo</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  No leases expiring in the next 90 days ✓
                </div>
              )}
            </div>

            {/* Open Work Orders */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Open Work Orders</h2>
                <p className="text-sm text-slate-500">{upcoming.workOrders.open} open, {upcoming.workOrders.highPriority} high priority</p>
              </div>
              {upcoming.workOrders.items.length > 0 ? (
                <div className="divide-y">
                  {upcoming.workOrders.items.map((wo: OpenWorkOrder) => (
                    <div key={wo.id} className={`p-4 flex items-center justify-between ${
                      wo.priority === 'EMERGENCY' || wo.priority === 'HIGH' ? 'bg-red-50' : ''
                    }`}>
                      <div>
                        <div className="font-medium">{wo.title}</div>
                        <div className="text-sm text-slate-500">{wo.property} - Unit {wo.unit} • {wo.vendor || 'No vendor'}</div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          wo.priority === 'EMERGENCY' ? 'bg-red-100 text-red-800' :
                          wo.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          wo.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {wo.priority}
                        </span>
                        <div className="text-sm text-slate-500 mt-1">{wo.daysSinceCreated} days old</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  No open work orders ✓
                </div>
              )}
            </div>

            {/* Outstanding Balances */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Outstanding Tenant Balances</h2>
                <p className="text-sm text-slate-500">{upcoming.receivables.tenantsWithBalance} tenants with balance • {formatCurrency(upcoming.receivables.totalOutstanding)} total</p>
              </div>
              {upcoming.receivables.items.length > 0 ? (
                <div className="divide-y">
                  {upcoming.receivables.items.map((t: TenantBalance) => (
                    <div key={t.leaseId} className="p-4 flex items-center justify-between">
                      <div className="font-medium">{t.tenantName}</div>
                      <div className="font-medium text-red-600">{formatCurrency(t.balance)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">
                  No outstanding balances ✓
                </div>
              )}
            </div>
          </div>
        )}

        {/* INTEGRITY TAB */}
        {activeTab === 'integrity' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">Data Integrity Checks</h2>
                  <p className="text-sm text-slate-500">Verify database relationships and business rules</p>
                </div>
                <button
                  onClick={runIntegrityChecks}
                  disabled={runningIntegrity}
                  className={`px-4 py-2 rounded font-medium ${
                    runningIntegrity
                      ? 'bg-slate-300 text-slate-500'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {runningIntegrity ? 'Running...' : 'Run Integrity Checks'}
                </button>
              </div>

              {integrity && (
                <div className="mt-4">
                  <div className={`p-4 rounded-lg mb-4 ${getStatusBg(integrity.summary.status)}`}>
                    <div className="font-semibold">
                      {integrity.summary.status === 'ok' ? '✓ All integrity checks passed' :
                       integrity.summary.status === 'warning' ? '⚠ Some warnings detected' :
                       '✗ Integrity issues found'}
                    </div>
                    <div className="text-sm mt-1">
                      {integrity.summary.passed} passed • {integrity.summary.warnings} warnings • {integrity.summary.errors} errors
                    </div>
                  </div>

                  <div className="space-y-2">
                    {integrity.checks.map((check, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${getStatusBg(check.status)}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getStatusIcon(check.status)}</span>
                          <span className="font-medium">{check.name}</span>
                        </div>
                        <div className="text-sm mt-1 ml-7">{check.message}</div>
                        {check.details && check.status !== 'ok' && (
                          <div className="text-xs mt-2 ml-7 p-2 bg-white bg-opacity-50 rounded">
                            <pre className="whitespace-pre-wrap">{JSON.stringify(check.details, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!integrity && !runningIntegrity && (
                <div className="text-center text-slate-500 py-8">
                  Click "Run Integrity Checks" to verify database integrity
                </div>
              )}
            </div>
          </div>
        )}

        {/* APIS TAB */}
        {activeTab === 'apis' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold">API Endpoint Tests</h2>
                  <p className="text-sm text-slate-500">Test all API routes are responding correctly</p>
                </div>
                <button
                  onClick={runApiTests}
                  disabled={runningApiTests}
                  className={`px-4 py-2 rounded font-medium ${
                    runningApiTests
                      ? 'bg-slate-300 text-slate-500'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {runningApiTests ? 'Testing...' : 'Run API Tests'}
                </button>
              </div>

              {apiTests && (
                <div className="mt-4">
                  <div className={`p-4 rounded-lg mb-4 ${apiTests.summary.failed === 0 ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200'}`}>
                    <div className="font-semibold">
                      {apiTests.summary.failed === 0 ? '✓ All API tests passed' : `✗ ${apiTests.summary.failed} API tests failed`}
                    </div>
                    <div className="text-sm mt-1">
                      {apiTests.summary.passed}/{apiTests.summary.total} passed • Avg response: {apiTests.summary.avgResponseTime}ms
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="py-2 px-2">Status</th>
                          <th className="py-2 px-2">Endpoint</th>
                          <th className="py-2 px-2">Path</th>
                          <th className="py-2 px-2 text-right">Response</th>
                          <th className="py-2 px-2 text-right">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {apiTests.results.map((test, i) => (
                          <tr key={i} className={`border-b ${test.status === 'error' ? 'bg-red-50' : ''}`}>
                            <td className="py-2 px-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBg(test.status)}`}>
                                {test.status === 'ok' ? '✓' : '✗'}
                              </span>
                            </td>
                            <td className="py-2 px-2 font-medium">{test.name}</td>
                            <td className="py-2 px-2 text-slate-500 font-mono text-xs">{test.path}</td>
                            <td className="py-2 px-2 text-right">{test.httpStatus || 'ERR'}</td>
                            <td className="py-2 px-2 text-right">{test.responseTime}ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {!apiTests && !runningApiTests && (
                <div className="text-center text-slate-500 py-8">
                  Click "Run API Tests" to test all endpoints
                </div>
              )}
            </div>
          </div>
        )}

        {/* CRON TAB */}
        {activeTab === 'cron' && (
          <div className="space-y-6">
            {/* How It Works */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h2 className="text-lg font-semibold text-blue-900 mb-3">How Automated Charges Work</h2>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <strong>Schedule:</strong> Daily at 6 AM UTC via Vercel Cron
                </div>
                <div>
                  <strong>Logic:</strong> Posts charges where chargeDay ≤ today
                </div>
                <div>
                  <strong>Safety:</strong> Skips if lastChargedDate is this month
                </div>
                <div>
                  <strong>Backup:</strong> Dashboard shows warning if cron fails
                </div>
              </div>
            </div>

            {/* Current Status */}
            {upcoming && (
              <div className={`p-6 rounded-lg border-2 ${
                upcoming.charges.dueNow.count > 0 ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'
              }`}>
                <h3 className="font-semibold mb-2">Current Status</h3>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-2xl font-bold">{upcoming.charges.dueNow.count}</div>
                    <div className="text-sm text-slate-600">Charges ready to post</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{formatCurrency(upcoming.charges.dueNow.amount)}</div>
                    <div className="text-sm text-slate-600">Amount pending</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{upcoming.cron.lastRun ? formatDate(upcoming.cron.lastRun.time) : 'Never'}</div>
                    <div className="text-sm text-slate-600">Last cron run</div>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Run */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Manual Test</h2>
              <button
                onClick={runManualCron}
                disabled={testing}
                className={`px-4 py-2 rounded font-medium ${
                  testing ? 'bg-slate-300 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {testing ? 'Running...' : 'Run Daily Charges Now'}
              </button>

              {testResult && (
                <div className={`mt-4 p-4 rounded-lg ${testResult.error ? 'bg-red-50' : 'bg-green-50'}`}>
                  {testResult.error ? (
                    <p className="text-red-600">{testResult.error}</p>
                  ) : (
                    <div>
                      <p className="font-medium text-green-700">Status: {testResult.status}</p>
                      {testResult.summary && (
                        <div className="text-sm mt-2 grid grid-cols-4 gap-2">
                          <div>Total: {testResult.summary.total}</div>
                          <div>Posted: {testResult.summary.posted}</div>
                          <div>Skipped: {testResult.summary.skipped}</div>
                          <div>Errors: {testResult.summary.errors}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Execution History */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">Execution History</h2>
              </div>
              {cronLogs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left bg-slate-50">
                        <th className="py-2 px-3">Date/Time</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3 text-right">Posted</th>
                        <th className="py-2 px-3 text-right">Skipped</th>
                        <th className="py-2 px-3 text-right">Errors</th>
                        <th className="py-2 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cronLogs.map(log => (
                        <tr key={log.id} className="border-b">
                          <td className="py-2 px-3">{formatDate(log.createdAt)}</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusBg(log.status)}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">{log.chargesPosted}</td>
                          <td className="py-2 px-3 text-right">{log.chargesSkipped}</td>
                          <td className="py-2 px-3 text-right">{log.chargesErrored}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(log.totalAmount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500">No cron runs recorded yet</div>
              )}
            </div>
          </div>
        )}

        {/* DATA TAB */}
        {activeTab === 'data' && (
          <div className="space-y-6">
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-800">Warning: Destructive Action</p>
                  <p className="text-sm text-yellow-700">
                    These actions will DELETE all properties, units, leases, tenants, vendors, work orders, and transactions.
                  </p>
                </div>
              </div>
            </div>

            {stats && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4">Current Data</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 text-sm">
                  <div>Properties: <strong>{stats.counts.properties}</strong></div>
                  <div>Units: <strong>{stats.counts.units}</strong></div>
                  <div>Leases: <strong>{stats.counts.leases}</strong></div>
                  <div>Tenants: <strong>{stats.counts.tenants}</strong></div>
                  <div>Vendors: <strong>{stats.counts.vendors}</strong></div>
                  <div>Work Orders: <strong>{stats.counts.workOrders}</strong></div>
                  <div>Ledger Entries: <strong>{stats.counts.ledgerEntries}</strong></div>
                  <div>Documents: <strong>{stats.counts.documents}</strong></div>
                </div>
              </div>
            )}

            {/* Option 1: Simple Test Data */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-2">Option 1: Simple Test Data</h2>
              <p className="text-slate-600 mb-4">Creates minimal test data: 1 property, 1 unit, 1 tenant/lease, 1 vendor, 1 work order. Good for reviewing each feature.</p>
              <button
                onClick={async () => {
                  setResetting(true);
                  setResetResult(null);
                  try {
                    const res = await fetch('/api/admin/reset-test-data', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ confirm: 'RESET', mode: 'simple' })
                    });
                    setResetResult(await res.json());
                    fetchAllData();
                  } catch (error: any) {
                    setResetResult({ error: error.message });
                  } finally {
                    setResetting(false);
                  }
                }}
                disabled={resetting}
                className={`px-4 py-2 rounded font-medium ${
                  resetting ? 'bg-slate-300 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {resetting ? 'Working...' : 'Load Simple Test Data'}
              </button>
            </div>

            {/* Option 2: Full Test Data */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-2">Option 2: Full Test Data</h2>
              <p className="text-slate-600 mb-4">Creates comprehensive test data: 3 properties, 11 units, 8 tenants/leases, 5 vendors, 4 work orders.</p>
              <button
                onClick={async () => {
                  setResetting(true);
                  setResetResult(null);
                  try {
                    const res = await fetch('/api/admin/reset-test-data', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ confirm: 'RESET', mode: 'full' })
                    });
                    setResetResult(await res.json());
                    fetchAllData();
                  } catch (error: any) {
                    setResetResult({ error: error.message });
                  } finally {
                    setResetting(false);
                  }
                }}
                disabled={resetting}
                className={`px-4 py-2 rounded font-medium ${
                  resetting ? 'bg-slate-300 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {resetting ? 'Working...' : 'Load Full Test Data'}
              </button>
            </div>

            {/* Option 3: Clear All */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-2">Option 3: Clear All Data</h2>
              <p className="text-slate-600 mb-4">Deletes everything so you can start fresh and create your own data from scratch.</p>
              <button
                onClick={async () => {
                  setResetting(true);
                  setResetResult(null);
                  try {
                    const res = await fetch('/api/admin/reset-test-data', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ confirm: 'CLEAR' })
                    });
                    setResetResult(await res.json());
                    fetchAllData();
                  } catch (error: any) {
                    setResetResult({ error: error.message });
                  } finally {
                    setResetting(false);
                  }
                }}
                disabled={resetting}
                className={`px-4 py-2 rounded font-medium ${
                  resetting ? 'bg-slate-300 text-slate-500' : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {resetting ? 'Working...' : 'Clear All Data'}
              </button>
            </div>

            {resetResult && (
              <div className={`p-4 rounded-lg ${resetResult.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                {resetResult.error ? (
                  <p className="text-red-600">{resetResult.error}</p>
                ) : (
                  <div>
                    <p className="font-medium text-green-700">✓ {resetResult.message}</p>
                    {resetResult.created && (
                      <div className="text-sm text-green-600 mt-2 grid grid-cols-3 md:grid-cols-6 gap-2">
                        <div>Properties: {resetResult.created.properties}</div>
                        <div>Units: {resetResult.created.units}</div>
                        <div>Leases: {resetResult.created.leases}</div>
                        <div>Charges: {resetResult.created.scheduledCharges}</div>
                        <div>Vendors: {resetResult.created.vendors}</div>
                        <div>Work Orders: {resetResult.created.workOrders}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
