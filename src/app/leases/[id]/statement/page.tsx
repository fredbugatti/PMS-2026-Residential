'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useToast } from '@/components/Toast';

interface LedgerEntry {
  id: string;
  entryDate: string;
  accountCode: string;
  amount: number;
  debitCredit: 'DR' | 'CR';
  description: string;
  status: string;
}

interface StatementData {
  lease: {
    id: string;
    tenantName: string;
    tenantEmail: string | null;
    tenantPhone: string | null;
    unitName: string;
    propertyName: string | null;
    startDate: string;
    endDate: string;
    status: string;
  };
  property: {
    address: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  } | null;
  entries: LedgerEntry[];
  balance: number;
  totalCharges: number;
  totalPayments: number;
}

export default function StatementPage() {
  const params = useParams();
  const leaseId = params.id as string;
  const { showInfo, showError: showErrorToast } = useToast();
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatementData();
  }, [leaseId]);

  const fetchStatementData = async () => {
    try {
      const res = await fetch(`/api/leases/${leaseId}/statement`);
      if (!res.ok) throw new Error('Failed to load statement');
      const statementData = await res.json();
      setData(statementData);
    } catch (err: any) {
      setError(err.message);
      showErrorToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    // Trigger print dialog - user can select "Save as PDF"
    window.print();
    showInfo('Statement downloaded');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading statement...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error || 'Failed to load statement'}</p>
      </div>
    );
  }

  const statementDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Filter to AR entries only (charges and payments)
  const arEntries = data.entries
    .filter(e => e.accountCode === '1200' && e.status === 'POSTED')
    .sort((a, b) => new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime());

  // Calculate running balance
  let runningBalance = 0;
  const entriesWithBalance = arEntries.map(entry => {
    const amount = Number(entry.amount);
    if (entry.debitCredit === 'DR') {
      runningBalance += amount;
    } else {
      runningBalance -= amount;
    }
    return { ...entry, runningBalance };
  });

  return (
    <>
      {/* Print/Download Controls - Hidden when printing */}
      <div className="print:hidden bg-slate-100 border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4">
            <a
              href={`/leases/${leaseId}`}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              &larr; Back
            </a>
            <span className="text-slate-400 hidden sm:inline">|</span>
            <span className="text-sm text-slate-600 hidden sm:inline">Tenant Statement</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleDownloadPDF}
              className="px-3 sm:px-4 py-2.5 sm:py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium min-h-[44px] sm:min-h-0"
            >
              Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="px-3 sm:px-4 py-2.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium min-h-[44px] sm:min-h-0"
            >
              Print
            </button>
          </div>
        </div>
      </div>

      {/* Statement Content */}
      <div className="bg-white min-h-screen">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 print:px-0 print:py-0">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 print:mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 print:text-xl">TENANT STATEMENT</h1>
              <p className="text-slate-600 mt-1">Statement Date: {statementDate}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-slate-900">{data.lease.unitName}</p>
              {data.property && (
                <div className="text-sm text-slate-600 mt-1">
                  {data.property.address && <p>{data.property.address}</p>}
                  {(data.property.city || data.property.state || data.property.zipCode) && (
                    <p>
                      {[data.property.city, data.property.state, data.property.zipCode]
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tenant Info */}
          <div className="bg-slate-50 rounded-lg p-4 mb-6 print:bg-slate-100 print:mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tenant</p>
                <p className="font-semibold text-slate-900">{data.lease.tenantName}</p>
                {data.lease.tenantEmail && (
                  <p className="text-sm text-slate-600">{data.lease.tenantEmail}</p>
                )}
                {data.lease.tenantPhone && (
                  <p className="text-sm text-slate-600">{data.lease.tenantPhone}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Lease Period</p>
                <p className="text-sm text-slate-900">
                  {formatDate(data.lease.startDate)} - {formatDate(data.lease.endDate)}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Status: <span className="font-medium">{data.lease.status}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Balance Summary */}
          <div className="flex justify-between items-center bg-slate-900 text-white rounded-lg p-4 mb-6 print:mb-4">
            <div>
              <p className="text-sm text-slate-300">Balance Due</p>
              <p className="text-3xl font-bold print:text-2xl">
                {data.balance > 0 ? formatCurrency(data.balance) : '$0.00'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm">
                <span className="text-slate-300">Total Charges:</span>
                <span className="ml-2 font-semibold">{formatCurrency(data.totalCharges)}</span>
              </div>
              <div className="text-sm mt-1">
                <span className="text-slate-300">Total Payments:</span>
                <span className="ml-2 font-semibold text-green-400">{formatCurrency(data.totalPayments)}</span>
              </div>
            </div>
          </div>

          {data.balance < 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6 print:mb-4">
              <p className="text-green-800 text-sm">
                <span className="font-semibold">Credit on Account:</span> {formatCurrency(Math.abs(data.balance))}
              </p>
            </div>
          )}

          {/* Transaction History */}
          <div className="mb-6 print:mb-4">
            <h2 className="text-lg font-semibold text-slate-900 mb-3 print:text-base">Transaction History</h2>
            <div className="border border-slate-200 rounded-lg overflow-hidden print:border-slate-300">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 print:bg-slate-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Charges</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Payments</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {entriesWithBalance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    entriesWithBalance.map((entry) => (
                      <tr key={entry.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                        <td className="px-4 py-3 text-slate-900">{formatDate(entry.entryDate)}</td>
                        <td className="px-4 py-3 text-slate-900">{entry.description}</td>
                        <td className="px-4 py-3 text-right text-slate-900">
                          {entry.debitCredit === 'DR' ? formatCurrency(Number(entry.amount)) : '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600">
                          {entry.debitCredit === 'CR' ? formatCurrency(Number(entry.amount)) : '-'}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${
                          entry.runningBalance > 0 ? 'text-red-600' :
                          entry.runningBalance < 0 ? 'text-green-600' : 'text-slate-900'
                        }`}>
                          {formatCurrency(entry.runningBalance)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot className="bg-slate-50 print:bg-slate-100">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 font-semibold text-slate-900">Current Balance</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatCurrency(data.totalCharges)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCurrency(data.totalPayments)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${
                      data.balance > 0 ? 'text-red-600' :
                      data.balance < 0 ? 'text-green-600' : 'text-slate-900'
                    }`}>
                      {formatCurrency(data.balance)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-4 text-center text-xs text-slate-500 print:pt-2">
            <p>This statement reflects all charges and payments as of {statementDate}.</p>
            <p className="mt-1">Please contact us if you have any questions about this statement.</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 0.5in;
            size: letter;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  );
}
