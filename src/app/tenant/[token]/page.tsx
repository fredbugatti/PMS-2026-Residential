'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface LedgerEntry {
  id: string;
  entryDate: string;
  accountCode: string;
  amount: number;
  debitCredit: 'DR' | 'CR';
  description: string;
  account: {
    code: string;
    name: string;
    type: string;
  };
}

interface Document {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileUrl: string;
  category: string;
  description: string | null;
  uploadedBy: string;
  createdAt: string;
}

interface TenantPortalData {
  lease: {
    id: string;
    tenantName: string;
    tenantEmail: string | null;
    tenantPhone: string | null;
    startDate: string;
    endDate: string;
    monthlyRentAmount: number;
    securityDepositAmount: number | null;
    status: string;
    chargeDay: number | null;
  };
  property: {
    id: string;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  };
  unit: {
    id: string;
    unitNumber: string;
    bedrooms: number | null;
    bathrooms: number | null;
  };
  workOrders: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    createdAt: string;
    scheduledDate: string | null;
    completedDate: string | null;
    photos: string[];
  }>;
  balance: number;
  ledgerEntries: LedgerEntry[];
  documents: Document[];
  autopay: {
    enabled: boolean;
    day: number | null;
    method: string | null;
    last4: string | null;
  };
}

export default function TenantPortal() {
  const params = useParams();
  const [data, setData] = useState<TenantPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'maintenance' | 'documents'>('overview');

  useEffect(() => {
    fetchPortalData();
  }, [params.token]);

  const fetchPortalData = async () => {
    try {
      const res = await fetch(`/api/tenant/${params.token}`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to load portal');
      }
      const portalData = await res.json();
      setData(portalData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ASSIGNED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'EMERGENCY': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'LOW': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDaysUntilRentDue = () => {
    if (!data?.lease.chargeDay) return null;

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    let dueDate = new Date(currentYear, currentMonth, data.lease.chargeDay);

    if (dueDate < today) {
      dueDate = new Date(currentYear, currentMonth + 1, data.lease.chargeDay);
    }

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
      days: diffDays,
      date: dueDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📎';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      lease_agreement: 'Lease Agreement',
      inspection: 'Inspection',
      receipt: 'Receipt',
      tenant_id: 'Tenant ID',
      proof_income: 'Proof of Income',
      reference: 'Reference',
      other: 'Other'
    };
    return labels[category] || category;
  };

  const rentDueInfo = getDaysUntilRentDue();
  const daysUntilEnd = data?.lease.endDate
    ? Math.ceil((new Date(data.lease.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-gray-600 font-medium">Loading your portal...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="text-center bg-white rounded-2xl shadow-xl p-12 max-w-md">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">{error || 'Invalid portal link'}</p>
          <p className="text-sm text-gray-500">Please contact your property manager for assistance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center font-bold text-2xl border-2 border-white/30">
                {data.lease.tenantName.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-bold">Welcome, {data.lease.tenantName}</h1>
                <p className="text-blue-100 text-lg mt-1">
                  {data.property.name} • Unit {data.unit.unitNumber}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Balance Card - Prominent */}
        <div className="mb-8">
          <div className={`rounded-2xl shadow-xl p-8 ${data.balance > 0 ? 'bg-gradient-to-br from-red-500 to-pink-600' : 'bg-gradient-to-br from-green-500 to-emerald-600'} text-white`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/90 text-lg mb-2">Current Balance</p>
                <p className="text-5xl font-bold mb-4">{formatCurrency(Math.abs(data.balance))}</p>
                {data.balance > 0 ? (
                  <div className="flex items-center gap-4">
                    <p className="text-white/90 text-lg">Amount Owed</p>
                    <Link
                      href={`/tenant/${params.token}/pay`}
                      className="px-6 py-2 bg-white text-red-600 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-md"
                    >
                      Pay Now
                    </Link>
                  </div>
                ) : data.balance < 0 ? (
                  <p className="text-white/90 text-lg">Credit on Account</p>
                ) : (
                  <p className="text-white/90 text-lg">Account Paid in Full</p>
                )}
              </div>
              {rentDueInfo && (
                <div className="text-right">
                  <p className="text-white/90 text-sm mb-2">Next Rent Due</p>
                  <p className="text-2xl font-bold">{rentDueInfo.date}</p>
                  <p className="text-white/90 mt-2">
                    {rentDueInfo.days <= 0 ? 'Due today!' : rentDueInfo.days === 1 ? 'Tomorrow' : `In ${rentDueInfo.days} days`}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Statement - Most Important Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 mb-8">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">📋</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Account Statement</h2>
                  <p className="text-sm text-gray-600">Your complete transaction history</p>
                </div>
              </div>
              <div className={`px-5 py-3 rounded-xl font-bold text-lg ${
                data.balance > 0
                  ? 'bg-red-100 text-red-800 border-2 border-red-200'
                  : data.balance < 0
                  ? 'bg-green-100 text-green-800 border-2 border-green-200'
                  : 'bg-gray-100 text-gray-800 border-2 border-gray-200'
              }`}>
                Balance: {formatCurrency(Math.abs(data.balance))} {data.balance > 0 ? 'Due' : data.balance < 0 ? 'Credit' : ''}
              </div>
            </div>
          </div>

          <div className="p-6">
            {data.ledgerEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-5xl mb-4">📋</div>
                <p className="text-lg">No transactions yet</p>
                <p className="text-sm mt-2">Charges and payments will appear here</p>
              </div>
            ) : (
              <>
                {/* Summary Row */}
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">Total Charged</div>
                    <div className="text-xl font-bold text-red-600">
                      {formatCurrency(data.ledgerEntries.filter(e => e.accountCode === '1200' && e.debitCredit === 'DR').reduce((sum, e) => sum + Number(e.amount), 0))}
                    </div>
                  </div>
                  <div className="text-center border-x border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Total Paid</div>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(data.ledgerEntries.filter(e => e.accountCode === '1200' && e.debitCredit === 'CR').reduce((sum, e) => sum + Number(e.amount), 0))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-600 mb-1">Current Balance</div>
                    <div className={`text-xl font-bold ${data.balance > 0 ? 'text-red-600' : data.balance < 0 ? 'text-green-600' : 'text-gray-900'}`}>
                      {formatCurrency(Math.abs(data.balance))}
                    </div>
                  </div>
                </div>

                {/* Transaction List - Only show AR entries (1200) to tenant */}
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {data.ledgerEntries.filter(e => e.accountCode === '1200').map((entry) => (
                    <div key={entry.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{entry.description}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {new Date(entry.entryDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-xl font-bold ${
                            entry.debitCredit === 'DR' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {entry.debitCredit === 'DR' ? '+' : '-'}
                            {formatCurrency(Number(entry.amount))}
                          </div>
                          <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${
                            entry.debitCredit === 'DR'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {entry.debitCredit === 'DR' ? 'Charge' : 'Payment'}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <div className="text-sm text-gray-600">Monthly Rent</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(Number(data.lease.monthlyRentAmount))}
                </div>
              </div>
            </div>
          </div>

          {daysUntilEnd && daysUntilEnd > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📅</span>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Lease Expires</div>
                  <div className="text-2xl font-bold text-gray-900">{daysUntilEnd} days</div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <span className="text-2xl">🔧</span>
              </div>
              <div>
                <div className="text-sm text-gray-600">Active Requests</div>
                <div className="text-2xl font-bold text-gray-900">
                  {data.workOrders.filter(wo => wo.status !== 'COMPLETED').length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-md border border-gray-100 mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-8 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Lease Details
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`px-8 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'maintenance'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Maintenance
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`px-8 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'documents'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Documents
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {data.balance > 0 && (
                    <Link
                      href={`/tenant/${params.token}/pay`}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl p-6 hover:from-green-600 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg block"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                          💵
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-lg">Pay Balance</div>
                          <div className="text-sm text-green-100">
                            {formatCurrency(data.balance)} due
                          </div>
                        </div>
                      </div>
                    </Link>
                  )}

                  <button
                    onClick={() => setShowNewRequest(true)}
                    className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl p-6 hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                        🔧
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-lg">Maintenance Request</div>
                        <div className="text-sm text-blue-100">Report an issue</div>
                      </div>
                    </div>
                  </button>

                  <Link
                    href={`/tenant/${params.token}/autopay`}
                    className={`${data.autopay?.enabled
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700'
                      : 'bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700'
                    } text-white rounded-xl p-6 transition-all shadow-md hover:shadow-lg block`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
                        {data.autopay?.enabled ? '✓' : '🔄'}
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-lg">
                          {data.autopay?.enabled ? 'Autopay Active' : 'Set Up Autopay'}
                        </div>
                        <div className="text-sm text-purple-100">
                          {data.autopay?.enabled
                            ? `${data.autopay.method === 'ACH' ? 'Bank' : 'Card'} ••${data.autopay.last4}`
                            : 'Never miss a payment'}
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>

                {/* Lease Information */}
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Lease Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Property Address</div>
                      <div className="font-medium text-gray-900">
                        {data.property.address}
                        {data.property.city && `, ${data.property.city}`}
                        {data.property.state && `, ${data.property.state}`}
                        {data.property.zipCode && ` ${data.property.zipCode}`}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Unit Details</div>
                      <div className="font-medium text-gray-900">
                        Unit {data.unit.unitNumber}
                        {data.unit.bedrooms && ` • ${data.unit.bedrooms} bed`}
                        {data.unit.bathrooms && ` • ${data.unit.bathrooms} bath`}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Lease Term</div>
                      <div className="font-medium text-gray-900">
                        {data.lease.startDate && new Date(data.lease.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' '} to {' '}
                        {data.lease.endDate && new Date(data.lease.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Security Deposit</div>
                      <div className="font-medium text-gray-900">
                        {formatCurrency(Number(data.lease.securityDepositAmount || 0))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'maintenance' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Maintenance Requests</h3>
                  <button
                    onClick={() => setShowNewRequest(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    + New Request
                  </button>
                </div>

                {data.workOrders.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-5xl mb-4">🔧</div>
                    <p>No maintenance requests yet</p>
                    <button
                      onClick={() => setShowNewRequest(true)}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Submit your first request
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.workOrders.map((request) => (
                      <div key={request.id} className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors border border-gray-200">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 text-lg">{request.title}</h4>
                            <p className="text-gray-600 mt-2">{request.description}</p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <span className={`text-xs px-3 py-1 rounded-full font-medium border ${getPriorityColor(request.priority)}`}>
                              {request.priority}
                            </span>
                            <span className={`text-xs px-3 py-1 rounded-full font-medium border ${getStatusColor(request.status)}`}>
                              {request.status.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 text-sm text-gray-500 mt-4">
                          <span className="flex items-center gap-1">
                            📅 {new Date(request.createdAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            🏷️ {request.category}
                          </span>
                          {request.scheduledDate && (
                            <span className="flex items-center gap-1 text-blue-600 font-medium">
                              🔧 Scheduled: {new Date(request.scheduledDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>

                        {request.photos.length > 0 && (
                          <div className="mt-4 flex gap-2">
                            {request.photos.slice(0, 4).map((photo, idx) => (
                              <img
                                key={idx}
                                src={photo}
                                alt={`Photo ${idx + 1}`}
                                className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                              />
                            ))}
                            {request.photos.length > 4 && (
                              <div className="w-24 h-24 bg-gray-200 rounded-lg border-2 border-gray-300 flex items-center justify-center text-gray-600 font-medium">
                                +{request.photos.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Lease Documents</h3>
                  <div className="text-sm text-gray-600">
                    {data.documents.length} {data.documents.length === 1 ? 'document' : 'documents'}
                  </div>
                </div>

                {data.documents.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <div className="text-5xl mb-4">📁</div>
                    <p>No documents available yet</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {data.documents.map((doc) => (
                      <div key={doc.id} className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors border border-gray-200">
                        <div className="flex items-start gap-4">
                          <div className="text-4xl">{getFileIcon(doc.mimeType)}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-gray-900 truncate">{doc.fileName}</h4>
                                {doc.description && (
                                  <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                                )}
                                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    🏷️ {getCategoryLabel(doc.category)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    📦 {formatFileSize(doc.fileSize)}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    📅 {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2 shrink-0">
                                <a
                                  href={doc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                >
                                  View
                                </a>
                                <a
                                  href={doc.fileUrl}
                                  download={doc.fileName}
                                  className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors font-medium"
                                >
                                  Download
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">About Documents</h4>
                  <p className="text-sm text-blue-700">
                    Here you can access important documents related to your lease, including your lease agreement,
                    inspection reports, receipts, and other important files. If you need a specific document that's
                    not available, please contact your property manager.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Request Modal */}
      {showNewRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Submit Maintenance Request</h2>
                <button
                  onClick={() => setShowNewRequest(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-6">
                You'll be redirected to submit a new maintenance request with detailed information about the issue.
              </p>
              <Link
                href={`/tenant/${params.token}/maintenance/new`}
                className="block w-full text-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-md hover:shadow-lg"
              >
                Continue to Request Form
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
