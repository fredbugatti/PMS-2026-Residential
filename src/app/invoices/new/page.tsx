'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Lease {
  id: string;
  companyName: string | null;
  tenantName: string;
  unitName: string;
  property: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  scheduledCharges: {
    id: string;
    description: string;
    amount: number;
    accountCode: string;
  }[];
}

interface LineItem {
  id: string;
  quantity: string;
  itemCode: string;
  description: string;
  priceEach: string;
  amount: string;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [leases, setLeases] = useState<Lease[]>([]);
  const [selectedLeaseId, setSelectedLeaseId] = useState('');
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [invoiceData, setInvoiceData] = useState({
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    terms: 'Due on receipt',
    poNumber: '',
    project: '',
    notes: ''
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      id: '1',
      quantity: '1',
      itemCode: 'RENT',
      description: '',
      priceEach: '',
      amount: ''
    }
  ]);

  useEffect(() => {
    fetchLeases();
  }, []);

  useEffect(() => {
    if (selectedLeaseId) {
      const lease = leases.find(l => l.id === selectedLeaseId);
      setSelectedLease(lease || null);

      // Auto-populate line items from scheduled charges
      if (lease && lease.scheduledCharges.length > 0) {
        const items = lease.scheduledCharges.map((charge, index) => ({
          id: (index + 1).toString(),
          quantity: '1',
          itemCode: charge.accountCode,
          description: charge.description,
          priceEach: charge.amount.toString(),
          amount: charge.amount.toString()
        }));
        setLineItems(items);
      }
    }
  }, [selectedLeaseId, leases]);

  const fetchLeases = async () => {
    try {
      const res = await fetch('/api/leases?status=ACTIVE');
      if (res.ok) {
        const data = await res.json();
        setLeases(data);
      }
    } catch (error) {
      console.error('Failed to fetch leases:', error);
    } finally {
      setLoading(false);
    }
  };

  const addLineItem = () => {
    const newId = (Math.max(...lineItems.map(item => parseInt(item.id))) + 1).toString();
    setLineItems([
      ...lineItems,
      {
        id: newId,
        quantity: '1',
        itemCode: '',
        description: '',
        priceEach: '',
        amount: ''
      }
    ]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string) => {
    setLineItems(lineItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };

        // Auto-calculate amount when quantity or priceEach changes
        if (field === 'quantity' || field === 'priceEach') {
          const qty = parseFloat(field === 'quantity' ? value : updated.quantity) || 0;
          const price = parseFloat(field === 'priceEach' ? value : updated.priceEach) || 0;
          updated.amount = (qty * price).toFixed(2);
        }

        return updated;
      }
      return item;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedLeaseId) {
      setError('Please select a tenant/company');
      return;
    }

    if (lineItems.length === 0 || !lineItems[0].description) {
      setError('Please add at least one line item');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: selectedLeaseId,
          invoiceDate: invoiceData.invoiceDate,
          dueDate: invoiceData.dueDate,
          terms: invoiceData.terms,
          poNumber: invoiceData.poNumber || null,
          project: invoiceData.project || null,
          notes: invoiceData.notes || null,
          lineItems: lineItems.map(item => ({
            quantity: parseFloat(item.quantity) || 1,
            itemCode: item.itemCode || null,
            description: item.description,
            priceEach: parseFloat(item.priceEach) || 0,
            amount: parseFloat(item.amount) || 0
          }))
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create invoice');
      }

      // Redirect to invoice detail
      router.push(`/invoices/${data.invoice.id}`);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (parseFloat(item.amount) || 0);
  }, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/invoices')}
              className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-900">Create New Invoice</h1>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Tenant Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Tenant/Company *
              </label>
              <select
                required
                value={selectedLeaseId}
                onChange={(e) => setSelectedLeaseId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select a tenant --</option>
                {leases.map((lease) => (
                  <option key={lease.id} value={lease.id}>
                    {lease.companyName || lease.tenantName} - {lease.property.name} ({lease.unitName})
                  </option>
                ))}
              </select>
              {selectedLease && (
                <div className="mt-2 text-sm text-gray-600">
                  <div>{selectedLease.property.address}</div>
                  <div>{selectedLease.property.city}, {selectedLease.property.state} {selectedLease.property.zipCode}</div>
                </div>
              )}
            </div>

            {/* Invoice Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Invoice Date *
                </label>
                <input
                  type="date"
                  required
                  value={invoiceData.invoiceDate}
                  onChange={(e) => setInvoiceData({ ...invoiceData, invoiceDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Due Date *
                </label>
                <input
                  type="date"
                  required
                  value={invoiceData.dueDate}
                  onChange={(e) => setInvoiceData({ ...invoiceData, dueDate: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Terms
                </label>
                <input
                  type="text"
                  value={invoiceData.terms}
                  onChange={(e) => setInvoiceData({ ...invoiceData, terms: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Due on receipt"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  P.O. Number
                </label>
                <input
                  type="text"
                  value={invoiceData.poNumber}
                  onChange={(e) => setInvoiceData({ ...invoiceData, poNumber: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project
                </label>
                <input
                  type="text"
                  value={invoiceData.project}
                  onChange={(e) => setInvoiceData({ ...invoiceData, project: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Line Items *
                </label>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  + Add Line
                </button>
              </div>

              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-medium text-gray-600">Line {index + 1}</span>
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLineItem(item.id)}
                          className="ml-auto text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-1">
                        <label className="block text-xs text-gray-600 mb-1">Qty</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs text-gray-600 mb-1">Item Code</label>
                        <input
                          type="text"
                          value={item.itemCode}
                          onChange={(e) => updateLineItem(item.id, 'itemCode', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                          placeholder="RENT"
                        />
                      </div>

                      <div className="col-span-5">
                        <label className="block text-xs text-gray-600 mb-1">Description *</label>
                        <textarea
                          required
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                          rows={2}
                          placeholder="Monthly rent for..."
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs text-gray-600 mb-1">Price Each</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.priceEach}
                          onChange={(e) => updateLineItem(item.id, 'priceEach', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 rounded text-sm"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs text-gray-600 mb-1">Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          value={item.amount}
                          onChange={(e) => updateLineItem(item.id, 'amount', e.target.value)}
                          className="w-full px-2 py-2 border border-gray-300 rounded text-sm font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex justify-end">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Subtotal</div>
                  <div className="text-2xl font-bold text-gray-900">
                    ${subtotal.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes / Terms
              </label>
              <textarea
                value={invoiceData.notes}
                onChange={(e) => setInvoiceData({ ...invoiceData, notes: e.target.value })}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Add any additional terms, disclaimers, or notes here..."
              />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => router.push('/invoices')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Creating...' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
