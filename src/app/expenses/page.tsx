'use client';

import { useState, useEffect } from 'react';

interface Property {
  id: string;
  name: string;
  address: string;
}

interface Vendor {
  id: string;
  name: string;
  company: string | null;
}

interface ExpenseAccount {
  code: string;
  name: string;
}

interface Expense {
  id: string;
  date: string;
  accountCode: string;
  accountName: string;
  description: string;
  amount: number;
  propertyName: string | null;
  unitName: string | null;
  postedBy: string;
}

interface ScheduledExpense {
  id: string;
  propertyId: string;
  property: { id: string; name: string; address: string };
  vendor: { id: string; name: string; company: string | null } | null;
  description: string;
  amount: number;
  chargeDay: number;
  accountCode: string;
  vendorId: string | null;
  requiresConfirmation: boolean;
  active: boolean;
  lastPostedDate: string | null;
  notes: string | null;
}

interface PendingExpense {
  id: string;
  scheduledExpenseId: string;
  propertyId: string;
  property: { name: string };
  vendor: { name: string } | null;
  description: string;
  amount: number;
  accountCode: string;
  dueDate: string;
  status: string;
}

type TabType = 'one-time' | 'recurring' | 'pending';

export default function ExpensesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('one-time');
  const [loading, setLoading] = useState(true);
  const [properties, setProperties] = useState<Property[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccount[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [scheduledExpenses, setScheduledExpenses] = useState<ScheduledExpense[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [summary, setSummary] = useState({ totalExpenses: 0, count: 0 });

  // One-time expense form
  const [showOneTimeForm, setShowOneTimeForm] = useState(false);
  const [oneTimeForm, setOneTimeForm] = useState({
    accountCode: '5000',
    amount: '',
    description: '',
    entryDate: new Date().toISOString().split('T')[0],
    propertyId: '',
    vendorId: ''
  });

  // Scheduled expense form
  const [showScheduledForm, setShowScheduledForm] = useState(false);
  const [editingScheduled, setEditingScheduled] = useState<ScheduledExpense | null>(null);
  const [scheduledForm, setScheduledForm] = useState({
    propertyId: '',
    description: '',
    amount: '',
    chargeDay: '1',
    accountCode: '5000',
    vendorId: '',
    requiresConfirmation: false,
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'one-time') {
      loadExpenses();
    } else if (activeTab === 'recurring') {
      loadScheduledExpenses();
    } else if (activeTab === 'pending') {
      loadPendingExpenses();
    }
  }, [activeTab]);

  async function loadData() {
    try {
      const [propsRes, vendorsRes, expensesRes] = await Promise.all([
        fetch('/api/properties'),
        fetch('/api/vendors'),
        fetch('/api/expenses')
      ]);

      if (propsRes.ok) {
        const propsData = await propsRes.json();
        setProperties(propsData.properties || propsData);
      }
      if (vendorsRes.ok) {
        const vendorsData = await vendorsRes.json();
        setVendors(vendorsData.vendors || vendorsData);
      }
      if (expensesRes.ok) {
        const data = await expensesRes.json();
        setExpenses(data.expenses || []);
        setExpenseAccounts(data.expenseAccounts || []);
        setSummary(data.summary || { totalExpenses: 0, count: 0 });
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadExpenses() {
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setSummary(data.summary || { totalExpenses: 0, count: 0 });
      }
    } catch (err) {
      console.error('Failed to load expenses:', err);
    }
  }

  async function loadScheduledExpenses() {
    try {
      const res = await fetch('/api/scheduled-expenses');
      if (res.ok) {
        const data = await res.json();
        setScheduledExpenses(data.scheduledExpenses || []);
      }
    } catch (err) {
      console.error('Failed to load scheduled expenses:', err);
    }
  }

  async function loadPendingExpenses() {
    try {
      const res = await fetch('/api/pending-expenses');
      if (res.ok) {
        const data = await res.json();
        setPendingExpenses(data.pendingExpenses || []);
      }
    } catch (err) {
      console.error('Failed to load pending expenses:', err);
    }
  }

  async function handleOneTimeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oneTimeForm)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to record expense');
      }

      setSuccess('Expense recorded successfully!');
      setShowOneTimeForm(false);
      setShowOptionalFields(false);
      setOneTimeForm({
        accountCode: '5000',
        amount: '',
        description: '',
        entryDate: new Date().toISOString().split('T')[0],
        propertyId: '',
        vendorId: ''
      });
      loadExpenses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScheduledSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const url = editingScheduled
        ? `/api/scheduled-expenses/${editingScheduled.id}`
        : '/api/scheduled-expenses';

      const res = await fetch(url, {
        method: editingScheduled ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduledForm)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save scheduled expense');
      }

      setSuccess(editingScheduled ? 'Scheduled expense updated!' : 'Scheduled expense created!');
      setShowScheduledForm(false);
      setEditingScheduled(null);
      resetScheduledForm();
      loadScheduledExpenses();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteScheduled(id: string) {
    if (!confirm('Are you sure you want to delete this scheduled expense?')) return;

    try {
      const res = await fetch(`/api/scheduled-expenses/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      setSuccess('Scheduled expense deleted');
      loadScheduledExpenses();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleToggleActive(expense: ScheduledExpense) {
    try {
      const res = await fetch(`/api/scheduled-expenses/${expense.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !expense.active })
      });
      if (!res.ok) throw new Error('Failed to update');
      loadScheduledExpenses();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleConfirmPending(id: string) {
    try {
      const res = await fetch(`/api/pending-expenses/${id}/confirm`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to confirm');
      }
      setSuccess('Expense confirmed and posted!');
      loadPendingExpenses();
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function handleSkipPending(id: string) {
    if (!confirm('Skip this expense? It will not be posted to the ledger.')) return;

    try {
      const res = await fetch(`/api/pending-expenses/${id}/skip`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to skip');
      }
      setSuccess('Expense skipped');
      loadPendingExpenses();
    } catch (err: any) {
      setError(err.message);
    }
  }

  function resetScheduledForm() {
    setScheduledForm({
      propertyId: '',
      description: '',
      amount: '',
      chargeDay: '1',
      accountCode: '5000',
      vendorId: '',
      requiresConfirmation: false,
      notes: ''
    });
  }

  function startEditScheduled(expense: ScheduledExpense) {
    setEditingScheduled(expense);
    setScheduledForm({
      propertyId: expense.propertyId,
      description: expense.description,
      amount: expense.amount.toString(),
      chargeDay: expense.chargeDay.toString(),
      accountCode: expense.accountCode,
      vendorId: expense.vendorId || '',
      requiresConfirmation: expense.requiresConfirmation,
      notes: expense.notes || ''
    });
    setShowScheduledForm(true);
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Expenses</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Manage property expenses and recurring payments
        </p>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg">
          {error}
          <button onClick={() => setError('')} className="float-right font-bold">×</button>
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg">
          {success}
          <button onClick={() => setSuccess('')} className="float-right font-bold">×</button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('one-time')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'one-time'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            One-Time Expenses
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'recurring'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Recurring Expenses
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors relative ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            Pending Confirmation
            {pendingExpenses.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-orange-500 text-white rounded-full">
                {pendingExpenses.length}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* One-Time Expenses Tab */}
      {activeTab === 'one-time' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              Total this month: <span className="font-semibold text-slate-900 dark:text-white">
                ${summary.totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
              {' '}({summary.count} expenses)
            </div>
            <button
              onClick={() => setShowOneTimeForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Record Expense
            </button>
          </div>

          {/* One-Time Form Modal */}
          {showOneTimeForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  Record One-Time Expense
                </h2>
                <form onSubmit={handleOneTimeSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Expense Type *
                    </label>
                    <select
                      value={oneTimeForm.accountCode}
                      onChange={(e) => setOneTimeForm({ ...oneTimeForm, accountCode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      required
                    >
                      {expenseAccounts.map(acc => (
                        <option key={acc.code} value={acc.code}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Amount *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={oneTimeForm.amount}
                      onChange={(e) => setOneTimeForm({ ...oneTimeForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={oneTimeForm.description}
                      onChange={(e) => setOneTimeForm({ ...oneTimeForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      placeholder="e.g., HVAC repair"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Date
                    </label>
                    <input
                      type="date"
                      value={oneTimeForm.entryDate}
                      onChange={(e) => setOneTimeForm({ ...oneTimeForm, entryDate: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    />
                  </div>
                  {!showOptionalFields ? (
                    <button
                      type="button"
                      onClick={() => setShowOptionalFields(true)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                    >
                      + Add property or vendor
                    </button>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Property (optional)
                        </label>
                        <select
                          value={oneTimeForm.propertyId}
                          onChange={(e) => setOneTimeForm({ ...oneTimeForm, propertyId: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        >
                          <option value="">-- Select Property --</option>
                          {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          Vendor (optional)
                        </label>
                        <select
                          value={oneTimeForm.vendorId}
                          onChange={(e) => setOneTimeForm({ ...oneTimeForm, vendorId: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        >
                          <option value="">-- Select Vendor --</option>
                          {vendors.map(v => (
                            <option key={v.id} value={v.id}>{v.name}{v.company ? ` (${v.company})` : ''}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowOneTimeForm(false);
                        setShowOptionalFields(false);
                      }}
                      className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : 'Record Expense'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Expenses Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Property</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-400 uppercase">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                      No expenses recorded this month
                    </td>
                  </tr>
                ) : (
                  expenses.map(expense => (
                    <tr key={expense.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                        {expense.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {expense.accountName}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-400">
                        {expense.propertyName || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-red-600 dark:text-red-400">
                        ${expense.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recurring Expenses Tab */}
      {activeTab === 'recurring' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Set up recurring expenses that auto-post monthly
            </p>
            <button
              onClick={() => {
                setEditingScheduled(null);
                resetScheduledForm();
                setShowScheduledForm(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Add Recurring Expense
            </button>
          </div>

          {/* Scheduled Form Modal */}
          {showScheduledForm && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                  {editingScheduled ? 'Edit Recurring Expense' : 'Add Recurring Expense'}
                </h2>
                <form onSubmit={handleScheduledSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Property *
                    </label>
                    <select
                      value={scheduledForm.propertyId}
                      onChange={(e) => setScheduledForm({ ...scheduledForm, propertyId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      required
                    >
                      <option value="">-- Select Property --</option>
                      {properties.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Description *
                    </label>
                    <input
                      type="text"
                      value={scheduledForm.description}
                      onChange={(e) => setScheduledForm({ ...scheduledForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      placeholder="e.g., Monthly Landscaping"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Amount *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={scheduledForm.amount}
                        onChange={(e) => setScheduledForm({ ...scheduledForm, amount: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Day of Month *
                      </label>
                      <select
                        value={scheduledForm.chargeDay}
                        onChange={(e) => setScheduledForm({ ...scheduledForm, chargeDay: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                        required
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Expense Type *
                    </label>
                    <select
                      value={scheduledForm.accountCode}
                      onChange={(e) => setScheduledForm({ ...scheduledForm, accountCode: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      required
                    >
                      {expenseAccounts.map(acc => (
                        <option key={acc.code} value={acc.code}>{acc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Vendor (optional)
                    </label>
                    <select
                      value={scheduledForm.vendorId}
                      onChange={(e) => setScheduledForm({ ...scheduledForm, vendorId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                    >
                      <option value="">-- Select Vendor --</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.name}{v.company ? ` (${v.company})` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scheduledForm.requiresConfirmation}
                        onChange={(e) => setScheduledForm({ ...scheduledForm, requiresConfirmation: e.target.checked })}
                        className="mt-1 w-4 h-4 text-blue-600 rounded"
                      />
                      <div>
                        <span className="font-medium text-slate-900 dark:text-white">Requires Confirmation</span>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                          Enable this if the service might not happen (e.g., landscaping during winter).
                          You'll be asked to confirm before it posts to the ledger.
                        </p>
                      </div>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={scheduledForm.notes}
                      onChange={(e) => setScheduledForm({ ...scheduledForm, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                      rows={2}
                      placeholder="Any additional notes..."
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowScheduledForm(false);
                        setEditingScheduled(null);
                      }}
                      className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {submitting ? 'Saving...' : editingScheduled ? 'Update' : 'Create'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Scheduled Expenses List */}
          <div className="space-y-4">
            {scheduledExpenses.length === 0 ? (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-700">
                <p className="text-slate-500 dark:text-slate-400">No recurring expenses set up yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                  Click "Add Recurring Expense" to set up automatic monthly expenses
                </p>
              </div>
            ) : (
              scheduledExpenses.map(expense => (
                <div
                  key={expense.id}
                  className={`bg-white dark:bg-slate-800 rounded-xl p-4 border ${
                    expense.active
                      ? 'border-slate-200 dark:border-slate-700'
                      : 'border-slate-200 dark:border-slate-700 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-slate-900 dark:text-white">
                          {expense.description}
                        </h3>
                        {expense.requiresConfirmation && (
                          <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
                            Needs Confirmation
                          </span>
                        )}
                        {!expense.active && (
                          <span className="px-2 py-0.5 text-xs bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded">
                            Paused
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {expense.property.name} • Posts on day {expense.chargeDay} each month
                        {expense.vendor && ` • ${expense.vendor.name}`}
                      </p>
                      {expense.notes && (
                        <p className="text-sm text-slate-500 dark:text-slate-500 mt-1 italic">
                          {expense.notes}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-slate-900 dark:text-white">
                        ${Number(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {expense.lastPostedDate
                          ? `Last: ${new Date(expense.lastPostedDate).toLocaleDateString()}`
                          : 'Not yet posted'}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => startEditScheduled(expense)}
                      className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleActive(expense)}
                      className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 rounded"
                    >
                      {expense.active ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => handleDeleteScheduled(expense.id)}
                      className="px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Pending Confirmation Tab */}
      {activeTab === 'pending' && (
        <div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            These expenses require your confirmation before posting to the ledger
          </p>

          {pendingExpenses.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 dark:text-slate-400">No pending expenses</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                Expenses that require confirmation will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingExpenses.map(expense => (
                <div
                  key={expense.id}
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-amber-200 dark:border-amber-800"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-slate-900 dark:text-white">
                        {expense.description}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        {expense.property.name}
                        {expense.vendor && ` • ${expense.vendor.name}`}
                        {' • Due: '}{new Date(expense.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-lg font-semibold text-slate-900 dark:text-white">
                      ${Number(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <button
                      onClick={() => handleConfirmPending(expense.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                    >
                      Confirm & Post
                    </button>
                    <button
                      onClick={() => handleSkipPending(expense.id)}
                      className="px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 text-sm"
                    >
                      Skip This Month
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
