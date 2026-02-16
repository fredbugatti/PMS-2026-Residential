'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/Toast';

type TabType = 'current' | 'history';

interface BankAccount {
  id: string;
  name: string;
  last4: string;
  accountCode: string;
}

interface ReconciliationLine {
  id: string;
  date: string;
  description: string;
  amount: string;
  status: 'MATCHED' | 'UNMATCHED' | 'EXCLUDED';
  matchedLedgerEntryId: string | null;
  matchedLedgerEntry?: {
    id: string;
    description: string;
    amount: string;
    debitCredit: 'DR' | 'CR';
  } | null;
}

interface Reconciliation {
  id: string;
  status: 'IN_PROGRESS' | 'FINALIZED';
  startDate: string;
  endDate: string;
  statementBalance: string;
  ledgerBalance: string | null;
  variance: string | null;
  finalizedAt: string | null;
  notes: string | null;
  lines: ReconciliationLine[];
  bankAccount: BankAccount;
}

interface LedgerEntry {
  id: string;
  entryDate: string;
  description: string;
  amount: string;
  debitCredit: 'DR' | 'CR';
  accountCode: string;
}

interface ReconciliationSummary {
  totalLines: number;
  autoMatched: number;
  unmatched: number;
  totalDeposits: number;
  totalWithdrawals: number;
}

interface ReconciliationListItem {
  id: string;
  status: 'IN_PROGRESS' | 'FINALIZED';
  startDate: string;
  endDate: string;
  statementBalance: string;
  ledgerBalance: string | null;
  variance: string | null;
  finalizedAt: string | null;
}

export default function ReconciliationPage() {
  const { showSuccess, showError } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('current');
  const [loading, setLoading] = useState(true);

  // Bank account state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string>('');

  // Setup form state
  const [setupName, setSetupName] = useState('');
  const [setupLast4, setSetupLast4] = useState('');
  const [setupAccountCode, setSetupAccountCode] = useState('1000');
  const [setupLoading, setSetupLoading] = useState(false);

  // Reconciliation list (for history)
  const [reconciliations, setReconciliations] = useState<ReconciliationListItem[]>([]);

  // Active reconciliation workspace
  const [activeRecon, setActiveRecon] = useState<Reconciliation | null>(null);
  const [unmatchedLedgerEntries, setUnmatchedLedgerEntries] = useState<LedgerEntry[]>([]);
  const [reconSummary, setReconSummary] = useState<ReconciliationSummary | null>(null);

  // Matching state
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);

  // New reconciliation modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [newStatementBalance, setNewStatementBalance] = useState('');
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newBankAccountId, setNewBankAccountId] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  // Finalize state
  const [finalizeLoading, setFinalizeLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Fetch bank accounts on mount
  useEffect(() => {
    fetchBankAccounts();
  }, []);

  // Fetch reconciliations when bank account changes or refreshKey changes
  useEffect(() => {
    if (selectedBankAccountId) {
      fetchReconciliations();
    }
  }, [selectedBankAccountId, refreshKey]);

  // When reconciliations change, check for IN_PROGRESS and load it
  useEffect(() => {
    const inProgress = reconciliations.find(r => r.status === 'IN_PROGRESS');
    if (inProgress) {
      fetchReconciliationDetail(inProgress.id);
    } else {
      setActiveRecon(null);
      setUnmatchedLedgerEntries([]);
      setReconSummary(null);
    }
  }, [reconciliations]);

  const fetchBankAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reconciliation/bank-accounts');
      if (res.ok) {
        const data = await res.json();
        setBankAccounts(data);
        if (data.length > 0) {
          setSelectedBankAccountId(data[0].id);
          setNewBankAccountId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch bank accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReconciliations = async () => {
    try {
      const res = await fetch(`/api/reconciliation?bankAccountId=${selectedBankAccountId}`);
      if (res.ok) {
        const data = await res.json();
        setReconciliations(data);
      }
    } catch (error) {
      console.error('Failed to fetch reconciliations:', error);
    }
  };

  const fetchReconciliationDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/reconciliation/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveRecon(data.reconciliation);
        setUnmatchedLedgerEntries(data.unmatchedLedgerEntries || []);
        setReconSummary(data.summary || null);
      }
    } catch (error) {
      console.error('Failed to fetch reconciliation detail:', error);
    }
  };

  const handleSetupBank = async () => {
    if (!setupName.trim() || !setupLast4.trim()) {
      showError('Please fill in all fields');
      return;
    }
    setSetupLoading(true);
    try {
      const res = await fetch('/api/reconciliation/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: setupName.trim(),
          last4: setupLast4.trim(),
          accountCode: setupAccountCode.trim()
        })
      });
      if (res.ok) {
        showSuccess('Bank account created');
        setSetupName('');
        setSetupLast4('');
        setSetupAccountCode('1000');
        await fetchBankAccounts();
      } else {
        const err = await res.json();
        showError(err.error || 'Failed to create bank account');
      }
    } catch (error) {
      console.error('Failed to create bank account:', error);
      showError('Failed to create bank account');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleUploadStatement = async () => {
    if (!newFile || !newStartDate || !newEndDate || !newStatementBalance) {
      showError('Please fill in all fields and select a CSV file');
      return;
    }
    setUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', newFile);
      formData.append('bankAccountId', newBankAccountId || selectedBankAccountId);
      formData.append('startDate', newStartDate);
      formData.append('endDate', newEndDate);
      formData.append('statementBalance', newStatementBalance);

      const res = await fetch('/api/reconciliation', {
        method: 'POST',
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        showSuccess(`Statement uploaded: ${data.summary?.autoMatched || 0} lines auto-matched`);
        setShowNewModal(false);
        setNewFile(null);
        setNewStartDate('');
        setNewEndDate('');
        setNewStatementBalance('');
        setActiveTab('current');
        setRefreshKey(k => k + 1);
      } else {
        const err = await res.json();
        showError(err.error || 'Failed to upload statement');
      }
    } catch (error) {
      console.error('Failed to upload statement:', error);
      showError('Failed to upload statement');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleMatch = async (lineId: string, ledgerEntryId: string) => {
    if (!activeRecon) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reconciliation/${activeRecon.id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId, ledgerEntryId, action: 'match' })
      });
      if (res.ok) {
        showSuccess('Line matched');
        setActiveLineId(null);
        setRefreshKey(k => k + 1);
        await fetchReconciliationDetail(activeRecon.id);
      } else {
        const err = await res.json();
        showError(err.error || 'Failed to match');
      }
    } catch (error) {
      console.error('Failed to match:', error);
      showError('Failed to match');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnmatch = async (lineId: string) => {
    if (!activeRecon) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reconciliation/${activeRecon.id}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId, action: 'unmatch' })
      });
      if (res.ok) {
        showSuccess('Line unmatched');
        setRefreshKey(k => k + 1);
        await fetchReconciliationDetail(activeRecon.id);
      } else {
        const err = await res.json();
        showError(err.error || 'Failed to unmatch');
      }
    } catch (error) {
      console.error('Failed to unmatch:', error);
      showError('Failed to unmatch');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExclude = async (lineId: string, action: 'exclude' | 'include') => {
    if (!activeRecon) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/reconciliation/${activeRecon.id}/exclude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lineId, action })
      });
      if (res.ok) {
        showSuccess(action === 'exclude' ? 'Line excluded' : 'Line included');
        setRefreshKey(k => k + 1);
        await fetchReconciliationDetail(activeRecon.id);
      } else {
        const err = await res.json();
        showError(err.error || `Failed to ${action}`);
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      showError(`Failed to ${action}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleFinalize = async () => {
    if (!activeRecon) return;
    setFinalizeLoading(true);
    try {
      const res = await fetch(`/api/reconciliation/${activeRecon.id}/finalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        showSuccess('Reconciliation finalized');
        setActiveRecon(null);
        setActiveTab('history');
        setRefreshKey(k => k + 1);
      } else {
        const err = await res.json();
        showError(err.error || 'Failed to finalize');
      }
    } catch (error) {
      console.error('Failed to finalize:', error);
      showError('Failed to finalize');
    } finally {
      setFinalizeLoading(false);
    }
  };

  // Computed values for workspace
  const matchedLines = activeRecon?.lines.filter(l => l.status === 'MATCHED') || [];
  const unmatchedLines = activeRecon?.lines.filter(l => l.status === 'UNMATCHED') || [];
  const excludedLines = activeRecon?.lines.filter(l => l.status === 'EXCLUDED') || [];
  const totalLines = activeRecon?.lines.length || 0;
  const allResolved = unmatchedLines.length === 0 && totalLines > 0;

  const activeLine = activeLineId
    ? activeRecon?.lines.find(l => l.id === activeLineId) || null
    : null;

  // Convert ledger entry amount to signed bank-convention value
  const ledgerEntrySignedAmount = (entry: LedgerEntry): number => {
    const amt = parseFloat(entry.amount);
    // Account 1000 has DR normal balance: DR = positive (deposit), CR = negative (withdrawal)
    return entry.debitCredit === 'DR' ? amt : -amt;
  };

  // History items (finalized only)
  const historyItems = reconciliations.filter(r => r.status === 'FINALIZED');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-600">Loading...</div>
      </div>
    );
  }

  // State 1: No bank account exists
  if (bankAccounts.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
            <div className="flex items-center gap-3">
              <Link href="/accounting" className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Bank Reconciliation</h1>
                <p className="text-sm text-slate-600 mt-1">Match bank statements to ledger entries</p>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Set Up Bank Account</h2>
              <p className="text-sm text-slate-600 mb-6">Add your bank account to start reconciling statements.</p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={setupName}
                    onChange={(e) => setSetupName(e.target.value)}
                    placeholder="e.g. Chase Business Checking"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Last 4 Digits</label>
                  <input
                    type="text"
                    value={setupLast4}
                    onChange={(e) => setSetupLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="4521"
                    maxLength={4}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GL Account Code</label>
                  <input
                    type="text"
                    value={setupAccountCode}
                    onChange={(e) => setSetupAccountCode(e.target.value)}
                    placeholder="1000"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleSetupBank}
                  disabled={setupLoading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {setupLoading ? 'Setting Up...' : 'Set Up Bank Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentBankAccount = bankAccounts.find(b => b.id === selectedBankAccountId) || bankAccounts[0];

  // State 2 & 3: Bank account exists
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/accounting" className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Bank Reconciliation</h1>
                <p className="text-sm text-slate-600 mt-1">Match bank statements to ledger entries</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-flex items-center px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-sm font-medium">
                {currentBankAccount.name} ...{currentBankAccount.last4}
              </span>
              <button
                onClick={() => {
                  setNewBankAccountId(selectedBankAccountId);
                  setShowNewModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                New Reconciliation
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('current')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'current'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Current
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              History
            </button>
          </div>
        </div>

        {/* Current Tab */}
        {activeTab === 'current' && (
          <div className="space-y-6">
            {!activeRecon ? (
              /* No active reconciliation */
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                <div className="text-slate-400 mb-3">
                  <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-slate-600 font-medium">No active reconciliation</p>
                <p className="text-sm text-slate-500 mt-1">Upload a bank statement to get started.</p>
                <button
                  onClick={() => {
                    setNewBankAccountId(selectedBankAccountId);
                    setShowNewModal(true);
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                >
                  New Reconciliation
                </button>
              </div>
            ) : (
              /* Reconciliation Workspace (State 3) */
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-600">Statement Balance</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {formatCurrency(parseFloat(activeRecon.statementBalance))}
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-600">Ledger Balance</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">
                      {activeRecon.ledgerBalance
                        ? formatCurrency(parseFloat(activeRecon.ledgerBalance))
                        : formatCurrency(
                            matchedLines.reduce((sum, l) => sum + parseFloat(l.amount), 0)
                          )
                      }
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-600">Matched</p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {matchedLines.length} <span className="text-base font-normal text-slate-500">of {totalLines}</span>
                    </p>
                  </div>
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200">
                    <p className="text-sm text-slate-600">Unmatched</p>
                    <p className={`text-2xl font-bold mt-1 ${unmatchedLines.length > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {unmatchedLines.length}
                    </p>
                  </div>
                </div>

                {/* Period info */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-3 flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  <span>
                    Period: {new Date(activeRecon.startDate).toLocaleDateString()} - {new Date(activeRecon.endDate).toLocaleDateString()}
                  </span>
                  <span className="sm:inline hidden text-slate-300">|</span>
                  <span className="inline-flex sm:hidden w-full" />
                  <span>{currentBankAccount.name} ...{currentBankAccount.last4}</span>
                </div>

                {/* Matching Interface */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: Bank Statement Lines */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Bank Statement</h3>
                    </div>
                    <div className="divide-y divide-slate-200 max-h-[600px] overflow-y-auto">
                      {activeRecon.lines.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">No statement lines</div>
                      ) : (
                        activeRecon.lines.map(line => {
                          const amount = parseFloat(line.amount);
                          const isActive = activeLineId === line.id;
                          return (
                            <div
                              key={line.id}
                              className={`px-5 py-3 ${isActive ? 'bg-blue-50 ring-2 ring-inset ring-blue-300' : 'hover:bg-slate-50'}`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-slate-500">
                                      {new Date(line.date).toLocaleDateString()}
                                    </span>
                                    {line.status === 'MATCHED' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                        Matched
                                      </span>
                                    )}
                                    {line.status === 'UNMATCHED' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                                        Unmatched
                                      </span>
                                    )}
                                    {line.status === 'EXCLUDED' && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                        Excluded
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-slate-900 truncate">{line.description}</p>
                                  {line.status === 'MATCHED' && line.matchedLedgerEntry && (
                                    <p className="text-xs text-green-600 mt-1 truncate">
                                      Matched: {line.matchedLedgerEntry.description}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className={`text-sm font-semibold ${amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(amount)}
                                  </p>
                                </div>
                              </div>
                              {/* Action buttons */}
                              <div className="flex items-center gap-2 mt-2">
                                {line.status === 'UNMATCHED' && (
                                  <>
                                    <button
                                      onClick={() => setActiveLineId(isActive ? null : line.id)}
                                      disabled={actionLoading}
                                      className={`px-3 py-1 text-xs font-medium rounded-md disabled:opacity-50 ${
                                        isActive
                                          ? 'bg-blue-600 text-white'
                                          : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                      }`}
                                    >
                                      {isActive ? 'Cancel' : 'Match'}
                                    </button>
                                    <button
                                      onClick={() => handleExclude(line.id, 'exclude')}
                                      disabled={actionLoading}
                                      className="px-3 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                                    >
                                      Exclude
                                    </button>
                                  </>
                                )}
                                {line.status === 'MATCHED' && (
                                  <button
                                    onClick={() => handleUnmatch(line.id)}
                                    disabled={actionLoading}
                                    className="px-3 py-1 text-xs font-medium rounded-md bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                                  >
                                    Unmatch
                                  </button>
                                )}
                                {line.status === 'EXCLUDED' && (
                                  <button
                                    onClick={() => handleExclude(line.id, 'include')}
                                    disabled={actionLoading}
                                    className="px-3 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                                  >
                                    Include
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Right: Unmatched Ledger Entries */}
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">
                        Unmatched Ledger Entries
                        {activeLineId && (
                          <span className="ml-2 text-blue-600 normal-case font-normal">
                            - Select an entry to match
                          </span>
                        )}
                      </h3>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto">
                      {unmatchedLedgerEntries.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-sm">No unmatched ledger entries</div>
                      ) : (
                        <table className="w-full">
                          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Amount</th>
                              <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Type</th>
                              {activeLineId && (
                                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Action</th>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {unmatchedLedgerEntries.map(entry => {
                              const signedAmt = ledgerEntrySignedAmount(entry);
                              const activeAmt = activeLine ? parseFloat(activeLine.amount) : null;
                              const isAmountMatch = activeAmt !== null && Math.abs(signedAmt - activeAmt) < 0.01;
                              return (
                                <tr
                                  key={entry.id}
                                  className={`${
                                    activeLineId
                                      ? isAmountMatch
                                        ? 'bg-green-50'
                                        : 'hover:bg-slate-50'
                                      : 'hover:bg-slate-50'
                                  }`}
                                >
                                  <td className="px-4 py-3 text-sm text-slate-900">
                                    {new Date(entry.entryDate).toLocaleDateString()}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-slate-900 max-w-[200px] truncate">
                                    {entry.description}
                                  </td>
                                  <td className={`px-4 py-3 text-sm text-right font-medium ${
                                    signedAmt >= 0 ? 'text-green-600' : 'text-red-600'
                                  }`}>
                                    {formatCurrency(signedAmt)}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                      entry.debitCredit === 'DR'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-purple-100 text-purple-700'
                                    }`}>
                                      {entry.debitCredit}
                                    </span>
                                  </td>
                                  {activeLineId && (
                                    <td className="px-4 py-3 text-center">
                                      <button
                                        onClick={() => handleMatch(activeLineId, entry.id)}
                                        disabled={actionLoading}
                                        className={`px-3 py-1 text-xs font-medium rounded-md disabled:opacity-50 ${
                                          isAmountMatch
                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                                        }`}
                                      >
                                        Match
                                      </button>
                                    </td>
                                  )}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Action Bar */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-4 flex items-center justify-between">
                  <div>
                    {!allResolved && (
                      <p className="text-sm text-amber-600">
                        {unmatchedLines.length} unmatched line{unmatchedLines.length !== 1 ? 's' : ''} remaining.
                        All lines must be matched or excluded to finalize.
                      </p>
                    )}
                    {allResolved && (
                      <p className="text-sm text-green-600 font-medium">
                        All lines resolved. Ready to finalize.
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleFinalize}
                    disabled={!allResolved || finalizeLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {finalizeLoading ? 'Finalizing...' : 'Finalize'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {historyItems.length === 0 ? (
                <div className="text-center py-12 text-slate-500">No finalized reconciliations yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Period</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase hidden sm:table-cell">Statement Balance</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase hidden sm:table-cell">Ledger Balance</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Variance</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase hidden sm:table-cell">Finalized</th>
                        <th className="px-6 py-3 text-center text-xs font-semibold text-slate-600 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {historyItems.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm text-slate-900">
                            {new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-slate-900 hidden sm:table-cell">
                            {formatCurrency(parseFloat(item.statementBalance))}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-slate-900 hidden sm:table-cell">
                            {item.ledgerBalance ? formatCurrency(parseFloat(item.ledgerBalance)) : '-'}
                          </td>
                          <td className="px-6 py-4 text-sm text-right">
                            <span className={`font-medium ${
                              item.variance && parseFloat(item.variance) !== 0 ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {item.variance ? formatCurrency(parseFloat(item.variance)) : '$0.00'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 hidden sm:table-cell">
                            {item.finalizedAt ? new Date(item.finalizedAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              Finalized
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Reconciliation Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">New Reconciliation</h2>
                <button
                  onClick={() => setShowNewModal(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              {bankAccounts.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bank Account</label>
                  <select
                    value={newBankAccountId}
                    onChange={(e) => setNewBankAccountId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {bankAccounts.map(ba => (
                      <option key={ba.id} value={ba.id}>
                        {ba.name} ...{ba.last4}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Statement Start Date</label>
                <input
                  type="date"
                  value={newStartDate}
                  onChange={(e) => setNewStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Statement End Date</label>
                <input
                  type="date"
                  value={newEndDate}
                  onChange={(e) => setNewEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Statement Ending Balance</label>
                <input
                  type="number"
                  step="0.01"
                  value={newStatementBalance}
                  onChange={(e) => setNewStatementBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Upload CSV</label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadStatement}
                  disabled={uploadLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
                >
                  {uploadLoading ? 'Uploading...' : 'Upload & Match'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
