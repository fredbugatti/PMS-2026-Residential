'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PortfolioReport {
  generatedAt: string;
  portfolioOverview: {
    totalProperties: number;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    overallOccupancyRate: number;
    totalActiveLeases: number;
    totalTenants: number;
    monthlyRentRoll: number;
    annualRentRoll: number;
  };
  properties: Array<{
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    type: string;
    totalUnits: number;
    occupiedUnits: number;
    vacantUnits: number;
    occupancyRate: string;
    activeLeases: number;
    totalPotentialRent: number;
  }>;
  leases: {
    total: number;
    active: number;
    pending: number;
    ended: number;
    expiringIn30Days: number;
    expiringIn60Days: number;
    expiringIn90Days: number;
    expiringLeases: Array<{
      id: string;
      tenantName: string;
      propertyName: string;
      unitName: string;
      endDate: string;
      daysRemaining: number | null;
    }>;
  };
  tenants: Array<{
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    property: string;
    unit: string;
    leaseStart: string;
    leaseEnd: string | null;
  }>;
  financial: {
    cashBalance: number;
    totalAR: number;
    securityDepositsHeld: number;
    totalIncome: number;
    totalExpenses: number;
    netOperatingIncome: number;
    arAging: {
      current: number;
      days31to60: number;
      days61to90: number;
      over90: number;
    };
    tenantBalances: Array<{
      leaseId: string;
      tenantName: string;
      propertyName: string;
      unitName: string;
      balance: number;
    }>;
  };
  rentRoll: Array<{
    leaseId: string;
    tenantName: string;
    propertyName: string;
    unitName: string;
    monthlyRent: number;
    otherCharges: Array<{ description: string; amount: number }>;
    totalMonthly: number;
  }>;
  workOrders: {
    total: number;
    open: number;
    inProgress: number;
    completed: number;
    highPriorityOpen: number;
    totalEstimatedCosts: number;
    totalActualCosts: number;
    byCategory: { [key: string]: number };
    openWorkOrders: Array<{
      id: string;
      status: string;
      priority: string;
      category: string;
      estimatedCost: number | null;
      createdAt: string;
    }>;
  };
  vendors: {
    total: number;
    list: Array<{
      id: string;
      name: string;
      specialties: string[];
      email: string | null;
      phone: string | null;
      workOrderCount: number;
    }>;
  };
  moveOut: {
    pendingInspections: number;
    completedInspections: number;
    totalDepositsToReturn: number;
    totalDeductionsProcessed: number;
    securityDepositsHeld: number;
    pendingList: Array<{
      inspectionId: string;
      leaseId: string;
      tenantName: string;
      status: string;
      depositHeld: number;
      totalDeductions: number;
      amountToReturn: number;
    }>;
  };
  documents: {
    totalDocuments: number;
  };
  recentActivity: {
    payments: Array<{
      id: string;
      date: string;
      amount: number;
      description: string;
      tenantName: string;
    }>;
    charges: Array<{
      id: string;
      date: string;
      amount: number;
      description: string;
      tenantName: string;
    }>;
    emailsSent: number;
    emailsByType: { [key: string]: number };
  };
}

export default function PortfolioOverviewPage() {
  const [report, setReport] = useState<PortfolioReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<string>('overview');

  useEffect(() => {
    fetchReport();
  }, []);

  async function fetchReport() {
    try {
      setLoading(true);
      const res = await fetch('/api/reports/portfolio-overview');
      if (!res.ok) throw new Error('Failed to fetch report');
      const data = await res.json();
      setReport(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading portfolio report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">Error: {error}</p>
          <button onClick={fetchReport} className="mt-2 text-red-600 underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const sections = [
    { id: 'overview', label: 'Overview' },
    { id: 'properties', label: 'Properties' },
    { id: 'leases', label: 'Leases' },
    { id: 'tenants', label: 'Tenants' },
    { id: 'financial', label: 'Financial' },
    { id: 'rentroll', label: 'Rent Roll' },
    { id: 'workorders', label: 'Work Orders' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'moveout', label: 'Move-Out' },
    { id: 'activity', label: 'Activity' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Master Portfolio Report</h1>
              <p className="text-sm text-gray-500">
                Generated: {formatDate(report.generatedAt)} at{' '}
                {new Date(report.generatedAt).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={fetchReport}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Refresh
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                Print
              </button>
            </div>
          </div>

          {/* Section Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto pb-2">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                  activeSection === section.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Properties</p>
                <p className="text-2xl font-bold">{report.portfolioOverview.totalProperties}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Units</p>
                <p className="text-2xl font-bold">{report.portfolioOverview.totalUnits}</p>
                <p className="text-xs text-gray-400">
                  {report.portfolioOverview.occupiedUnits} occupied / {report.portfolioOverview.vacantUnits} vacant
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Occupancy Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {report.portfolioOverview.overallOccupancyRate}%
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Active Leases</p>
                <p className="text-2xl font-bold">{report.portfolioOverview.totalActiveLeases}</p>
              </div>
            </div>

            {/* Financial Highlights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Monthly Rent Roll</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(report.portfolioOverview.monthlyRentRoll)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Cash Balance</p>
                <p className="text-xl font-bold">{formatCurrency(report.financial.cashBalance)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Outstanding AR</p>
                <p className={`text-xl font-bold ${report.financial.totalAR > 0 ? 'text-red-600' : ''}`}>
                  {formatCurrency(report.financial.totalAR)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Net Operating Income</p>
                <p className={`text-xl font-bold ${report.financial.netOperatingIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.financial.netOperatingIncome)}
                </p>
              </div>
            </div>

            {/* Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.leases.expiringIn30Days > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="font-medium text-yellow-800">Leases Expiring Soon</p>
                  <p className="text-2xl font-bold text-yellow-700">{report.leases.expiringIn30Days}</p>
                  <p className="text-sm text-yellow-600">within 30 days</p>
                </div>
              )}
              {report.workOrders.highPriorityOpen > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-medium text-red-800">High Priority Work Orders</p>
                  <p className="text-2xl font-bold text-red-700">{report.workOrders.highPriorityOpen}</p>
                  <p className="text-sm text-red-600">need attention</p>
                </div>
              )}
              {report.moveOut.pendingInspections > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="font-medium text-orange-800">Pending Move-Outs</p>
                  <p className="text-2xl font-bold text-orange-700">{report.moveOut.pendingInspections}</p>
                  <p className="text-sm text-orange-600">inspections in progress</p>
                </div>
              )}
            </div>

            {/* Summary Counts */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Portfolio Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Total Vendors</p>
                  <p className="font-medium">{report.vendors.total}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Work Orders</p>
                  <p className="font-medium">{report.workOrders.total}</p>
                </div>
                <div>
                  <p className="text-gray-500">Security Deposits Held</p>
                  <p className="font-medium">{formatCurrency(report.moveOut.securityDepositsHeld)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Documents</p>
                  <p className="font-medium">{report.documents.totalDocuments}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Properties Section */}
        {activeSection === 'properties' && (
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">All Properties ({report.properties.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Property</th>
                    <th className="text-left p-3">Address</th>
                    <th className="text-left p-3">Type</th>
                    <th className="text-right p-3">Units</th>
                    <th className="text-right p-3">Occupied</th>
                    <th className="text-right p-3">Occupancy</th>
                    <th className="text-right p-3">Potential Rent</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.properties.map(p => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{p.name}</td>
                      <td className="p-3 text-gray-600">{p.address}, {p.city}, {p.state}</td>
                      <td className="p-3">{p.type}</td>
                      <td className="p-3 text-right">{p.totalUnits}</td>
                      <td className="p-3 text-right">{p.occupiedUnits}</td>
                      <td className="p-3 text-right">
                        <span className={parseFloat(p.occupancyRate) >= 90 ? 'text-green-600' : parseFloat(p.occupancyRate) >= 70 ? 'text-yellow-600' : 'text-red-600'}>
                          {p.occupancyRate}%
                        </span>
                      </td>
                      <td className="p-3 text-right">{formatCurrency(p.totalPotentialRent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Leases Section */}
        {activeSection === 'leases' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Total Leases</p>
                <p className="text-2xl font-bold">{report.leases.total}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-600">Active</p>
                <p className="text-2xl font-bold text-green-700">{report.leases.active}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <p className="text-sm text-yellow-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-700">{report.leases.pending}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Ended</p>
                <p className="text-2xl font-bold text-gray-600">{report.leases.ended}</p>
              </div>
            </div>

            {/* Expiring Leases */}
            {report.leases.expiringLeases.length > 0 && (
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Leases Expiring Within 90 Days ({report.leases.expiringIn90Days})</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3">Tenant</th>
                        <th className="text-left p-3">Property</th>
                        <th className="text-left p-3">Unit</th>
                        <th className="text-left p-3">End Date</th>
                        <th className="text-right p-3">Days Left</th>
                        <th className="text-right p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.leases.expiringLeases.map(l => (
                        <tr key={l.id} className="hover:bg-gray-50">
                          <td className="p-3 font-medium">{l.tenantName}</td>
                          <td className="p-3">{l.propertyName}</td>
                          <td className="p-3">{l.unitName}</td>
                          <td className="p-3">{formatDate(l.endDate)}</td>
                          <td className="p-3 text-right">
                            <span className={
                              (l.daysRemaining || 0) <= 30 ? 'text-red-600 font-medium' :
                              (l.daysRemaining || 0) <= 60 ? 'text-yellow-600' : 'text-gray-600'
                            }>
                              {l.daysRemaining} days
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Link href={`/leases/${l.id}`} className="text-blue-600 hover:underline">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tenants Section */}
        {activeSection === 'tenants' && (
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">All Active Tenants ({report.tenants.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Tenant Name</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="text-left p-3">Property</th>
                    <th className="text-left p-3">Unit</th>
                    <th className="text-left p-3">Lease Start</th>
                    <th className="text-left p-3">Lease End</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.tenants.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{t.name}</td>
                      <td className="p-3 text-gray-600">{t.email || '-'}</td>
                      <td className="p-3 text-gray-600">{t.phone || '-'}</td>
                      <td className="p-3">{t.property}</td>
                      <td className="p-3">{t.unit}</td>
                      <td className="p-3">{formatDate(t.leaseStart)}</td>
                      <td className="p-3">{t.leaseEnd ? formatDate(t.leaseEnd) : 'Month-to-Month'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Financial Section */}
        {activeSection === 'financial' && (
          <div className="space-y-6">
            {/* Key Financial Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Cash Balance</p>
                <p className="text-2xl font-bold">{formatCurrency(report.financial.cashBalance)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Total Income</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(report.financial.totalIncome)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(report.financial.totalExpenses)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Net Operating Income</p>
                <p className={`text-2xl font-bold ${report.financial.netOperatingIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(report.financial.netOperatingIncome)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Total AR Outstanding</p>
                <p className={`text-2xl font-bold ${report.financial.totalAR > 0 ? 'text-orange-600' : ''}`}>
                  {formatCurrency(report.financial.totalAR)}
                </p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Security Deposits Held</p>
                <p className="text-2xl font-bold">{formatCurrency(report.financial.securityDepositsHeld)}</p>
              </div>
            </div>

            {/* AR Aging */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Accounts Receivable Aging</h2>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Current (0-30)</p>
                  <p className="text-xl font-bold text-green-700">{formatCurrency(report.financial.arAging.current)}</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-600">31-60 Days</p>
                  <p className="text-xl font-bold text-yellow-700">{formatCurrency(report.financial.arAging.days31to60)}</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-orange-600">61-90 Days</p>
                  <p className="text-xl font-bold text-orange-700">{formatCurrency(report.financial.arAging.days61to90)}</p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-600">90+ Days</p>
                  <p className="text-xl font-bold text-red-700">{formatCurrency(report.financial.arAging.over90)}</p>
                </div>
              </div>
            </div>

            {/* Tenant Balances */}
            {report.financial.tenantBalances.length > 0 && (
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Outstanding Tenant Balances</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3">Tenant</th>
                        <th className="text-left p-3">Property</th>
                        <th className="text-left p-3">Unit</th>
                        <th className="text-right p-3">Balance</th>
                        <th className="text-right p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.financial.tenantBalances.map(tb => (
                        <tr key={tb.leaseId} className="hover:bg-gray-50">
                          <td className="p-3 font-medium">{tb.tenantName}</td>
                          <td className="p-3">{tb.propertyName}</td>
                          <td className="p-3">{tb.unitName}</td>
                          <td className={`p-3 text-right font-medium ${tb.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(tb.balance)}
                          </td>
                          <td className="p-3 text-right">
                            <Link href={`/leases/${tb.leaseId}`} className="text-blue-600 hover:underline">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rent Roll Section */}
        {activeSection === 'rentroll' && (
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold">Rent Roll</h2>
                <p className="text-sm text-gray-500">
                  Monthly Total: {formatCurrency(report.portfolioOverview.monthlyRentRoll)} |
                  Annual: {formatCurrency(report.portfolioOverview.annualRentRoll)}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Tenant</th>
                    <th className="text-left p-3">Property</th>
                    <th className="text-left p-3">Unit</th>
                    <th className="text-right p-3">Monthly Rent</th>
                    <th className="text-right p-3">Other Charges</th>
                    <th className="text-right p-3">Total Monthly</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.rentRoll.map(rr => (
                    <tr key={rr.leaseId} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{rr.tenantName}</td>
                      <td className="p-3">{rr.propertyName}</td>
                      <td className="p-3">{rr.unitName}</td>
                      <td className="p-3 text-right">{formatCurrency(rr.monthlyRent)}</td>
                      <td className="p-3 text-right text-gray-500">
                        {rr.otherCharges.length > 0
                          ? formatCurrency(rr.otherCharges.reduce((s, c) => s + c.amount, 0))
                          : '-'}
                      </td>
                      <td className="p-3 text-right font-medium">{formatCurrency(rr.totalMonthly)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                  <tr>
                    <td colSpan={5} className="p-3 text-right">Total Monthly Rent Roll:</td>
                    <td className="p-3 text-right">{formatCurrency(report.portfolioOverview.monthlyRentRoll)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Work Orders Section */}
        {activeSection === 'workorders' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Total Work Orders</p>
                <p className="text-2xl font-bold">{report.workOrders.total}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <p className="text-sm text-yellow-600">Open</p>
                <p className="text-2xl font-bold text-yellow-700">{report.workOrders.open}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-blue-600">In Progress</p>
                <p className="text-2xl font-bold text-blue-700">{report.workOrders.inProgress}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-600">Completed</p>
                <p className="text-2xl font-bold text-green-700">{report.workOrders.completed}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* By Category */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold mb-4">By Category</h3>
                <div className="space-y-2">
                  {Object.entries(report.workOrders.byCategory).map(([cat, count]) => (
                    <div key={cat} className="flex justify-between">
                      <span className="text-gray-600">{cat}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Costs */}
              <div className="bg-white rounded-lg border p-6">
                <h3 className="font-semibold mb-4">Maintenance Costs</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Estimated Total</p>
                    <p className="text-xl font-medium">{formatCurrency(report.workOrders.totalEstimatedCosts)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Actual Total</p>
                    <p className="text-xl font-medium">{formatCurrency(report.workOrders.totalActualCosts)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Open Work Orders */}
            {report.workOrders.openWorkOrders.length > 0 && (
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Open Work Orders</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3">ID</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-left p-3">Priority</th>
                        <th className="text-left p-3">Category</th>
                        <th className="text-right p-3">Est. Cost</th>
                        <th className="text-left p-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.workOrders.openWorkOrders.map(wo => (
                        <tr key={wo.id} className="hover:bg-gray-50">
                          <td className="p-3 font-mono text-xs">{wo.id.slice(0, 8)}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                              {wo.status}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              wo.priority === 'EMERGENCY' || wo.priority === 'HIGH'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {wo.priority}
                            </span>
                          </td>
                          <td className="p-3">{wo.category}</td>
                          <td className="p-3 text-right">
                            {wo.estimatedCost ? formatCurrency(wo.estimatedCost) : '-'}
                          </td>
                          <td className="p-3">{formatDate(wo.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Vendors Section */}
        {activeSection === 'vendors' && (
          <div className="bg-white rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold">All Vendors ({report.vendors.total})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">Vendor Name</th>
                    <th className="text-left p-3">Specialty</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Phone</th>
                    <th className="text-right p-3">Work Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {report.vendors.list.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="p-3 font-medium">{v.name}</td>
                      <td className="p-3">{v.specialties.length > 0 ? v.specialties.join(', ') : '-'}</td>
                      <td className="p-3 text-gray-600">{v.email || '-'}</td>
                      <td className="p-3 text-gray-600">{v.phone || '-'}</td>
                      <td className="p-3 text-right">{v.workOrderCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Move-Out Section */}
        {activeSection === 'moveout' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Pending Inspections</p>
                <p className="text-2xl font-bold text-orange-600">{report.moveOut.pendingInspections}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{report.moveOut.completedInspections}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Deposits to Return</p>
                <p className="text-2xl font-bold">{formatCurrency(report.moveOut.totalDepositsToReturn)}</p>
              </div>
              <div className="bg-white rounded-lg p-4 border">
                <p className="text-sm text-gray-500">Security Deposits Held</p>
                <p className="text-2xl font-bold">{formatCurrency(report.moveOut.securityDepositsHeld)}</p>
              </div>
            </div>

            {report.moveOut.pendingList.length > 0 && (
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Pending Move-Out Inspections</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3">Tenant</th>
                        <th className="text-left p-3">Status</th>
                        <th className="text-right p-3">Deposit Held</th>
                        <th className="text-right p-3">Deductions</th>
                        <th className="text-right p-3">To Return</th>
                        <th className="text-right p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.moveOut.pendingList.map(m => (
                        <tr key={m.inspectionId} className="hover:bg-gray-50">
                          <td className="p-3 font-medium">{m.tenantName}</td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800">
                              {m.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-right">{formatCurrency(m.depositHeld)}</td>
                          <td className="p-3 text-right text-red-600">{formatCurrency(m.totalDeductions)}</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(m.amountToReturn)}</td>
                          <td className="p-3 text-right">
                            <Link href={`/leases/${m.leaseId}/move-out`} className="text-blue-600 hover:underline">
                              Continue
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Activity Section */}
        {activeSection === 'activity' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Recent Payments */}
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Recent Payments (Last 30 Days)</h2>
                </div>
                <div className="divide-y max-h-96 overflow-y-auto">
                  {report.recentActivity.payments.map(p => (
                    <div key={p.id} className="p-3 hover:bg-gray-50">
                      <div className="flex justify-between">
                        <span className="font-medium">{p.tenantName}</span>
                        <span className="text-green-600 font-medium">{formatCurrency(p.amount)}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {p.description} - {formatDate(p.date)}
                      </div>
                    </div>
                  ))}
                  {report.recentActivity.payments.length === 0 && (
                    <div className="p-4 text-gray-500 text-center">No recent payments</div>
                  )}
                </div>
              </div>

              {/* Recent Charges */}
              <div className="bg-white rounded-lg border">
                <div className="p-4 border-b">
                  <h2 className="text-lg font-semibold">Recent Charges (Last 30 Days)</h2>
                </div>
                <div className="divide-y max-h-96 overflow-y-auto">
                  {report.recentActivity.charges.map(c => (
                    <div key={c.id} className="p-3 hover:bg-gray-50">
                      <div className="flex justify-between">
                        <span className="font-medium">{c.tenantName}</span>
                        <span className="text-red-600 font-medium">{formatCurrency(c.amount)}</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {c.description} - {formatDate(c.date)}
                      </div>
                    </div>
                  ))}
                  {report.recentActivity.charges.length === 0 && (
                    <div className="p-4 text-gray-500 text-center">No recent charges</div>
                  )}
                </div>
              </div>
            </div>

            {/* Email Activity */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Email Activity (Last 30 Days)</h2>
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-3xl font-bold">{report.recentActivity.emailsSent}</p>
                  <p className="text-sm text-gray-500">Emails Sent</p>
                </div>
                <div className="flex-1">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {Object.entries(report.recentActivity.emailsByType).map(([type, count]) => (
                      <div key={type} className="bg-gray-50 rounded p-2">
                        <p className="font-medium">{count}</p>
                        <p className="text-gray-500 text-xs">{type.replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
