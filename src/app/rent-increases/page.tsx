'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

interface RentIncrease {
  id: string;
  previousAmount: number;
  newAmount: number;
  effectiveDate: string;
  noticeDate: string;
  status: 'SCHEDULED' | 'APPLIED' | 'CANCELLED';
  notes: string | null;
  lease: {
    id: string;
    tenantName: string;
    unitName: string;
    propertyName: string | null;
    status: string;
  };
}

export default function RentIncreasesPage() {
  const { showSuccess, showError } = useToast();
  const [increases, setIncreases] = useState<RentIncrease[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'SCHEDULED' | 'APPLIED'>('all');

  useEffect(() => {
    fetchIncreases();
  }, []);

  const fetchIncreases = async () => {
    try {
      const res = await fetch('/api/rent-increases');
      if (res.ok) {
        const data = await res.json();
        setIncreases(data);
      }
    } catch (error) {
      console.error('Failed to fetch rent increases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPending = async () => {
    if (!confirm('Apply all pending rent increases that are due today or earlier?')) {
      return;
    }

    try {
      const res = await fetch('/api/rent-increases/apply-pending', {
        method: 'POST'
      });

      if (!res.ok) {
        throw new Error('Failed to apply pending increases');
      }

      const result = await res.json();
      showSuccess(`${result.message} - Applied: ${result.applied.length}, Errors: ${result.errors.length}`);

      await fetchIncreases();
    } catch (error) {
      console.error('Failed to apply pending increases:', error);
      showError('Failed to apply pending increases');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getFilteredIncreases = () => {
    if (filter === 'all') return increases;
    return increases.filter(i => i.status === filter);
  };

  const filteredIncreases = getFilteredIncreases();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-start justify-between flex-col md:flex-row gap-4">
            <div>
              <nav className="flex gap-4 mb-4">
                <a href="/" className="text-sm font-medium text-slate-600 hover:text-slate-900">Dashboard</a>
                <a href="/leases" className="text-sm font-medium text-slate-600 hover:text-slate-900">Leases</a>
                <a href="/reports" className="text-sm font-medium text-slate-600 hover:text-slate-900">Reports</a>
                <a href="/rent-increases" className="text-sm font-medium text-blue-600">Rent Increases</a>
              </nav>
              <h1 className="text-2xl font-bold text-slate-900">Rent Increases</h1>
              <p className="text-sm text-slate-600 mt-1">Manage scheduled and historical rent increases</p>
            </div>
            <button
              onClick={handleApplyPending}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Apply Pending Increases
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            All ({increases.length})
          </button>
          <button
            onClick={() => setFilter('SCHEDULED')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === 'SCHEDULED'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Scheduled ({increases.filter(i => i.status === 'SCHEDULED').length})
          </button>
          <button
            onClick={() => setFilter('APPLIED')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === 'APPLIED'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            Applied ({increases.filter(i => i.status === 'APPLIED').length})
          </button>
        </div>

        {/* Rent Increases List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200">
          {filteredIncreases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No rent increases found</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredIncreases.map((increase) => (
                <div key={increase.id} className="p-6">
                  <div className="flex items-start justify-between flex-col md:flex-row gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {increase.lease.tenantName}
                        </h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          increase.status === 'APPLIED' ? 'bg-green-100 text-green-800' :
                          increase.status === 'SCHEDULED' ? 'bg-blue-100 text-blue-800' :
                          'bg-slate-100 text-slate-800'
                        }`}>
                          {increase.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mb-3">
                        {increase.lease.unitName} {increase.lease.propertyName && `• ${increase.lease.propertyName}`}
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <span className="text-slate-600">From:</span>{' '}
                          <span className="font-semibold text-slate-900">{formatCurrency(increase.previousAmount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">To:</span>{' '}
                          <span className="font-semibold text-green-600">{formatCurrency(increase.newAmount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-600">Increase:</span>{' '}
                          <span className="font-semibold text-slate-900">
                            +{formatCurrency(increase.newAmount - increase.previousAmount)} ({(((increase.newAmount - increase.previousAmount) / increase.previousAmount) * 100).toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        Effective: {new Date(increase.effectiveDate).toLocaleDateString()} •
                        Notice: {new Date(increase.noticeDate).toLocaleDateString()}
                      </div>
                      {increase.notes && (
                        <p className="mt-2 text-sm text-slate-600">{increase.notes}</p>
                      )}
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => window.location.href = `/leases/${increase.lease.id}`}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        View Lease →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
