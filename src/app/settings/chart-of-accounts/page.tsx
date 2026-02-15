'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/Toast';

interface Account {
  code: string;
  name: string;
  description: string | null;
  type: 'ASSET' | 'LIABILITY' | 'INCOME' | 'EXPENSE' | 'EQUITY';
  normalBalance: 'DR' | 'CR';
  active: boolean;
  transactionCount: number;
  totalDebits: string;
  totalCredits: string;
}

interface Transaction {
  id: string;
  entryDate: string;
  amount: string;
  debitCredit: 'DR' | 'CR';
  description: string;
  postedBy: string;
  createdAt: string;
  voided: boolean;
  leaseId: string | null;
  unitNumber: string | null;
  propertyName: string | null;
}

const ACCOUNT_TYPES = [
  { value: 'ASSET', label: 'Asset', normalBalance: 'DR' },
  { value: 'LIABILITY', label: 'Liability', normalBalance: 'CR' },
  { value: 'INCOME', label: 'Income', normalBalance: 'CR' },
  { value: 'EXPENSE', label: 'Expense', normalBalance: 'DR' },
  { value: 'EQUITY', label: 'Equity', normalBalance: 'CR' },
];

type SortField = 'code' | 'name' | 'transactionCount' | 'balance';
type SortDirection = 'asc' | 'desc';

export default function ChartOfAccountsPage() {
  const { showSuccess, showError } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [saving, setSaving] = useState(false);
  const [sortField, setSortField] = useState<SortField>('code');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Transaction drill-down state
  const [showTransactions, setShowTransactions] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsSummary, setTransactionsSummary] = useState({ totalDebits: 0, totalCredits: 0 });

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    type: 'EXPENSE' as Account['type'],
    active: true,
  });

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/chart-of-accounts');
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (accountCode: string) => {
    setTransactionsLoading(true);
    try {
      const res = await fetch(`/api/chart-of-accounts/${accountCode}/transactions?limit=100`);
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions);
        setTransactionsSummary(data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const openTransactionsModal = (account: Account) => {
    setSelectedAccount(account);
    setShowTransactions(true);
    fetchTransactions(account.code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const normalBalance = ACCOUNT_TYPES.find(t => t.value === formData.type)?.normalBalance || 'DR';

      const url = editingAccount
        ? `/api/chart-of-accounts/${editingAccount.code}`
        : '/api/chart-of-accounts';

      const res = await fetch(url, {
        method: editingAccount ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          normalBalance,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save account');
      }

      await fetchAccounts();
      closeModal();
      showSuccess(editingAccount ? 'Account updated' : 'Account created');
    } catch (error: any) {
      showError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (account: Account) => {
    try {
      const res = await fetch(`/api/chart-of-accounts/${account.code}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...account,
          active: !account.active,
        }),
      });

      if (res.ok) {
        await fetchAccounts();
        showSuccess(`Account ${account.active ? 'deactivated' : 'activated'}`);
      }
    } catch (error) {
      console.error('Failed to toggle account:', error);
      showError('Failed to update account');
    }
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      type: 'EXPENSE',
      active: true,
    });
    setShowModal(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      code: account.code,
      name: account.name,
      description: account.description || '',
      type: account.type,
      active: account.active,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAccount(null);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'ASSET': return 'bg-blue-100 text-blue-800';
      case 'LIABILITY': return 'bg-red-100 text-red-800';
      case 'INCOME': return 'bg-green-100 text-green-800';
      case 'EXPENSE': return 'bg-orange-100 text-orange-800';
      case 'EQUITY': return 'bg-purple-100 text-purple-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const calculateBalance = (account: Account) => {
    const debits = parseFloat(account.totalDebits) || 0;
    const credits = parseFloat(account.totalCredits) || 0;
    // For debit-normal accounts (Assets, Expenses): Balance = Debits - Credits
    // For credit-normal accounts (Liabilities, Income, Equity): Balance = Credits - Debits
    if (account.normalBalance === 'DR') {
      return debits - credits;
    }
    return credits - debits;
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'transactionCount' || field === 'balance' ? 'desc' : 'asc');
    }
  };

  const sortAccounts = (accountList: Account[]) => {
    return [...accountList].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'code':
          comparison = a.code.localeCompare(b.code);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'transactionCount':
          comparison = a.transactionCount - b.transactionCount;
          break;
        case 'balance':
          comparison = calculateBalance(a) - calculateBalance(b);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  const filteredAccounts = filter === 'all'
    ? accounts
    : accounts.filter(a => a.type === filter);

  const groupedAccounts = filteredAccounts.reduce((groups, account) => {
    const type = account.type;
    if (!groups[type]) groups[type] = [];
    groups[type].push(account);
    return groups;
  }, {} as Record<string, Account[]>);

  // Calculate totals for summary
  const totalTransactions = filteredAccounts.reduce((sum, a) => sum + a.transactionCount, 0);
  const accountsWithActivity = filteredAccounts.filter(a => a.transactionCount > 0).length;

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chart of Accounts</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage your accounting categories for income and expenses
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + Add Account
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-2xl font-bold text-slate-900">{accounts.length}</div>
          <div className="text-sm text-slate-500">Total Accounts</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-2xl font-bold text-blue-600">{accountsWithActivity}</div>
          <div className="text-sm text-slate-500">With Activity</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-2xl font-bold text-green-600">{totalTransactions}</div>
          <div className="text-sm text-slate-500">Total Transactions</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200">
          <div className="text-2xl font-bold text-slate-900">
            {accounts.filter(a => !a.active).length}
          </div>
          <div className="text-sm text-slate-500">Inactive</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
          }`}
        >
          All ({accounts.length})
        </button>
        {ACCOUNT_TYPES.map(type => (
          <button
            key={type.value}
            onClick={() => setFilter(type.value)}
            className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
              filter === type.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            {type.label} ({accounts.filter(a => a.type === type.value).length})
          </button>
        ))}
      </div>

      {/* Sort Controls */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-slate-500">Sort by:</span>
        {[
          { field: 'code' as SortField, label: 'Code' },
          { field: 'name' as SortField, label: 'Name' },
          { field: 'transactionCount' as SortField, label: 'Transactions' },
          { field: 'balance' as SortField, label: 'Balance' },
        ].map(({ field, label }) => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
              sortField === field
                ? 'bg-blue-100 text-blue-700'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {label}
            {sortField === field && (
              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        ))}
      </div>

      {/* Accounts List */}
      <div className="space-y-6">
        {Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
          <div key={type} className="bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${getTypeColor(type)}`}>
                  {type}
                </span>
                <span className="text-slate-500 text-sm font-normal">
                  ({typeAccounts.length} accounts)
                </span>
              </h2>
            </div>
            <div className="divide-y divide-slate-200">
              {sortAccounts(typeAccounts).map(account => (
                <div key={account.code} className={`px-6 py-4 flex items-center justify-between ${!account.active ? 'opacity-50' : ''}`}>
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="font-mono text-sm font-semibold text-slate-600 w-16 flex-shrink-0">
                      {account.code}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900">{account.name}</div>
                      {account.description && (
                        <div className="text-sm text-slate-600 mt-0.5">
                          {account.description}
                        </div>
                      )}
                      <div className="text-xs text-slate-500 mt-1">
                        Increases with: {account.normalBalance === 'DR' ? 'Money In' : 'Money Out'}
                        {!account.active && <span className="ml-2 text-red-500">(Inactive)</span>}
                      </div>
                    </div>
                    {/* Transaction Count & Balance - More Visible */}
                    <div className="flex-shrink-0 text-right mr-4">
                      {account.transactionCount > 0 ? (
                        <button
                          onClick={() => openTransactionsModal(account)}
                          className="group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-50 px-3 py-2 rounded-lg group-hover:bg-blue-100 transition-colors">
                              <div className="text-lg font-bold text-blue-600">
                                {account.transactionCount}
                              </div>
                              <div className="text-xs text-blue-500">transactions</div>
                            </div>
                            <div className="bg-green-50 px-3 py-2 rounded-lg group-hover:bg-green-100 transition-colors">
                              <div className="text-lg font-bold text-green-600">
                                {formatCurrency(calculateBalance(account))}
                              </div>
                              <div className="text-xs text-green-500">balance</div>
                            </div>
                          </div>
                          <div className="text-xs text-blue-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            Click to view details →
                          </div>
                        </button>
                      ) : (
                        <div className="bg-slate-50 px-3 py-2 rounded-lg">
                          <div className="text-lg font-bold text-slate-400">0</div>
                          <div className="text-xs text-slate-400">transactions</div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(account)}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(account)}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        account.active
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                    >
                      {account.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {filteredAccounts.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <p className="text-slate-500">No accounts found</p>
          </div>
        )}
      </div>

      {/* Edit/Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">
                {editingAccount ? 'Edit Account' : 'Add New Account'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Account Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  disabled={!!editingAccount}
                  placeholder="e.g., 4200"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 disabled:opacity-50"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use 1xxx for Assets, 2xxx for Liabilities, 4xxx for Income, 5xxx for Expenses
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Laundry Income"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="What is this account used for? (e.g., Money tenants pay each month for rent)"
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900 resize-none"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Plain English explanation of when to use this account
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Account Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Account['type'] })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-slate-900"
                >
                  {ACCOUNT_TYPES.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="active" className="text-sm text-slate-700">
                  Active
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingAccount ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transactions Drill-Down Modal */}
      {showTransactions && selectedAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedAccount.code} - {selectedAccount.name}
                  </h3>
                  <p className="text-sm text-slate-500 mt-1">
                    {selectedAccount.description || 'No description'}
                  </p>
                </div>
                <button
                  onClick={() => setShowTransactions(false)}
                  className="p-2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Summary */}
              <div className="flex gap-6 mt-4">
                <div className="text-center">
                  <div className="text-xs text-slate-500 uppercase">Money In</div>
                  <div className="text-lg font-semibold text-green-600">
                    {formatCurrency(transactionsSummary.totalDebits)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 uppercase">Money Out</div>
                  <div className="text-lg font-semibold text-red-600">
                    {formatCurrency(transactionsSummary.totalCredits)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-slate-500 uppercase">Net Balance</div>
                  <div className="text-lg font-semibold text-blue-600">
                    {formatCurrency(calculateBalance(selectedAccount))}
                  </div>
                </div>
              </div>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto">
              {transactionsLoading ? (
                <div className="p-8 text-center text-slate-500">Loading transactions...</div>
              ) : transactions.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No transactions found</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Description</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Property/Unit</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-green-600 uppercase">In (+)</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-red-600 uppercase">Out (-)</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className={`hover:bg-slate-50 ${tx.voided ? 'opacity-50 line-through' : ''}`}
                      >
                        <td className="px-4 py-3 text-sm text-slate-900 whitespace-nowrap">
                          {formatDate(tx.entryDate)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {tx.description}
                          {tx.voided && <span className="ml-2 text-red-500 text-xs">(VOIDED)</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-500">
                          {tx.propertyName && tx.unitNumber
                            ? `${tx.propertyName} - ${tx.unitNumber}`
                            : tx.propertyName || '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono">
                          {tx.debitCredit === 'DR' ? (
                            <span className="text-green-600 font-medium">+{formatCurrency(tx.amount)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-mono">
                          {tx.debitCredit === 'CR' ? (
                            <span className="text-red-600 font-medium">-{formatCurrency(tx.amount)}</span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            {tx.leaseId && (
                              <a
                                href={`/leases/${tx.leaseId}`}
                                className="text-blue-600 hover:underline text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Lease
                              </a>
                            )}
                            <a
                              href={`/ledger?entry=${tx.id}`}
                              className="text-blue-600 hover:underline text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              View Entry
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-200 flex-shrink-0">
              <button
                onClick={() => setShowTransactions(false)}
                className="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
