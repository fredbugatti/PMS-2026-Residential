'use client';

import { useState, useEffect } from 'react';
import { FileText, ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { LeasesPageSkeleton } from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

interface Lease {
  id: string;
  tenantName: string;
  companyName: string | null;
  tenantEmail: string | null;
  tenantPhone: string | null;
  unitName: string;
  propertyName: string | null;
  startDate: string;
  endDate: string;
  securityDepositAmount: number | null;
  monthlyRentAmount: number | null;
  totalScheduledCharges: number | null;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'TERMINATED';
  notes: string | null;
  createdAt: string;
  balance: number;
}

interface Property {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unitNumber: string;
  propertyId: string;
  status: string;
}

interface Account {
  code: string;
  name: string;
  type: string;
}

interface LineItem {
  id: string;
  description: string;
  accountCode: string;
  amount: string;
  frequency: 'MONTHLY' | 'ONE_TIME';
}

export default function LeasesPage() {
  const { showSuccess, showError } = useToast();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [rentRollOpen, setRentRollOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    tenantName: '',
    companyName: '',
    propertyId: '',
    unitId: '',
    unitName: '',
    propertyName: '',
    startDate: '',
    endDate: '',
  });

  // Line items (QuickBooks-style)
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { id: '1', description: 'Monthly Rent', accountCode: '4000', amount: '', frequency: 'MONTHLY' },
    { id: '2', description: 'Security Deposit', accountCode: '2100', amount: '', frequency: 'ONE_TIME' },
  ]);

  useEffect(() => {
    fetchLeases();
    fetchProperties();
  }, []);

  const fetchLeases = async () => {
    try {
      const [leasesRes, balancesRes] = await Promise.all([
        fetch('/api/leases'),
        fetch('/api/reports/tenant-balances')
      ]);
      if (!leasesRes.ok) {
        throw new Error('Failed to fetch leases');
      }
      const leasesData = await leasesRes.json();
      const balancesData = balancesRes.ok ? await balancesRes.json() : { tenants: [] };

      const balanceMap = new Map(
        (balancesData.tenants || []).map((t: any) => [t.leaseId, t.balance])
      );
      const leasesWithBalance = (Array.isArray(leasesData) ? leasesData : [])
        .map((l: any) => ({ ...l, balance: balanceMap.get(l.id) || 0 }));

      setLeases(leasesWithBalance);
    } catch (error) {
      console.error('Failed to fetch leases:', error);
      setLeases([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties');
      if (res.ok) {
        const data = await res.json();
        setProperties(data);
      }
    } catch (error) {
      console.error('Failed to fetch properties:', error);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/chart-of-accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(Array.isArray(data) ? data.filter((a: Account) => a.type !== 'EQUITY') : []);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const getFilteredLeases = () => {
    if (selectedProperty === 'all') return leases;
    return leases.filter(lease => {
      const propertyMatch = properties.find(p => p.id === selectedProperty);
      return lease.propertyName === propertyMatch?.name;
    });
  };

  const fetchUnitsForProperty = async (propertyId: string) => {
    if (!propertyId) {
      setAvailableUnits([]);
      return;
    }
    try {
      const res = await fetch(`/api/units?propertyId=${propertyId}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableUnits(data);
      }
    } catch (error) {
      console.error('Failed to fetch units:', error);
      setAvailableUnits([]);
    }
  };

  const handlePropertyChange = (propertyId: string) => {
    const property = properties.find(p => p.id === propertyId);
    setFormData({
      ...formData,
      propertyId,
      propertyName: property?.name || '',
      unitId: '',
      unitName: ''
    });
    fetchUnitsForProperty(propertyId);
  };

  const handleUnitChange = (unitId: string) => {
    const unit = availableUnits.find(u => u.id === unitId);
    setFormData({
      ...formData,
      unitId,
      unitName: unit?.unitNumber || ''
    });
  };

  const openModal = () => {
    fetchAccounts();
    setLineItems([
      { id: '1', description: 'Monthly Rent', accountCode: '4000', amount: '', frequency: 'MONTHLY' },
      { id: '2', description: 'Security Deposit', accountCode: '2100', amount: '', frequency: 'ONE_TIME' },
    ]);
    setFormData({
      tenantName: '',
      companyName: '',
      propertyId: '',
      unitId: '',
      unitName: '',
      propertyName: '',
      startDate: '',
      endDate: '',
    });
    setAvailableUnits([]);
    setShowModal(true);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, {
      id: Date.now().toString(),
      description: '',
      accountCode: '',
      amount: '',
      frequency: 'MONTHLY',
    }]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setLineItems(lineItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const getMonthlyTotal = () => {
    return lineItems
      .filter(item => item.frequency === 'MONTHLY' && item.amount)
      .reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);
  };

  const getOneTimeTotal = () => {
    return lineItems
      .filter(item => item.frequency === 'ONE_TIME' && item.amount)
      .reduce((sum, item) => sum + parseFloat(item.amount || '0'), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate line items
      const filledLines = lineItems.filter(item => item.amount && parseFloat(item.amount) > 0);
      if (filledLines.length === 0) {
        throw new Error('Add at least one charge');
      }

      for (const item of filledLines) {
        if (!item.description.trim()) {
          throw new Error('All charges need a description');
        }
        if (!item.accountCode) {
          throw new Error(`Select an account for "${item.description}"`);
        }
      }

      // Find rent line (4000) for monthlyRentAmount
      const rentLine = filledLines.find(item => item.accountCode === '4000' && item.frequency === 'MONTHLY');
      // Find security deposit line (2100) for securityDepositAmount
      const depositLine = filledLines.find(item => item.accountCode === '2100');

      // 1. Create the lease
      const leasePayload = {
        tenantName: formData.tenantName,
        companyName: formData.companyName || null,
        propertyId: formData.propertyId || null,
        unitId: formData.unitId || null,
        unitName: formData.unitName,
        propertyName: formData.propertyName || null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        monthlyRentAmount: rentLine ? parseFloat(rentLine.amount) : null,
        securityDepositAmount: depositLine ? parseFloat(depositLine.amount) : null,
      };

      const leaseRes = await fetch('/api/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leasePayload)
      });

      if (!leaseRes.ok) {
        const error = await leaseRes.json();
        throw new Error(error.error || 'Failed to create lease');
      }

      const lease = await leaseRes.json();

      // 2. Create scheduled charges for monthly recurring items (skip 4000 since API already created it)
      const recurringCharges = filledLines.filter(
        item => item.frequency === 'MONTHLY' && item.accountCode !== '4000'
      );

      if (recurringCharges.length > 0) {
        const chargesPayload = {
          leaseId: lease.id,
          charges: recurringCharges.map(item => ({
            description: item.description.trim(),
            amount: parseFloat(item.amount),
            accountCode: item.accountCode,
            chargeDay: 1,
          })),
        };

        const chargesRes = await fetch('/api/scheduled-charges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chargesPayload)
        });

        if (!chargesRes.ok) {
          console.error('Failed to create some scheduled charges');
        }
      }

      setShowModal(false);
      showSuccess('Lease created');
      fetchLeases();
    } catch (error: any) {
      showError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800';
      case 'ENDED': return 'bg-slate-100 text-slate-800';
      case 'TERMINATED': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getSummaryStats = () => {
    const filtered = getFilteredLeases();
    const activeLeases = filtered.filter(l => l.status === 'ACTIVE');

    return {
      totalLeases: filtered.length,
      activeLeases: activeLeases.length,
      totalMonthlyRent: activeLeases.reduce((sum, l) => sum + (Number(l.totalScheduledCharges) || 0), 0),
      totalSecurityDeposits: filtered.reduce((sum, l) => sum + (Number(l.securityDepositAmount) || 0), 0),
      totalBalance: activeLeases.reduce((sum, l) => sum + (l.balance || 0), 0),
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (loading) {
    return <LeasesPageSkeleton />;
  }

  const filteredLeases = getFilteredLeases();
  const stats = getSummaryStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Leases</h1>
              <p className="text-sm text-slate-600 mt-1">
                {stats.activeLeases} active &middot; ${fmt(stats.totalMonthlyRent)}/mo
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {properties.length > 0 && (
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="flex-1 sm:flex-none px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Properties</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
              )}
              <button
                onClick={openModal}
                className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base whitespace-nowrap"
              >
                + Lease
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Leases List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {filteredLeases.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">
              {selectedProperty === 'all' ? 'No leases yet' : 'No leases for this property'}
            </h3>
            <p className="text-slate-500 mb-6 text-sm sm:text-base max-w-md mx-auto">
              Create your first lease to start tracking payments.
            </p>
            <button
              onClick={openModal}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + New Lease
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {filteredLeases.map((lease) => (
                <div
                  key={lease.id}
                  onClick={() => window.location.href = `/leases/${lease.id}`}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 cursor-pointer hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-slate-900 truncate">
                        {lease.companyName || lease.tenantName}
                      </div>
                      <div className="text-sm text-slate-500">{lease.unitName}</div>
                    </div>
                    <span className={`ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full flex-shrink-0 ${getStatusColor(lease.status)}`}>
                      {lease.status}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <div className="text-slate-500">{formatDate(lease.startDate)} - {formatDate(lease.endDate)}</div>
                    <div className="font-medium text-slate-900">
                      {lease.totalScheduledCharges
                        ? `$${parseFloat(lease.totalScheduledCharges.toString()).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/mo`
                        : '-'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Collapsible Rent Roll */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <button
                onClick={() => setRentRollOpen(!rentRollOpen)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-slate-900">
                    Rent Roll
                  </span>
                  <span className="text-sm text-slate-500">
                    {stats.totalLeases} lease{stats.totalLeases !== 1 ? 's' : ''} &middot; ${fmt(stats.totalMonthlyRent)}/mo &middot; ${fmt(stats.totalBalance)} owed
                  </span>
                </div>
                {rentRollOpen ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {rentRollOpen && (
                <div className="border-t border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tenant</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Period</th>
                          <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Status</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Monthly</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Deposit</th>
                          <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Balance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {filteredLeases.map((lease) => (
                          <tr
                            key={lease.id}
                            onClick={() => window.location.href = `/leases/${lease.id}`}
                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            <td className="px-6 py-3">
                              <div className="font-medium text-slate-900 text-sm">
                                {lease.companyName || lease.tenantName}
                              </div>
                              {lease.companyName && (
                                <div className="text-xs text-slate-500">{lease.tenantName}</div>
                              )}
                            </td>
                            <td className="px-6 py-3">
                              <div className="text-sm text-slate-900">{lease.unitName}</div>
                              {lease.propertyName && (
                                <div className="text-xs text-slate-500">{lease.propertyName}</div>
                              )}
                            </td>
                            <td className="px-6 py-3 text-sm text-slate-700">
                              {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                            </td>
                            <td className="px-6 py-3">
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(lease.status)}`}>
                                {lease.status}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-right text-sm font-medium text-slate-900">
                              {lease.totalScheduledCharges
                                ? `$${fmt(parseFloat(lease.totalScheduledCharges.toString()))}`
                                : '-'}
                            </td>
                            <td className="px-6 py-3 text-right text-sm text-slate-700">
                              {lease.securityDepositAmount
                                ? `$${fmt(parseFloat(lease.securityDepositAmount.toString()))}`
                                : '-'}
                            </td>
                            <td className="px-6 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              {lease.balance > 0 ? (
                                <div className="flex items-center justify-end gap-2">
                                  <span className="text-sm font-semibold text-red-600">${fmt(lease.balance)}</span>
                                  <button
                                    onClick={() => window.location.href = `/leases/${lease.id}?action=pay`}
                                    className="px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    Pay
                                  </button>
                                </div>
                              ) : lease.balance < 0 ? (
                                <span className="text-sm text-green-600">-${fmt(Math.abs(lease.balance))} credit</span>
                              ) : (
                                <span className="text-sm text-slate-400">Paid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-300">
                        <tr>
                          <td className="px-6 py-3 text-sm font-semibold text-slate-700" colSpan={4}>
                            {stats.totalLeases} lease{stats.totalLeases !== 1 ? 's' : ''} ({stats.activeLeases} active)
                          </td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-slate-900">${fmt(stats.totalMonthlyRent)}</td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-slate-900">${fmt(stats.totalSecurityDeposits)}</td>
                          <td className="px-6 py-3 text-right text-sm font-semibold text-slate-900">
                            <span className={stats.totalBalance > 0 ? 'text-red-600' : ''}>${fmt(stats.totalBalance)}</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Create Lease Modal — QuickBooks-style */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 pt-5 pb-3 flex items-center justify-between sticky top-0 bg-white z-10 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">New Lease</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 pb-5">
              {/* Top: Property, Unit, Tenant, Dates — compact 2-row grid */}
              <div className="py-4 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Property</label>
                    <select
                      required
                      value={formData.propertyId}
                      onChange={(e) => handlePropertyChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                    >
                      <option value="">Select...</option>
                      {properties.map(property => (
                        <option key={property.id} value={property.id}>{property.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Unit</label>
                    {formData.propertyId && availableUnits.length > 0 ? (
                      <select
                        required
                        value={formData.unitId}
                        onChange={(e) => handleUnitChange(e.target.value)}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                      >
                        <option value="">Select...</option>
                        {availableUnits.map(unit => (
                          <option key={unit.id} value={unit.id}>
                            {unit.unitNumber} {unit.status !== 'VACANT' ? `(${unit.status})` : ''}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        required
                        value={formData.unitName}
                        onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder={formData.propertyId ? 'No units' : 'Pick property'}
                        disabled={formData.propertyId !== '' && availableUnits.length === 0}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Start</label>
                    <input
                      type="date"
                      required
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">End</label>
                    <input
                      type="date"
                      required
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Company</label>
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Optional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Contact</label>
                    <input
                      type="text"
                      required
                      value={formData.tenantName}
                      onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                      className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="Primary contact name"
                    />
                  </div>
                </div>
              </div>

              {/* Line Items — QuickBooks-style */}
              <div className="border-t border-slate-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Charges</span>
                </div>

                {/* Header row */}
                <div className="grid grid-cols-[1fr_1fr_100px_80px_32px] gap-2 mb-1 px-1">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Description</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Account</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase text-right">Amount</span>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">Freq</span>
                  <span></span>
                </div>

                {/* Line items */}
                <div className="space-y-1.5">
                  {lineItems.map((item) => (
                    <div key={item.id} className="grid grid-cols-[1fr_1fr_100px_80px_32px] gap-2 items-center">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                        className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Description"
                      />
                      <select
                        value={item.accountCode}
                        onChange={(e) => updateLineItem(item.id, 'accountCode', e.target.value)}
                        className="px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white truncate"
                      >
                        <option value="">Account...</option>
                        {accounts.length > 0 ? (
                          <>
                            <optgroup label="Income">
                              {accounts.filter(a => a.type === 'INCOME').map(a => (
                                <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Liability">
                              {accounts.filter(a => a.type === 'LIABILITY').map(a => (
                                <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Expense">
                              {accounts.filter(a => a.type === 'EXPENSE').map(a => (
                                <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Asset">
                              {accounts.filter(a => a.type === 'ASSET').map(a => (
                                <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                              ))}
                            </optgroup>
                          </>
                        ) : (
                          <>
                            <option value="4000">4000 - Lease Income</option>
                            <option value="4040">4040 - CAM Income</option>
                            <option value="4030">4030 - Parking Income</option>
                            <option value="2100">2100 - Security Deposits</option>
                          </>
                        )}
                      </select>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateLineItem(item.id, 'amount', e.target.value)}
                          className="w-full pl-5 pr-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0.00"
                        />
                      </div>
                      <select
                        value={item.frequency}
                        onChange={(e) => updateLineItem(item.id, 'frequency', e.target.value as 'MONTHLY' | 'ONE_TIME')}
                        className="px-1.5 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        <option value="MONTHLY">Monthly</option>
                        <option value="ONE_TIME">One-time</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeLineItem(item.id)}
                        className="p-1 text-slate-300 hover:text-red-500 transition-colors rounded"
                        tabIndex={-1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add line button */}
                <button
                  type="button"
                  onClick={addLineItem}
                  className="mt-2 flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium px-1"
                >
                  <Plus className="w-4 h-4" />
                  Add line
                </button>

                {/* Totals */}
                <div className="mt-4 pt-3 border-t border-slate-200 space-y-1 text-sm">
                  {getMonthlyTotal() > 0 && (
                    <div className="flex justify-between px-1">
                      <span className="text-slate-600">Monthly recurring</span>
                      <span className="font-semibold text-slate-900">${fmt(getMonthlyTotal())}/mo</span>
                    </div>
                  )}
                  {getOneTimeTotal() > 0 && (
                    <div className="flex justify-between px-1">
                      <span className="text-slate-600">One-time charges</span>
                      <span className="font-medium text-slate-700">${fmt(getOneTimeTotal())}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-5 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Lease'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
