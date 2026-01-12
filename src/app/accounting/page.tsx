'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type TabType = 'balances' | 'ledger';

interface TenantBalance {
  leaseId: string;
  tenantName: string;
  unitName: string;
  propertyName: string | null;
  status: string;
  balance: number;
  monthlyRent: number | null;
}

interface LedgerEntry {
  id: string;
  entryDate: string;
  accountCode: string;
  amount: string;
  debitCredit: 'DR' | 'CR';
  description: string;
  postedBy: string;
  account: {
    code: string;
    name: string;
  };
  lease: {
    id: string;
    tenantName: string;
  } | null;
}

interface Account {
  code: string;
  name: string;
}

interface Lease {
  id: string;
  tenantName: string;
}

interface Property {
  id: string;
  name: string;
}

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState<TabType>('balances');

  // Balances state
  const [tenants, setTenants] = useState<TenantBalance[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'owing' | 'credit'>('all');

  // Ledger state
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [accountFilter, setAccountFilter] = useState('');
  const [leaseFilter, setLeaseFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);

  // Bulk charge state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkPreview, setBulkPreview] = useState<any[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [chargeDate, setChargeDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkResults, setBulkResults] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'ledger') {
      fetchLedgerEntries();
    }
  }, [activeTab, accountFilter, leaseFilter, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balancesRes, propertiesRes, accountsRes, leasesRes] = await Promise.all([
        fetch('/api/reports/tenant-balances'),
        fetch('/api/properties'),
        fetch('/api/chart-of-accounts'),
        fetch('/api/leases')
      ]);

      if (balancesRes.ok) {
        const data = await balancesRes.json();
        setTenants(data.tenants || []);
      }
      if (propertiesRes.ok) setProperties(await propertiesRes.json());
      if (accountsRes.ok) setAccounts(await accountsRes.json());
      if (leasesRes.ok) setLeases(await leasesRes.json());
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedgerEntries = async () => {
    try {
      const params = new URLSearchParams();
      if (accountFilter) params.append('accountCode', accountFilter);
      if (leaseFilter) params.append('leaseId', leaseFilter);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/ledger?${params.toString()}`);
      if (res.ok) setEntries(await res.json());
    } catch (error) {
      console.error('Failed to fetch ledger:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Filter tenants
  const getFilteredTenants = () => {
    let filtered = tenants;

    if (selectedProperty !== 'all') {
      const prop = properties.find(p => p.id === selectedProperty);
      if (prop) filtered = filtered.filter(t => t.propertyName === prop.name);
    }

    switch (balanceFilter) {
      case 'owing': return filtered.filter(t => t.balance > 0);
      case 'credit': return filtered.filter(t => t.balance < 0);
      default: return filtered;
    }
  };

  const filteredTenants = getFilteredTenants();
  const totalOwed = filteredTenants.filter(t => t.balance > 0).reduce((sum, t) => sum + t.balance, 0);
  const totalCredits = Math.abs(filteredTenants.filter(t => t.balance < 0).reduce((sum, t) => sum + t.balance, 0));

  // Ledger totals
  const totalDebits = entries.filter(e => e.debitCredit === 'DR').reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const totalCreditsLedger = entries.filter(e => e.debitCredit === 'CR').reduce((sum, e) => sum + parseFloat(e.amount), 0);

  const handleGenerateRent = async () => {
    setBulkLoading(true);
    setBulkResults(null);
    try {
      const res = await fetch('/api/charges/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: true, chargeDate })
      });
      if (res.ok) {
        const data = await res.json();
        setBulkPreview(data.charges || []);
        setShowBulkModal(true);
      }
    } catch (error) {
      console.error('Failed to fetch preview:', error);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleConfirmCharges = async () => {
    setBulkLoading(true);
    try {
      const res = await fetch('/api/charges/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preview: false, chargeDate })
      });
      if (res.ok) {
        const result = await res.json();
        setBulkResults(result);
        fetchData();
      }
    } catch (error) {
      console.error('Failed to post charges:', error);
    } finally {
      setBulkLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Account', 'Description', 'Debit', 'Credit', 'Tenant'];
    const rows = entries.map(e => [
      new Date(e.entryDate).toLocaleDateString(),
      `${e.accountCode} - ${e.account.name}`,
      e.description,
      e.debitCredit === 'DR' ? e.amount : '',
      e.debitCredit === 'CR' ? e.amount : '',
      e.lease?.tenantName || ''
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Accounting</h1>
              <p className="text-sm text-gray-600 mt-1">Manage finances and view reports</p>
            </div>
            <div className="flex gap-3">
              {activeTab === 'balances' && (
                <button
                  onClick={handleGenerateRent}
                  disabled={bulkLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {bulkLoading ? 'Loading...' : 'Charge Rent'}
                </button>
              )}
              {activeTab === 'ledger' && (
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  Export CSV
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('balances')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'balances'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Tenant Balances
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'ledger'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              Transactions
            </button>
          </div>
        </div>

        {/* Balances Tab */}
        {activeTab === 'balances' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600">Total Tenants</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{filteredTenants.length}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600">Owing</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(totalOwed)}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600">Credits</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalCredits)}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600">Net Balance</p>
                <p className={`text-2xl font-bold mt-1 ${totalOwed - totalCredits >= 0 ? 'text-gray-900' : 'text-green-600'}`}>
                  {formatCurrency(totalOwed - totalCredits)}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <select
                  value={selectedProperty}
                  onChange={(e) => setSelectedProperty(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="all">All Properties</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  {(['all', 'owing', 'credit'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setBalanceFilter(f)}
                      className={`px-4 py-2 text-sm font-medium ${
                        balanceFilter === f
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {f === 'all' ? 'All' : f === 'owing' ? 'Owing' : 'Credit'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Tenant Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {filteredTenants.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No tenants found</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tenant</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Unit</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Monthly Rent</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Balance</th>
                      <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredTenants.map(t => (
                      <tr key={t.leaseId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">{t.tenantName}</div>
                          {t.propertyName && <div className="text-sm text-gray-500">{t.propertyName}</div>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{t.unitName}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {t.monthlyRent ? formatCurrency(t.monthlyRent) : '-'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-semibold ${
                            t.balance > 0 ? 'text-red-600' : t.balance < 0 ? 'text-green-600' : 'text-gray-900'
                          }`}>
                            {formatCurrency(t.balance)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link href={`/leases/${t.leaseId}`} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Ledger Tab */}
        {activeTab === 'ledger' && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{entries.length}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600">Total Debits</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(totalDebits)}</p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                <p className="text-sm text-gray-600">Total Credits</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalCreditsLedger)}</p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <select
                  value={accountFilter}
                  onChange={(e) => setAccountFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Accounts</option>
                  {accounts.map(a => (
                    <option key={a.code} value={a.code}>{a.name}</option>
                  ))}
                </select>
                <select
                  value={leaseFilter}
                  onChange={(e) => setLeaseFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All Tenants</option>
                  {leases.map(l => (
                    <option key={l.id} value={l.id}>{l.tenantName}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Start Date"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="End Date"
                />
              </div>
            </div>

            {/* Ledger Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {entries.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No entries found</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Account</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Tenant</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Debit</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Credit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {entries.map(e => (
                      <tr key={e.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {new Date(e.entryDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{e.accountCode}</div>
                          <div className="text-xs text-gray-500">{e.account.name}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {e.description}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          {e.lease ? (
                            <Link href={`/leases/${e.lease.id}`} className="text-blue-600 hover:text-blue-800">
                              {e.lease.tenantName}
                            </Link>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          {e.debitCredit === 'DR' ? (
                            <span className="font-medium text-blue-600">{formatCurrency(parseFloat(e.amount))}</span>
                          ) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right">
                          {e.debitCredit === 'CR' ? (
                            <span className="font-medium text-green-600">{formatCurrency(parseFloat(e.amount))}</span>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                    <tr>
                      <td colSpan={4} className="px-6 py-3 text-sm font-bold text-gray-900">TOTALS</td>
                      <td className="px-6 py-3 text-right font-bold text-blue-600">{formatCurrency(totalDebits)}</td>
                      <td className="px-6 py-3 text-right font-bold text-green-600">{formatCurrency(totalCreditsLedger)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bulk Charge Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {bulkResults ? 'Charges Posted' : 'Charge Rent'}
              </h2>
            </div>
            <div className="p-6">
              {bulkResults ? (
                <div className="space-y-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-green-800 font-medium">
                      Successfully posted {bulkResults.results?.length || 0} charges
                    </p>
                    <p className="text-green-700 text-sm mt-1">
                      Total: {formatCurrency(bulkResults.results?.reduce((s: number, r: any) => s + r.amount, 0) || 0)}
                    </p>
                  </div>
                  <button
                    onClick={() => { setShowBulkModal(false); setBulkResults(null); }}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Charge Date</label>
                    <input
                      type="date"
                      value={chargeDate}
                      onChange={(e) => setChargeDate(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  {bulkPreview.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No active leases with rent amounts</p>
                  ) : (
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-medium">Tenant</th>
                            <th className="px-4 py-2 text-right font-medium">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {bulkPreview.map((c: any) => (
                            <tr key={c.leaseId}>
                              <td className="px-4 py-2">{c.tenantName}</td>
                              <td className="px-4 py-2 text-right font-medium">{formatCurrency(c.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="bg-blue-50 px-4 py-3 flex justify-between">
                        <span className="font-medium">Total:</span>
                        <span className="font-bold">{formatCurrency(bulkPreview.reduce((s, c) => s + c.amount, 0))}</span>
                      </div>
                    </div>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowBulkModal(false)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleConfirmCharges}
                      disabled={bulkLoading || bulkPreview.length === 0}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
                    >
                      {bulkLoading ? 'Posting...' : 'Post Charges'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
