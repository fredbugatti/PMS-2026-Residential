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
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Mark as Sent
              </button>
            )}
            {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
              <button
                onClick={handleMarkAsPaid}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Mark as Paid
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium flex items-center gap-2"
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
      </div>
    </div>
  );
}
