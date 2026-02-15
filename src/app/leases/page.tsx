'use client';

import { useState, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { LeasesPageSkeleton } from '@/components/Skeleton';

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

export default function LeasesPage() {
  const [leases, setLeases] = useState<Lease[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
  const [formData, setFormData] = useState({
    tenantName: '',
    companyName: '',
    tenantEmail: '',
    tenantPhone: '',
    propertyId: '',
    unitId: '',
    unitName: '',
    propertyName: '',
    startDate: '',
    endDate: '',
    securityDepositAmount: '',
    status: 'ACTIVE' as const,
    notes: ''
  });

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

      // Merge balance data with leases
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload = {
        ...formData,
        tenantEmail: formData.tenantEmail || null,
        tenantPhone: formData.tenantPhone || null,
        propertyId: formData.propertyId || null,
        unitId: formData.unitId || null,
        propertyName: formData.propertyName || null,
        securityDepositAmount: formData.securityDepositAmount
          ? parseFloat(formData.securityDepositAmount)
          : null,
        notes: formData.notes || null
      };

      const res = await fetch('/api/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create lease');
      }

      // Reset form and refresh
      setFormData({
        tenantName: '',
        companyName: '',
        tenantEmail: '',
        tenantPhone: '',
        propertyId: '',
        unitId: '',
        unitName: '',
        propertyName: '',
        startDate: '',
        endDate: '',
        securityDepositAmount: '',
        status: 'ACTIVE',
        notes: ''
      });
      setAvailableUnits([]);
      setShowModal(false);
      fetchLeases();
    } catch (error: any) {
      alert(error.message);
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

  if (loading) {
    return <LeasesPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Leases</h1>
              <p className="text-sm text-slate-600 mt-1">
                Manage warehouse leases and agreements
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
                onClick={() => setShowModal(true)}
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
        {getFilteredLeases().length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 sm:p-12 text-center">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">
              {selectedProperty === 'all' ? 'No leases yet' : 'No leases for this property'}
            </h3>
            <p className="text-slate-500 mb-6 text-sm sm:text-base max-w-md mx-auto">
              {selectedProperty === 'all'
                ? 'Add your first lease to start tracking lease payments and tenant information.'
                : 'Select a different property or create a new lease for this one.'}
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              + New Lease
            </button>
          </div>
        ) : (
          <>
            {/* Mobile Cards View */}
            <div className="md:hidden space-y-3">
              {getFilteredLeases().map((lease) => (
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
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-slate-500 text-xs">Period</div>
                      <div className="text-slate-900">{formatDate(lease.startDate)} - {formatDate(lease.endDate)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-500 text-xs">Monthly</div>
                      <div className="font-medium text-slate-900">
                        {lease.totalScheduledCharges
                          ? `$${parseFloat(lease.totalScheduledCharges.toString()).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {/* Mobile Summary Card */}
              {(() => {
                const stats = getSummaryStats();
                return (
                  <div className="bg-slate-100 rounded-xl border-2 border-slate-300 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-xs text-slate-500 uppercase">Total Leases</div>
                        <div className="text-lg font-bold text-slate-900">{stats.totalLeases}</div>
                        <div className="text-xs text-slate-600">{stats.activeLeases} active</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500 uppercase">Monthly Total</div>
                        <div className="text-lg font-bold text-slate-900">
                          ${stats.totalMonthlyRent.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div className="col-span-2 pt-2 border-t border-slate-300">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500 uppercase">Security Deposits</span>
                          <span className="font-bold text-slate-900">
                            ${stats.totalSecurityDeposits.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Tenant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Unit
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Lease Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Monthly Total
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Security Deposit
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {getFilteredLeases().map((lease) => (
                      <tr
                        key={lease.id}
                        onClick={() => window.location.href = `/leases/${lease.id}`}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-900">
                              {lease.companyName || lease.tenantName}
                            </div>
                            {lease.companyName && (
                              <div className="text-sm text-slate-500">{lease.tenantName}</div>
                            )}
                            {!lease.companyName && lease.tenantEmail && (
                              <div className="text-sm text-slate-500">{lease.tenantEmail}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-slate-900">{lease.unitName}</div>
                            {lease.propertyName && (
                              <div className="text-sm text-slate-500">{lease.propertyName}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {formatDate(lease.startDate)} - {formatDate(lease.endDate)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(lease.status)}`}>
                            {lease.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          {lease.totalScheduledCharges ? (
                            <div>
                              <div className="text-sm font-medium text-slate-900">
                                ${parseFloat(lease.totalScheduledCharges.toString()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              {lease.monthlyRentAmount && lease.totalScheduledCharges !== lease.monthlyRentAmount && (
                                <div className="text-xs text-slate-500">
                                  Rent: ${parseFloat(lease.monthlyRentAmount.toString()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900 text-right">
                          {lease.securityDepositAmount
                            ? `$${parseFloat(lease.securityDepositAmount.toString()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            : '-'}
                        </td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          {lease.balance > 0 ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-sm font-semibold text-red-600">
                                ${lease.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <button
                                onClick={() => window.location.href = `/leases/${lease.id}?action=pay`}
                                className="px-2 py-1 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Pay
                              </button>
                            </div>
                          ) : lease.balance < 0 ? (
                            <span className="text-sm font-medium text-green-600">
                              -${Math.abs(lease.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} credit
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">Paid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                    {(() => {
                      const stats = getSummaryStats();
                      return (
                        <tr>
                          <td className="px-6 py-4">
                            <div className="font-semibold text-slate-900">
                              Total: {stats.totalLeases} lease{stats.totalLeases !== 1 ? 's' : ''}
                            </div>
                            <div className="text-sm text-slate-600">
                              {stats.activeLeases} active
                            </div>
                          </td>
                          <td className="px-6 py-4"></td>
                          <td className="px-6 py-4"></td>
                          <td className="px-6 py-4"></td>
                          <td className="px-6 py-4 text-right">
                            <div className="font-semibold text-slate-900">
                              ${stats.totalMonthlyRent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-slate-600">monthly total</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="font-semibold text-slate-900">
                              ${stats.totalSecurityDeposits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-slate-600">total deposits</div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className={`font-semibold ${stats.totalBalance > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                              ${stats.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                            <div className="text-xs text-slate-600">total owed</div>
                          </td>
                        </tr>
                      );
                    })()}
                  </tfoot>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Lease Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-xl sm:rounded-xl shadow-xl w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900">Create New Lease</h2>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="sm:hidden p-2 text-slate-500 hover:text-slate-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
              {/* Tenant Information */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Tenant Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Tenant Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.tenantName}
                      onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.tenantEmail}
                        onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.tenantPhone}
                        onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Unit Information */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Unit Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Property
                    </label>
                    <select
                      value={formData.propertyId}
                      onChange={(e) => handlePropertyChange(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                    >
                      <option value="">Select a property (optional)</option>
                      {properties.map(property => (
                        <option key={property.id} value={property.id}>{property.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">Select a property to choose from available units</p>
                  </div>

                  {formData.propertyId && availableUnits.length > 0 ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Unit *
                      </label>
                      <select
                        required
                        value={formData.unitId}
                        onChange={(e) => handleUnitChange(e.target.value)}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      >
                        <option value="">Select a unit</option>
                        {availableUnits.map(unit => (
                          <option key={unit.id} value={unit.id}>
                            {unit.unitNumber} {unit.status !== 'VACANT' ? `(${unit.status})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Unit Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.unitName}
                        onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        placeholder="Unit 101"
                        disabled={formData.propertyId !== '' && availableUnits.length === 0}
                      />
                      {formData.propertyId && availableUnits.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">No units available for this property</p>
                      )}
                      {!formData.propertyId && (
                        <p className="text-xs text-slate-500 mt-1">Or enter unit name manually if not using property system</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Lease Details */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Lease Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        End Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Security Deposit
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.securityDepositAmount}
                        onChange={(e) => setFormData({ ...formData, securityDepositAmount: e.target.value })}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                        placeholder="1500.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Status *
                      </label>
                      <select
                        required
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="ACTIVE">Active</option>
                        <option value="ENDED">Ended</option>
                        <option value="TERMINATED">Terminated</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                      placeholder="Additional notes about this lease..."
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4 pb-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 sm:py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Create Lease
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
