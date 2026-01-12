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
  const [showFilters, setShowFilters] = useState(false);

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

  const hasActiveFilters = accountFilter || leaseFilter || debitCreditFilter || startDate || endDate;

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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Ledger</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">All accounting entries</p>
            </div>
            <button
              onClick={exportToCSV}
              className="w-full sm:w-auto px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-5">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Entries</div>
            <div className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">{entries.length}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-5">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Debits</div>
            <div className="text-lg sm:text-2xl font-bold text-blue-600">${totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-5">
            <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Credits</div>
            <div className="text-lg sm:text-2xl font-bold text-green-600">${totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Filters - Collapsible on mobile */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full px-4 py-3 flex items-center justify-between sm:hidden"
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="font-medium text-gray-900 dark:text-white">Filters</span>
              {hasActiveFilters && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Active</span>
              )}
            </div>
            <svg className={`w-5 h-5 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <div className={`${showFilters ? 'block' : 'hidden'} sm:block p-4`}>
            <div className="hidden sm:flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900 dark:text-white">Filters</h2>
              {hasActiveFilters && (
                <button onClick={clearFilters} className="text-sm text-blue-600 hover:text-blue-800">
                  Clear All
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Account</label>
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All</option>
                  {accounts.map((account) => (
                    <option key={account.code} value={account.code}>{account.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tenant</label>
                <select
                  value={leaseFilter}
                  onChange={(e) => setLeaseFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All</option>
                  {leases.map((lease) => (
                    <option key={lease.id} value={lease.id}>{lease.tenantName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                <select
                  value={debitCreditFilter}
                  onChange={(e) => setDebitCreditFilter(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white"
                >
                  <option value="">All</option>
                  <option value="DR">Debits</option>
                  <option value="CR">Credits</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-3 w-full sm:hidden py-2 text-sm text-blue-600 font-medium"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>

        {/* Ledger Entries */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="text-gray-900 dark:text-white font-medium mb-1">No entries found</div>
              <div className="text-gray-500 dark:text-gray-400 text-sm text-center">Try adjusting your filters</div>
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="sm:hidden divide-y divide-gray-200 dark:divide-gray-700">
                {entries.map((entry) => (
                  <div key={entry.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">{entry.description}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {entry.accountCode} · {entry.account.name}
                        </div>
                      </div>
                      <div className={`text-right font-semibold ${entry.debitCredit === 'DR' ? 'text-blue-600' : 'text-green-600'}`}>
                        {entry.debitCredit === 'DR' ? '' : ''}${parseFloat(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        <span className="text-xs ml-1">{entry.debitCredit}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{new Date(entry.entryDate).toLocaleDateString()}</span>
                      {entry.lease ? (
                        <Link href={`/leases/${entry.lease.id}`} className="text-blue-600">
                          {entry.lease.tenantName}
                        </Link>
                      ) : (
                        <span>{entry.postedBy}</span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Mobile Totals */}
                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Debits</span>
                    <span className="font-bold text-blue-600">${totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Total Credits</span>
                    <span className="font-bold text-green-600">${totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-gray-900 dark:text-white font-medium">Balance</span>
                    <span className={`font-bold ${totalDebits - totalCredits >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      ${Math.abs(totalDebits - totalCredits).toLocaleString('en-US', { minimumFractionDigits: 2 })} {totalDebits >= totalCredits ? 'DR' : 'CR'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Account</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tenant</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Debit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {entries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                          {new Date(entry.entryDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900 dark:text-white">{entry.accountCode}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{entry.account.name}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                          {entry.description}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                          {entry.lease ? (
                            <Link href={`/leases/${entry.lease.id}`} className="text-blue-600 hover:text-blue-800">
                              {entry.lease.tenantName}
                            </Link>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          {entry.debitCredit === 'DR' ? (
                            <span className="font-medium text-blue-600">${parseFloat(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                          {entry.debitCredit === 'CR' ? (
                            <span className="font-medium text-green-600">${parseFloat(entry.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 dark:bg-gray-900/50 border-t-2 border-gray-300 dark:border-gray-600">
                    <tr>
                      <td colSpan={4} className="px-4 py-3 text-sm font-bold text-gray-900 dark:text-white">TOTALS</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">
                        ${totalDebits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                        ${totalCredits.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">Balance (DR - CR)</td>
                      <td colSpan={2} className={`px-4 py-2 text-sm text-right font-bold ${totalDebits - totalCredits >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        ${Math.abs(totalDebits - totalCredits).toLocaleString('en-US', { minimumFractionDigits: 2 })} {totalDebits >= totalCredits ? 'DR' : 'CR'}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
