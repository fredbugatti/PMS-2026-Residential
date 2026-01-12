'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';

interface Bill {
  id: string;
  title: string;
  description: string;
  actualCost: number | null;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  dueDate: string | null;
  paymentStatus: 'UNPAID' | 'PAID' | 'PENDING';
  paymentMethod: string | null;
  checkNumber: string | null;
  paidDate: string | null;
  completedDate: string | null;
  vendor: {
    id: string;
    name: string;
    company: string | null;
    paymentTerms: string | null;
  } | null;
  property: {
    id: string;
    name: string;
  };
  unit: {
    id: string;
    unitNumber: string;
  };
}

interface Summary {
  totalUnpaid: number;
  totalOverdue: number;
  overdueCount: number;
  dueSoonCount: number;
  totalCount: number;
}

export default function BillsDuePage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'unpaid' | 'overdue' | 'all'>('unpaid');
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [showPayModal, setShowPayModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    paymentMethod: '',
    checkNumber: '',
    paidDate: new Date().toISOString().split('T')[0],
    notes: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bills-due?status=${filter}`);
      const data = await response.json();

      if (data.error) throw new Error(data.error);

      setBills(data.bills);
      setSummary(data.summary);
    } catch (error) {
      console.error('Failed to fetch bills:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [filter]);

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysOverdue = (dueDate: string | null) => {
    if (!dueDate) return null;
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const getDueDateStatus = (dueDate: string | null) => {
    const days = getDaysOverdue(dueDate);
    if (days === null) return { label: 'No due date', color: 'text-gray-500' };
    if (days > 0) return { label: `${days} days overdue`, color: 'text-red-600' };
    if (days === 0) return { label: 'Due today', color: 'text-orange-600' };
    if (days >= -7) return { label: `Due in ${Math.abs(days)} days`, color: 'text-yellow-600' };
    return { label: `Due in ${Math.abs(days)} days`, color: 'text-green-600' };
  };

  const handleMarkPaid = (bill: Bill) => {
    setSelectedBill(bill);
    setPaymentData({
      paymentMethod: '',
      checkNumber: '',
      paidDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setShowPayModal(true);
  };

  const handleSavePayment = async () => {
    if (!selectedBill) return;

    try {
      setSaving(true);
      const response = await fetch('/api/bills-due', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workOrderId: selectedBill.id,
          ...paymentData,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setShowPayModal(false);
      setSelectedBill(null);
      fetchBills();
    } catch (error) {
      console.error('Failed to save payment:', error);
      alert('Failed to save payment. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bills Due</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track and pay vendor invoices from work orders
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Unpaid</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {formatCurrency(summary.totalUnpaid)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{summary.totalCount} bills</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Overdue</div>
              <div className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(summary.totalOverdue)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{summary.overdueCount} bills</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Due This Week</div>
              <div className="text-2xl font-bold text-yellow-600 mt-1">
                {summary.dueSoonCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">bills</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="text-sm text-gray-600 dark:text-gray-400">Average Bill</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {summary.totalCount > 0
                  ? formatCurrency(summary.totalUnpaid / summary.totalCount)
                  : '$0'}
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'unpaid', label: 'Unpaid' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'all', label: 'All' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                filter === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
              {tab.id === 'overdue' && summary && summary.overdueCount > 0 && (
                <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                  {summary.overdueCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Bills List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading bills...</div>
          ) : bills.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-2">
                {filter === 'overdue' ? '🎉' : '📋'}
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {filter === 'overdue'
                  ? 'No overdue bills!'
                  : filter === 'unpaid'
                  ? 'No unpaid bills'
                  : 'No bills found'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Work Order
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Invoice #
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {bills.map((bill) => {
                    const dueDateStatus = getDueDateStatus(bill.dueDate);
                    return (
                      <tr key={bill.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {bill.title}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {bill.description}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {bill.vendor ? (
                            <div>
                              <div className="text-gray-900 dark:text-white">
                                {bill.vendor.name}
                              </div>
                              {bill.vendor.company && (
                                <div className="text-sm text-gray-500">
                                  {bill.vendor.company}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">No vendor</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900 dark:text-white">
                            {bill.property.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            Unit {bill.unit.unitNumber}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">
                          {bill.invoiceNumber || '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-gray-900 dark:text-white">
                            {formatDate(bill.dueDate)}
                          </div>
                          <div className={`text-sm ${dueDateStatus.color}`}>
                            {dueDateStatus.label}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="font-medium text-gray-900 dark:text-white">
                            {formatCurrency(bill.actualCost)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {bill.paymentStatus === 'PAID' ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              Paid
                            </span>
                          ) : (
                            <button
                              onClick={() => handleMarkPaid(bill)}
                              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPayModal && selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Record Payment
            </h3>

            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                <div className="text-sm text-gray-600 dark:text-gray-400">Work Order</div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {selectedBill.title}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                  {formatCurrency(selectedBill.actualCost)}
                </div>
                {selectedBill.vendor && (
                  <div className="text-sm text-gray-500 mt-1">
                    Vendor: {selectedBill.vendor.name}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentData.paymentMethod}
                  onChange={(e) => setPaymentData({ ...paymentData, paymentMethod: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select method...</option>
                  <option value="CHECK">Check</option>
                  <option value="ACH">ACH / Bank Transfer</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="ZELLE">Zelle</option>
                  <option value="VENMO">Venmo</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {paymentData.paymentMethod === 'CHECK' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Check Number
                  </label>
                  <input
                    type="text"
                    value={paymentData.checkNumber}
                    onChange={(e) => setPaymentData({ ...paymentData, checkNumber: e.target.value })}
                    placeholder="e.g., 1234"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentData.paidDate}
                  onChange={(e) => setPaymentData({ ...paymentData, paidDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  value={paymentData.notes}
                  onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                  rows={2}
                  placeholder="Any additional notes..."
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPayModal(false)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePayment}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Record Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
