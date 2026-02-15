'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface InvoiceLineItem {
  id: string;
  quantity: number;
  itemCode: string | null;
  description: string;
  priceEach: number;
  amount: number;
}

interface Payment {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  companyName: string;
  contactName: string | null;
  billToAddress: string | null;
  shipToAddress: string | null;
  poNumber: string | null;
  terms: string | null;
  project: string | null;
  subtotal: number;
  paymentsCredits: number;
  totalDue: number;
  status: string;
  notes: string | null;
  lease: {
    id: string;
    tenantName: string;
    property: {
      name: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  lineItems: InvoiceLineItem[];
  payments?: Payment[];
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMethod: 'CHECK',
    paymentDate: new Date().toISOString().split('T')[0],
    referenceNumber: '',
    notes: ''
  });
  const [submittingPayment, setSubmittingPayment] = useState(false);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice();
    }
  }, [invoiceId]);

  const fetchInvoice = async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (res.ok) {
        const data = await res.json();
        setInvoice(data);
      }
    } catch (error) {
      console.error('Failed to fetch invoice:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleMarkAsSent = async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'SENT' })
      });

      if (res.ok) {
        fetchInvoice();
      }
    } catch (error) {
      console.error('Failed to mark as sent:', error);
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' })
      });

      if (res.ok) {
        fetchInvoice();
      }
    } catch (error) {
      console.error('Failed to mark as paid:', error);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!invoice) return;

    setSubmittingPayment(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leaseId: invoice.lease.id,
          invoiceId: invoice.id,
          amount: parseFloat(paymentForm.amount),
          paymentMethod: paymentForm.paymentMethod,
          paymentDate: paymentForm.paymentDate,
          referenceNumber: paymentForm.referenceNumber || null,
          notes: paymentForm.notes || null,
          description: `Payment for Invoice #${invoice.invoiceNumber}`
        })
      });

      if (res.ok) {
        // Reset form and close modal
        setPaymentForm({
          amount: '',
          paymentMethod: 'CHECK',
          paymentDate: new Date().toISOString().split('T')[0],
          referenceNumber: '',
          notes: ''
        });
        setShowPaymentModal(false);

        // Refresh invoice data
        fetchInvoice();
      } else {
        const error = await res.json();
        alert(`Failed to record payment: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to record payment:', error);
      alert('Failed to record payment. Please try again.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  const openPaymentModal = () => {
    if (invoice) {
      setPaymentForm({
        ...paymentForm,
        amount: invoice.totalDue.toString()
      });
    }
    setShowPaymentModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading invoice...</div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Invoice not found</p>
          <button
            onClick={() => router.push('/invoices')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Back to Invoices
          </button>
        </div>
      </div>
    );
  }

  const property = invoice.lease.property;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Action Bar (hidden when printing) */}
      <div className="print:hidden bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/invoices')}
            className="text-gray-600 hover:text-gray-900 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Invoices
          </button>

          <div className="flex items-center gap-2">
            {invoice.status === 'DRAFT' && (
              <button
                onClick={handleMarkAsSent}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all hover:scale-105"
              >
                Mark as Sent
              </button>
            )}
            {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && invoice.totalDue > 0 && (
              <button
                onClick={openPaymentModal}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 font-medium transition-all hover:scale-105 shadow-lg flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Record Payment
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium flex items-center gap-2 transition-all hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Download PDF
            </button>
          </div>
        </div>
      </div>

      {/* Invoice (printable) */}
      <div className="max-w-5xl mx-auto p-8 print:p-0">
        <div className="bg-white shadow-lg print:shadow-none" style={{ minHeight: '11in' }}>
          <div className="p-12 print:p-16">
            {/* Header */}
            <div className="flex justify-between items-start mb-12">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 uppercase mb-2">
                  {property.name}
                </h1>
                <div className="text-gray-700 text-sm">
                  <div>{property.address}</div>
                  <div>{property.city}, {property.state} {property.zipCode}</div>
                </div>
              </div>

              <div className="text-right">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">Invoice</h2>
                <table className="border border-gray-900" style={{ marginLeft: 'auto' }}>
                  <tbody>
                    <tr>
                      <td className="border border-gray-900 px-4 py-2 text-sm font-semibold">Date</td>
                      <td className="border border-gray-900 px-4 py-2 text-sm font-semibold">Invoice #</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-900 px-4 py-2 text-sm">{formatDate(invoice.invoiceDate)}</td>
                      <td className="border border-gray-900 px-4 py-2 text-sm">{invoice.invoiceNumber}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bill To / Ship To */}
            <div className="grid grid-cols-2 gap-8 mb-8">
              <div className="border border-gray-900 p-4 min-h-[120px]">
                <div className="font-semibold text-sm mb-2">Bill To</div>
                <div className="text-sm">
                  <div className="font-semibold">{invoice.companyName}</div>
                  {invoice.billToAddress && (
                    <div className="whitespace-pre-line mt-1">{invoice.billToAddress}</div>
                  )}
                </div>
              </div>

              {invoice.shipToAddress && (
                <div className="border border-gray-900 p-4 min-h-[120px]">
                  <div className="font-semibold text-sm mb-2">Ship To</div>
                  <div className="text-sm whitespace-pre-line">{invoice.shipToAddress}</div>
                </div>
              )}
            </div>

            {/* Terms & Details */}
            <div className="mb-6">
              <table className="w-full border border-gray-900">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-900 px-4 py-2 text-xs font-semibold text-left">P.O. No.</th>
                    <th className="border border-gray-900 px-4 py-2 text-xs font-semibold text-left">Terms</th>
                    <th className="border border-gray-900 px-4 py-2 text-xs font-semibold text-left">Project</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-900 px-4 py-2 text-sm">{invoice.poNumber || ''}</td>
                    <td className="border border-gray-900 px-4 py-2 text-sm">{invoice.terms || 'Due on receipt'}</td>
                    <td className="border border-gray-900 px-4 py-2 text-sm">{invoice.project || ''}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Line Items */}
            <div className="mb-6">
              <table className="w-full border border-gray-900">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-900 px-3 py-2 text-xs font-semibold text-left w-16">Quantity</th>
                    <th className="border border-gray-900 px-3 py-2 text-xs font-semibold text-left">Description</th>
                    <th className="border border-gray-900 px-3 py-2 text-xs font-semibold text-right w-24">Rate</th>
                    <th className="border border-gray-900 px-3 py-2 text-xs font-semibold text-right w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((item, index) => (
                    <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                      <td className="border border-gray-900 px-3 py-2 text-sm text-center">
                        {Number(item.quantity) === 1 ? '' : item.quantity}
                      </td>
                      <td className="border border-gray-900 px-3 py-2 text-sm">
                        {item.itemCode && <div className="font-semibold">{item.itemCode}</div>}
                        <div className="whitespace-pre-line">{item.description}</div>
                      </td>
                      <td className="border border-gray-900 px-3 py-2 text-sm text-right">
                        {formatCurrency(Number(item.priceEach))}
                      </td>
                      <td className="border border-gray-900 px-3 py-2 text-sm text-right font-semibold">
                        {formatCurrency(Number(item.amount))}
                      </td>
                    </tr>
                  ))}

                  {/* Notes Row */}
                  {invoice.notes && (
                    <tr>
                      <td colSpan={4} className="border border-gray-900 px-3 py-4 text-xs">
                        <div className="whitespace-pre-line">{invoice.notes}</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-80">
                <table className="w-full border border-gray-900">
                  <tbody>
                    <tr>
                      <td className="border border-gray-900 px-4 py-3 text-right font-bold text-lg">Total</td>
                      <td className="border border-gray-900 px-4 py-3 text-right font-bold text-lg">
                        {formatCurrency(Number(invoice.subtotal))}
                      </td>
                    </tr>
                    {Number(invoice.paymentsCredits) > 0 && (
                      <>
                        <tr>
                          <td className="border border-gray-900 px-4 py-2 text-right text-sm">Payments/Credits</td>
                          <td className="border border-gray-900 px-4 py-2 text-right text-sm">
                            {formatCurrency(Number(invoice.paymentsCredits))}
                          </td>
                        </tr>
                        <tr>
                          <td className="border border-gray-900 px-4 py-3 text-right font-bold text-lg">Balance Due</td>
                          <td className="border border-gray-900 px-4 py-3 text-right font-bold text-lg">
                            {formatCurrency(Number(invoice.totalDue))}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Payment History (if any payments exist) */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="mt-6 print:hidden">
            <div className="bg-white shadow-lg rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Payment History
              </h3>
              <div className="space-y-3">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{formatCurrency(Number(payment.amount))}</div>
                        <div className="text-sm text-gray-600">
                          {formatDate(payment.paymentDate)} • {payment.paymentMethod}
                          {payment.referenceNumber && ` • ${payment.referenceNumber}`}
                        </div>
                        {payment.notes && (
                          <div className="text-xs text-gray-500 mt-1">{payment.notes}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-in">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Record Payment</h2>
                  <p className="text-green-100 text-sm mt-1">Invoice #{invoice.invoiceNumber}</p>
                </div>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <form onSubmit={handleRecordPayment} className="p-6 space-y-5">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200">
                <div className="text-sm text-gray-600 mb-1">Balance Due</div>
                <div className="text-3xl font-bold text-gray-900">{formatCurrency(invoice.totalDue)}</div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={invoice.totalDue}
                    required
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full pl-8 pr-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all text-lg font-semibold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Method *</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                >
                  <option value="CHECK">Check</option>
                  <option value="ACH">ACH Transfer</option>
                  <option value="CREDIT_CARD">Credit Card</option>
                  <option value="CASH">Cash</option>
                  <option value="ZELLE">Zelle</option>
                  <option value="VENMO">Venmo</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Payment Date *</label>
                <input
                  type="date"
                  required
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Reference Number
                  <span className="text-gray-400 font-normal ml-1">(Check #, Transaction ID, etc.)</span>
                </label>
                <input
                  type="text"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all resize-none"
                  rows={3}
                  placeholder="Optional notes about this payment"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayment || !paymentForm.amount}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:scale-105"
                >
                  {submittingPayment ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
