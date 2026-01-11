'use client';

import { useState, useEffect } from 'react';

interface Lease {
  id: string;
  tenantName: string;
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
      const res = await fetch('/api/leases');
      if (!res.ok) {
        throw new Error('Failed to fetch leases');
      }
      const data = await res.json();
      setLeases(Array.isArray(data) ? data : []);
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
      // Match by propertyName string or propertyId
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
      case 'ENDED': return 'bg-gray-100 text-gray-800';
      case 'TERMINATED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Loading leases...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leases</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage tenant leases and agreements
              </p>
            </div>
            <div className="flex items-center gap-3">
              {properties.length > 0 && (
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Properties</option>
                  {properties.map(property => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
              )}
              <button
                onClick={() => setShowModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Create Lease
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Leases Table */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {getFilteredLeases().length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                {selectedProperty === 'all' ? 'No leases yet' : 'No leases for this property'}
              </p>
              <button
                onClick={() => setShowModal(true)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first lease
              </button>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Lease Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Monthly Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Security Deposit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {getFilteredLeases().map((lease) => (
                  <tr
                    key={lease.id}
                    onClick={() => window.location.href = `/leases/${lease.id}`}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{lease.tenantName}</div>
                        {lease.tenantEmail && (
                          <div className="text-sm text-gray-500">{lease.tenantEmail}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{lease.unitName}</div>
                        {lease.propertyName && (
                          <div className="text-sm text-gray-500">{lease.propertyName}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
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
                          <div className="text-sm font-medium text-gray-900">
                            ${parseFloat(lease.totalScheduledCharges.toString()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {lease.monthlyRentAmount && lease.totalScheduledCharges !== lease.monthlyRentAmount && (
                            <div className="text-xs text-gray-500">
                              Rent: ${parseFloat(lease.monthlyRentAmount.toString()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">
                      {lease.securityDepositAmount
                        ? `$${parseFloat(lease.securityDepositAmount.toString()).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Lease Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Create New Lease</h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Tenant Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Tenant Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tenant Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.tenantName}
                      onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.tenantEmail}
                        onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.tenantPhone}
                        onChange={(e) => setFormData({ ...formData, tenantPhone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Unit Information */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Unit Information</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Property
                    </label>
                    <select
                      value={formData.propertyId}
                      onChange={(e) => handlePropertyChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a property (optional)</option>
                      {properties.map(property => (
                        <option key={property.id} value={property.id}>{property.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Select a property to choose from available units</p>
                  </div>

                  {formData.propertyId && availableUnits.length > 0 ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit *
                      </label>
                      <select
                        required
                        value={formData.unitId}
                        onChange={(e) => handleUnitChange(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.unitName}
                        onChange={(e) => setFormData({ ...formData, unitName: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Unit 101"
                        disabled={formData.propertyId !== '' && availableUnits.length === 0}
                      />
                      {formData.propertyId && availableUnits.length === 0 && (
                        <p className="text-xs text-red-500 mt-1">No units available for this property</p>
                      )}
                      {!formData.propertyId && (
                        <p className="text-xs text-gray-500 mt-1">Or enter unit name manually if not using property system</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Lease Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Lease Details</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.startDate}
                        onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.endDate}
                        onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Security Deposit
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.securityDepositAmount}
                        onChange={(e) => setFormData({ ...formData, securityDepositAmount: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="1500.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status *
                      </label>
                      <select
                        required
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="ACTIVE">Active</option>
                        <option value="ENDED">Ended</option>
                        <option value="TERMINATED">Terminated</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Additional notes about this lease..."
                    />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
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
