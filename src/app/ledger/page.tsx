'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface LedgerEntry {
  id: string;
  createdAt: string;
  entryDate: string;
  accountCode: string;
  amount: string;
  debitCredit: 'DR' | 'CR';
  description: string;
  status: string;
  postedBy: string;
  leaseId: string | null;
  account: {
    code: string;
    name: string;
    type: string;
    normalBalance: 'DR' | 'CR';
  };
  lease: {
    id: string;
    tenantName: string;
  } | null;
}

interface Account {
  code: string;
  name: string;
  type: string;
}

interface Lease {
  id: string;
  tenantName: string;
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [accountFilter, setAccountFilter] = useState('');
  const [leaseFilter, setLeaseFilter] = useState('');
  const [debitCreditFilter, setDebitCreditFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    fetchAccounts();
    fetchLeases();
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [accountFilter, leaseFilter, debitCreditFilter, startDate, endDate]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (accountFilter) params.append('accountCode', accountFilter);
      if (leaseFilter) params.append('leaseId', leaseFilter);
      if (debitCreditFilter) params.append('debitCredit', debitCreditFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/ledger?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch ledger entries');
      const data = await res.json();
      setEntries(data);
    } catch (error) {
      console.error('Failed to fetch ledger entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/chart-of-accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    }
  };

  const fetchLeases = async () => {
    try {
      const res = await fetch('/api/leases');
      if (res.ok) {
        const data = await res.json();
        setLeases(data);
      }
    } catch (error) {
      console.error('Failed to fetch leases:', error);
    }
  };

  const clearFilters = () => {
    setAccountFilter('');
    setLeaseFilter('');
    setDebitCreditFilter('');
    setStartDate('');
    setEndDate('');
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Account Code', 'Account Name', 'Description', 'DR/CR', 'Amount', 'Tenant', 'Posted By'];
    const rows = entries.map(entry => [
      new Date(entry.entryDate).toLocaleDateString(),
      entry.accountCode,
      entry.account.name,
      entry.description,
      entry.debitCredit,
      entry.amount,
      entry.lease?.tenantName || '',
      entry.postedBy
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Calculate running balance and totals
  const totalDebits = entries
    .filter(e => e.debitCredit === 'DR')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const totalCredits = entries
    .filter(e => e.debitCredit === 'CR')
    .reduce((sum, e) => sum + parseFloat(e.amount), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">General Ledger</h1>
              <p className="text-gray-600 mt-1">View all accounting entries</p>
            </div>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Entries</div>
            <div className="text-3xl font-bold text-gray-900">{entries.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Debits</div>
            <div className="text-3xl font-bold text-blue-600">${totalDebits.toFixed(2)}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600 mb-1">Total Credits</div>
            <div className="text-3xl font-bold text-green-600">${totalCredits.toFixed(2)}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            {(accountFilter || leaseFilter || debitCreditFilter || startDate || endDate) && (
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account</label>
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Accounts</option>
                {accounts.map((account) => (
                  <option key={account.code} value={account.code}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tenant/Lease</label>
              <select
                value={leaseFilter}
                onChange={(e) => setLeaseFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Tenants</option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.tenantName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={debitCreditFilter}
                onChange={(e) => setDebitCreditFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All (DR & CR)</option>
                <option value="DR">Debits Only</option>
                <option value="CR">Credits Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-gray-500">Loading entries...</div>
              </div>
            ) : entries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="text-gray-900 font-medium mb-1">No entries found</div>
                <div className="text-gray-500 text-sm">Try adjusting your filters</div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Debit
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Credit
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Posted By
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(entry.entryDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="font-medium text-gray-900">{entry.accountCode}</div>
                        <div className="text-xs text-gray-500">{entry.account.name}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                        {entry.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {entry.lease ? (
                          <Link
                            href={`/leases/${entry.lease.id}`}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            {entry.lease.tenantName}
                          </Link>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {entry.debitCredit === 'DR' ? (
                          <span className="font-medium text-blue-600">
                            ${parseFloat(entry.amount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                        {entry.debitCredit === 'CR' ? (
                          <span className="font-medium text-green-600">
                            ${parseFloat(entry.amount).toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {entry.postedBy}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-sm font-bold text-gray-900">
                      TOTALS
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600">
                      ${totalDebits.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                      ${totalCredits.toFixed(2)}
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-6 py-3 text-sm font-medium text-gray-700">
                      Balance (DR - CR)
                    </td>
                    <td colSpan={3} className={`px-6 py-3 text-sm text-right font-bold ${
                      totalDebits - totalCredits >= 0 ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      ${Math.abs(totalDebits - totalCredits).toFixed(2)} {totalDebits >= totalCredits ? 'DR' : 'CR'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
