'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface Lease {
  tenantName: string;
  tenantEmail: string | null;
  propertyName: string | null;
  unitName: string;
  startDate: string;
  endDate: string;
  securityDepositAmount: number | null;
}

interface Deduction {
  id: string;
  description: string;
  amount: number;
  category: string;
  photoUrls: string[];
  notes: string | null;
}

interface MoveOutInspection {
  id: string;
  leaseId: string;
  inspectionDate: string;
  inspectedBy: string;
  tenantPresent: boolean;
  overallCondition: string;
  notes: string | null;
  forwardingAddress: string | null;
  status: string;
  depositHeld: number;
  totalDeductions: number;
  amountToReturn: number;
  deductions: Deduction[];
  lease: Lease;
}

const DEDUCTION_CATEGORIES = [
  { value: 'CLEANING', label: 'Cleaning' },
  { value: 'REPAIR', label: 'Repair' },
  { value: 'REPLACEMENT', label: 'Replacement' },
  { value: 'UNPAID_RENT', label: 'Unpaid Rent' },
  { value: 'UNPAID_UTILITIES', label: 'Unpaid Utilities' },
  { value: 'OTHER', label: 'Other' }
];

const CONDITION_OPTIONS = [
  { value: 'EXCELLENT', label: 'Excellent', color: 'text-green-600' },
  { value: 'GOOD', label: 'Good', color: 'text-blue-600' },
  { value: 'FAIR', label: 'Fair', color: 'text-yellow-600' },
  { value: 'POOR', label: 'Poor', color: 'text-red-600' }
];

export default function MoveOutPage() {
  const params = useParams();
  const router = useRouter();
  const leaseId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [inspection, setInspection] = useState<MoveOutInspection | null>(null);
  const [step, setStep] = useState(1); // 1: Start, 2: Deductions, 3: Review, 4: Complete

  // Form state for starting inspection
  const [inspectionForm, setInspectionForm] = useState({
    inspectionDate: new Date().toISOString().split('T')[0],
    inspectedBy: '',
    tenantPresent: false,
    overallCondition: 'GOOD',
    notes: '',
    forwardingAddress: ''
  });

  // Form state for adding deduction
  const [deductionForm, setDeductionForm] = useState({
    description: '',
    amount: '',
    category: 'CLEANING',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInspection();
  }, [leaseId]);

  const fetchInspection = async () => {
    try {
      const res = await fetch(`/api/move-out/${leaseId}`);
      if (res.ok) {
        const data = await res.json();
        setInspection(data);
        // Set step based on status
        if (data.status === 'COMPLETED') {
          setStep(4);
        } else if (data.deductions?.length > 0) {
          setStep(3);
        } else {
          setStep(2);
        }
      } else if (res.status === 404) {
        // No inspection yet, fetch lease info
        const leaseRes = await fetch(`/api/leases/${leaseId}`);
        if (leaseRes.ok) {
          const leaseData = await leaseRes.json();
          setInspection({
            id: '',
            leaseId,
            inspectionDate: new Date().toISOString(),
            inspectedBy: '',
            tenantPresent: false,
            overallCondition: 'GOOD',
            notes: null,
            forwardingAddress: null,
            status: 'NOT_STARTED',
            depositHeld: leaseData.securityDepositAmount || 0,
            totalDeductions: 0,
            amountToReturn: leaseData.securityDepositAmount || 0,
            deductions: [],
            lease: {
              tenantName: leaseData.tenantName,
              tenantEmail: leaseData.tenantEmail,
              propertyName: leaseData.propertyName,
              unitName: leaseData.unitName,
              startDate: leaseData.startDate,
              endDate: leaseData.endDate,
              securityDepositAmount: leaseData.securityDepositAmount
            }
          } as MoveOutInspection);
          setStep(1);
        }
      }
    } catch (err) {
      console.error('Failed to fetch inspection:', err);
      setError('Failed to load move-out data');
    } finally {
      setLoading(false);
    }
  };

  const handleStartInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/move-out/${leaseId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inspectionForm)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start inspection');
      }

      await fetchInspection();
      setStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deductionForm.description || !deductionForm.amount) return;

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/move-out/${leaseId}/deductions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deductionForm)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add deduction');
      }

      await fetchInspection();
      setDeductionForm({
        description: '',
        amount: '',
        category: 'CLEANING',
        notes: ''
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDeduction = async (deductionId: string) => {
    if (!confirm('Are you sure you want to remove this deduction?')) return;

    try {
      const res = await fetch(`/api/move-out/${leaseId}/deductions?id=${deductionId}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete deduction');
      }

      await fetchInspection();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleComplete = async () => {
    if (!confirm('Are you sure you want to complete this move-out? This will post ledger entries and send the disposition letter to the tenant.')) {
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`/api/move-out/${leaseId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sendEmail: true })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to complete move-out');
      }

      await fetchInspection();
      setStep(4);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Failed to load move-out data</p>
          <Link href={`/leases/${leaseId}`} className="text-blue-600 hover:underline">
            Back to Lease
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href={`/leases/${leaseId}`}
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1 mb-2"
          >
            ← Back to Lease
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Move-Out & Deposit Return</h1>
          <p className="text-gray-600 mt-1">
            {inspection.lease.tenantName} • {inspection.lease.unitName}
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {[
              { num: 1, label: 'Start Inspection' },
              { num: 2, label: 'Add Deductions' },
              { num: 3, label: 'Review' },
              { num: 4, label: 'Complete' }
            ].map((s, i) => (
              <div key={s.num} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step >= s.num
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step > s.num ? '✓' : s.num}
                </div>
                <span className={`ml-2 text-sm ${step >= s.num ? 'text-gray-900' : 'text-gray-500'}`}>
                  {s.label}
                </span>
                {i < 3 && (
                  <div className={`w-12 sm:w-24 h-0.5 mx-2 sm:mx-4 ${
                    step > s.num ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Deposit Summary Card */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Security Deposit Summary</h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600">Deposit Held</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(inspection.depositHeld)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Deductions</p>
              <p className="text-2xl font-bold text-red-600">-{formatCurrency(inspection.totalDeductions)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{inspection.amountToReturn >= 0 ? 'To Return' : 'Tenant Owes'}</p>
              <p className={`text-2xl font-bold ${inspection.amountToReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(inspection.amountToReturn))}
              </p>
            </div>
          </div>
        </div>

        {/* Step 1: Start Inspection */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Start Move-Out Inspection</h2>
            <form onSubmit={handleStartInspection} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inspection Date
                  </label>
                  <input
                    type="date"
                    value={inspectionForm.inspectionDate}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, inspectionDate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Inspected By
                  </label>
                  <input
                    type="text"
                    value={inspectionForm.inspectedBy}
                    onChange={(e) => setInspectionForm({ ...inspectionForm, inspectedBy: e.target.value })}
                    placeholder="Your name"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overall Condition
                </label>
                <select
                  value={inspectionForm.overallCondition}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, overallCondition: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {CONDITION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="tenantPresent"
                  checked={inspectionForm.tenantPresent}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, tenantPresent: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <label htmlFor="tenantPresent" className="text-sm text-gray-700">
                  Tenant was present during inspection
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forwarding Address (for deposit return)
                </label>
                <textarea
                  value={inspectionForm.forwardingAddress}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, forwardingAddress: e.target.value })}
                  placeholder="Enter tenant's new address"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={inspectionForm.notes}
                  onChange={(e) => setInspectionForm({ ...inspectionForm, notes: e.target.value })}
                  placeholder="General notes about the inspection..."
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Starting...' : 'Start Inspection'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 2: Add Deductions */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Add Deductions</h2>
              <form onSubmit={handleAddDeduction} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={deductionForm.description}
                      onChange={(e) => setDeductionForm({ ...deductionForm, description: e.target.value })}
                      placeholder="e.g., Carpet cleaning, Wall repair"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={deductionForm.amount}
                      onChange={(e) => setDeductionForm({ ...deductionForm, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={deductionForm.category}
                      onChange={(e) => setDeductionForm({ ...deductionForm, category: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {DEDUCTION_CATEGORIES.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={deductionForm.notes}
                      onChange={(e) => setDeductionForm({ ...deductionForm, notes: e.target.value })}
                      placeholder="Additional details"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? 'Adding...' : 'Add Deduction'}
                  </button>
                </div>
              </form>
            </div>

            {/* Deductions List */}
            {inspection.deductions.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold mb-4">Current Deductions</h3>
                <div className="space-y-3">
                  {inspection.deductions.map((d) => (
                    <div key={d.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{d.description}</p>
                        <p className="text-sm text-gray-600">{d.category.replace('_', ' ')}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-red-600">-{formatCurrency(d.amount)}</span>
                        <button
                          onClick={() => handleDeleteDeduction(d.id)}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Continue to Review
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4">Review Deposit Disposition</h2>

              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium mb-2">Inspection Details</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-600">Date:</span> {new Date(inspection.inspectionDate).toLocaleDateString()}</div>
                    <div><span className="text-gray-600">Inspector:</span> {inspection.inspectedBy}</div>
                    <div><span className="text-gray-600">Condition:</span> {inspection.overallCondition}</div>
                    <div><span className="text-gray-600">Tenant Present:</span> {inspection.tenantPresent ? 'Yes' : 'No'}</div>
                  </div>
                </div>

                {inspection.deductions.length > 0 ? (
                  <div>
                    <h3 className="font-medium mb-2">Itemized Deductions</h3>
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left">Description</th>
                          <th className="px-4 py-2 text-left">Category</th>
                          <th className="px-4 py-2 text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspection.deductions.map((d) => (
                          <tr key={d.id} className="border-t">
                            <td className="px-4 py-2">{d.description}</td>
                            <td className="px-4 py-2">{d.category.replace('_', ' ')}</td>
                            <td className="px-4 py-2 text-right text-red-600">-{formatCurrency(d.amount)}</td>
                          </tr>
                        ))}
                        <tr className="border-t font-semibold">
                          <td colSpan={2} className="px-4 py-2">Total Deductions</td>
                          <td className="px-4 py-2 text-right text-red-600">-{formatCurrency(inspection.totalDeductions)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-600 italic">No deductions - full deposit will be returned.</p>
                )}

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600">Deposit Held</p>
                      <p className="font-semibold">{formatCurrency(inspection.depositHeld)}</p>
                    </div>
                    <div className="text-2xl">−</div>
                    <div>
                      <p className="text-sm text-gray-600">Total Deductions</p>
                      <p className="font-semibold text-red-600">{formatCurrency(inspection.totalDeductions)}</p>
                    </div>
                    <div className="text-2xl">=</div>
                    <div>
                      <p className="text-sm text-gray-600">{inspection.amountToReturn >= 0 ? 'Amount to Return' : 'Amount Owed'}</p>
                      <p className={`text-xl font-bold ${inspection.amountToReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(Math.abs(inspection.amountToReturn))}
                      </p>
                    </div>
                  </div>
                </div>

                {inspection.forwardingAddress && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-medium mb-1">Forwarding Address</h3>
                    <p className="text-sm text-gray-600">{inspection.forwardingAddress}</p>
                  </div>
                )}

                {inspection.lease.tenantEmail && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Disposition letter will be emailed to: {inspection.lease.tenantEmail}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Back to Deductions
              </button>
              <button
                onClick={handleComplete}
                disabled={submitting}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Complete & Send Disposition'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 4 && (
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Move-Out Complete</h2>
            <p className="text-gray-600 mb-6">
              The security deposit disposition has been processed and the lease has been marked as ended.
            </p>

            <div className="p-4 bg-gray-50 rounded-lg mb-6 inline-block">
              <p className="text-sm text-gray-600 mb-1">
                {inspection.amountToReturn >= 0 ? 'Amount Returned' : 'Amount Owed by Tenant'}
              </p>
              <p className={`text-3xl font-bold ${inspection.amountToReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(inspection.amountToReturn))}
              </p>
            </div>

            <div className="flex justify-center gap-4">
              <Link
                href={`/leases/${leaseId}`}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                View Lease
              </Link>
              <Link
                href="/leases"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Back to Leases
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
